const net = require('net');
const fs = require('fs');
const os = require('os');
const path = require('path');

/** Bundle id of the Mac App Store build; its app group container is `<team id>.<bundle id>`. */
const MAS_BUNDLE_ID = 'com.talkyon.scribis';

/** Default shared HTTP port of the app; the real one is shown in Settings -> MCP Protocol. */
const DEFAULT_HTTP_PORT = 8890;

function isValidPort(port) {
  return Number.isInteger(port) && port >= 1 && port <= 65535;
}

/**
 * Explains the localhost HTTP transport. With the port the running app published in
 * discovery.json, the commands are ready to copy; otherwise it points to Settings.
 */
function buildHttpModeHint(httpPort) {
  if (isValidPort(httpPort)) {
    return (
      'If the stdio socket is unavailable (for example in the Mac App Store build), use the ' +
      `localhost HTTP transport instead: \`scribis <command> --mcp\` (Scribis is listening on port ${httpPort}), ` +
      `or configure your MCP host with the URL http://127.0.0.1:${httpPort}/mcp.`
    );
  }
  return (
    'If the stdio socket is unavailable (for example in the Mac App Store build), use the ' +
    'localhost HTTP transport instead: `SCRIBIS_MCP_PORT=<port> scribis <command> --mcp`, or ' +
    'configure your MCP host with the URL http://127.0.0.1:<port>/mcp, where <port> is the port ' +
    `shown in Scribis Settings -> MCP Protocol (default ${DEFAULT_HTTP_PORT}).`
  );
}

const HTTP_MODE_HINT = buildHttpModeHint();

/**
 * discovery.json files of Mac App Store builds: the sandboxed app writes into its app group
 * container under ~/Library/Group Containers. The container is named `<team id>.<bundle id>`;
 * the team id is not hard-coded here, so every container ending in the Scribis bundle id is a
 * candidate (sorted for a stable order). Listing that directory does not read other apps' data.
 */
function getAppGroupDiscoveryCandidates(homeDir, p, listDirectory) {
  const groupContainers = p.join(homeDir, 'Library', 'Group Containers');
  let names;
  try {
    names = listDirectory(groupContainers);
  } catch {
    return [];
  }
  return names
    .filter((name) => name.endsWith(`.${MAS_BUNDLE_ID}`))
    .sort()
    .map((name) => p.join(groupContainers, name, '_mcp', 'discovery.json'));
}

/**
 * Lists the discovery.json files to check, in order. SCRIBIS_DISCOVERY_PATH and
 * SCRIBIS_USER_DATA_PATH each select a single file. On macOS the default list covers the
 * direct-download build (Application Support), the Mac App Store build (app group container,
 * written by the sandboxed app) and the MAS per-app container.
 */
function getDiscoveryCandidates(options = {}) {
  const env = options.env || process.env;
  const platform = options.platform || os.platform();
  const homeDir = options.homeDir || os.homedir();
  const listDirectory = options.listDirectory || ((directory) => fs.readdirSync(directory));
  // Build paths for the target platform even when running elsewhere (tests).
  const p = platform === 'win32' ? path.win32 : path.posix;

  if (env.SCRIBIS_DISCOVERY_PATH) return [env.SCRIBIS_DISCOVERY_PATH];
  if (env.SCRIBIS_USER_DATA_PATH) {
    return [p.join(env.SCRIBIS_USER_DATA_PATH, '_mcp', 'discovery.json')];
  }

  if (platform === 'darwin') {
    return [
      p.join(homeDir, 'Library', 'Application Support', 'scribis', '_mcp', 'discovery.json'),
      ...getAppGroupDiscoveryCandidates(homeDir, p, listDirectory),
      p.join(
        homeDir,
        'Library',
        'Containers',
        MAS_BUNDLE_ID,
        'Data',
        'Library',
        'Application Support',
        'scribis',
        '_mcp',
        'discovery.json'
      )
    ];
  }
  if (platform === 'win32') {
    return [p.join(env.APPDATA || homeDir, 'scribis', '_mcp', 'discovery.json')];
  }
  return [p.join(homeDir, '.config', 'scribis', '_mcp', 'discovery.json')];
}

/**
 * Returns true when a process with this pid exists. Signal 0 performs only the existence and
 * permission check; EPERM means the process exists but belongs to another user.
 */
function isPidAlive(pid, kill = process.kill.bind(process)) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    kill(pid, 0);
    return true;
  } catch (err) {
    return Boolean(err && err.code === 'EPERM');
  }
}

/**
 * Reads discovery.json and classifies it:
 * - missing: no file (app not running or MCP disabled)
 * - invalid: unreadable JSON or no socketPath
 * - stale:   the recorded pid is no longer running
 * - unavailable: the app is running but its stdio socket could not listen (socketError)
 * - ok:      the recorded process is alive (the socket may still need probing)
 */
function inspectDiscovery(discoveryPath, deps = {}) {
  const readFile = deps.readFile || ((p) => fs.readFileSync(p, 'utf8'));
  const pidAlive = deps.isPidAlive || isPidAlive;

  let raw;
  try {
    raw = readFile(discoveryPath);
  } catch (err) {
    if (err && err.code === 'ENOENT') return { state: 'missing', discoveryPath };
    return { state: 'invalid', discoveryPath, error: err.message };
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch (err) {
    return { state: 'invalid', discoveryPath, error: `Invalid JSON: ${err.message}` };
  }
  if (!data || typeof data.socketPath !== 'string' || !data.socketPath) {
    return { state: 'invalid', discoveryPath, error: 'Missing socketPath' };
  }

  const pid = Number.isInteger(data.pid) && data.pid > 0 ? data.pid : undefined;
  // The localhost HTTP port the app published (absent while the HTTP server is off).
  const httpPort = isValidPort(data.httpPort) ? data.httpPort : undefined;
  // Files without a pid cannot be verified here; callers fall back to probing the socket.
  if (pid !== undefined && !pidAlive(pid)) {
    return { state: 'stale', discoveryPath, socketPath: data.socketPath, pid };
  }
  if (typeof data.socketError === 'string' && data.socketError) {
    return {
      state: 'unavailable',
      discoveryPath,
      socketPath: data.socketPath,
      pid,
      ...(httpPort ? { httpPort } : {}),
      socketError: data.socketError
    };
  }
  return {
    state: 'ok',
    discoveryPath,
    socketPath: data.socketPath,
    pid,
    ...(httpPort ? { httpPort } : {})
  };
}

/**
 * Inspects each candidate and returns the first live one. Otherwise reports the most useful
 * problem: a running app without a socket, then a stale or invalid file, then a missing result
 * that lists every path checked.
 */
function findDiscovery(candidates, deps = {}) {
  // Stop at the first live file: on recent macOS, reading another app's container can prompt.
  const results = [];
  for (const candidate of candidates) {
    const info = inspectDiscovery(candidate, deps);
    if (info.state === 'ok') return info;
    results.push(info);
  }
  const problem =
    results.find((info) => info.state === 'unavailable') ||
    results.find((info) => info.state === 'stale') ||
    results.find((info) => info.state === 'invalid');
  if (problem) return problem;
  return { state: 'missing', discoveryPath: candidates[0], checkedPaths: candidates };
}

/**
 * The HTTP port published by a running app: the first live discovery.json (`ok`, or
 * `unavailable` when only the socket failed) that records one. Stale files are ignored.
 */
function findDiscoveredHttpPort(candidates, deps = {}) {
  for (const candidate of candidates) {
    const info = inspectDiscovery(candidate, deps);
    if ((info.state === 'ok' || info.state === 'unavailable') && info.httpPort)
      return info.httpPort;
  }
  return undefined;
}

function describeDiscoveryProblem(info) {
  switch (info.state) {
    case 'missing': {
      const checked = info.checkedPaths && info.checkedPaths.length > 1 ? info.checkedPaths : null;
      const where = checked ? `in any of: ${checked.join(', ')}` : `at ${info.discoveryPath}`;
      return (
        `Scribis MCP discovery file not found ${where}. ` +
        'Ensure the Scribis desktop app is running and MCP is enabled in Settings. ' +
        buildHttpModeHint()
      );
    }
    case 'unavailable':
      return (
        `Scribis is running${info.pid ? ` (process ${info.pid})` : ''}, ` +
        'but its MCP stdio socket is unavailable: ' +
        info.socketError +
        ' ' +
        buildHttpModeHint(info.httpPort)
      );
    case 'invalid':
      return `Scribis MCP discovery file at ${info.discoveryPath} is invalid (${info.error}).`;
    case 'stale':
      return (
        `Stale MCP discovery: ${info.discoveryPath} points to process ${info.pid}, ` +
        `which is no longer running (socket ${info.socketPath}). ` +
        'Restart Scribis or toggle the MCP server in Settings to refresh it, ' +
        'or set SCRIBIS_SOCKET_PATH to the socket of the running app.'
      );
    default:
      return null;
  }
}

/** Connects to the socket without speaking MCP, to verify that a server is listening. */
function probeSocket(socketPath, options = {}) {
  const timeoutMs = options.timeoutMs || 1500;
  const connect = options.connect || net.connect;
  return new Promise((resolve) => {
    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      socket.destroy();
      resolve(result);
    };
    const socket = connect(socketPath);
    const timer = setTimeout(
      () => finish({ ok: false, code: 'ETIMEDOUT', message: `Timed out after ${timeoutMs}ms` }),
      timeoutMs
    );
    socket.once('connect', () => finish({ ok: true }));
    socket.once('error', (err) => finish({ ok: false, code: err.code, message: err.message }));
  });
}

function isMissingSocketError(err) {
  return Boolean(err && (err.code === 'ENOENT' || err.code === 'ECONNREFUSED'));
}

module.exports = {
  MAS_BUNDLE_ID,
  DEFAULT_HTTP_PORT,
  HTTP_MODE_HINT,
  buildHttpModeHint,
  findDiscoveredHttpPort,
  getDiscoveryCandidates,
  findDiscovery,
  isPidAlive,
  inspectDiscovery,
  describeDiscoveryProblem,
  probeSocket,
  isMissingSocketError
};
