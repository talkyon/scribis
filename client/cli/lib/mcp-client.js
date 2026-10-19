const net = require('net');
const http = require('http');
const path = require('path');
const fs = require('fs');
const os = require('os');
const {
  buildHttpModeHint,
  findDiscoveredHttpPort,
  getDiscoveryCandidates,
  findDiscovery,
  describeDiscoveryProblem,
  probeSocket,
  isMissingSocketError
} = require('./discovery');

function getUserDataPath() {
  if (process.env.SCRIBIS_USER_DATA_PATH) {
    return process.env.SCRIBIS_USER_DATA_PATH;
  }
  const platform = os.platform();
  if (platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Application Support', 'scribis');
  } else if (platform === 'win32') {
    return path.join(process.env.APPDATA || os.homedir(), 'scribis');
  } else {
    return path.join(os.homedir(), '.config', 'scribis');
  }
}

/**
 * Returns the discovery.json in use: the first live one among getDiscoveryCandidates(),
 * otherwise the file that best explains the problem.
 */
function getDiscoveryPath() {
  return findDiscovery(getDiscoveryCandidates()).discoveryPath;
}

function loadDiscovery() {
  const discoveryPath = getDiscoveryPath();
  if (!fs.existsSync(discoveryPath)) {
    return null;
  }
  try {
    const raw = fs.readFileSync(discoveryPath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Resolves the socket to use: SCRIBIS_SOCKET_PATH wins; otherwise the first live discovery.json
 * among the known locations. A file whose writing process is gone is rejected.
 */
function resolveSocketTarget() {
  if (process.env.SCRIBIS_SOCKET_PATH) {
    return { socketPath: process.env.SCRIBIS_SOCKET_PATH, source: 'env' };
  }
  const info = findDiscovery(getDiscoveryCandidates());
  if (info.state !== 'ok') {
    return {
      socketPath: null,
      source: 'discovery',
      state: info.state,
      discoveryPath: info.discoveryPath,
      error: describeDiscoveryProblem(info)
    };
  }
  return {
    socketPath: info.socketPath,
    source: 'discovery',
    state: 'ok',
    pid: info.pid,
    discoveryPath: info.discoveryPath
  };
}

function getSocketPath() {
  return resolveSocketTarget().socketPath;
}

function staleDiscoveryHint(discoveryPath = getDiscoveryPath()) {
  return (
    `The MCP discovery file ${discoveryPath} may be stale; ` +
    'restart Scribis or toggle the MCP server in Settings to refresh it. ' +
    buildHttpModeHint(getDiscoveredHttpPort())
  );
}

/** The HTTP port the running app published in discovery.json, if any. */
function getDiscoveredHttpPort() {
  return findDiscoveredHttpPort(getDiscoveryCandidates()) || null;
}

/** SCRIBIS_MCP_PORT (or SCRIBIS_PORT) wins; otherwise the port the running app published. */
function getMcpPort() {
  return process.env.SCRIBIS_MCP_PORT || process.env.SCRIBIS_PORT || getDiscoveredHttpPort();
}

const MISSING_PORT_MESSAGE =
  'MCP mode is enabled, but no port was found: set SCRIBIS_MCP_PORT to the port shown in ' +
  'Scribis Settings -> MCP Protocol (default 8890), or start Scribis with MCP enabled so it ' +
  'publishes its port in discovery.json.';

function isMcpModeRequested(flags = {}) {
  if (flags.mcp || flags.mode === 'mcp') return true;
  const envMode = (process.env.SCRIBIS_MODE || '').toLowerCase();
  return envMode === 'mcp' || process.env.USE_MCP === '1' || process.env.USE_MCP === 'true';
}

function callToolOverHttp(port, toolName, toolArgs) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: toolArgs || {}
      }
    });

    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: parseInt(port, 10),
        path: '/mcp',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          try {
            const json = JSON.parse(body);
            if (json.error) {
              return reject(new Error(json.error.message || 'MCP Error'));
            }
            const textContent = json.result?.content?.[0]?.text;
            if (textContent) {
              try {
                return resolve(JSON.parse(textContent));
              } catch {
                return resolve(textContent);
              }
            }
            resolve(json.result);
          } catch (err) {
            reject(new Error(`Failed to parse response: ${err.message}`));
          }
        });
      }
    );

    req.on('error', (err) => {
      reject(new Error(`Failed to connect to MCP HTTP server on port ${port}: ${err.message}`));
    });

    req.write(postData);
    req.end();
  });
}

function callToolOverSocket(socketPath, toolName, toolArgs) {
  return new Promise((resolve, reject) => {
    const client = net.connect(socketPath, () => {
      const initReq = JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'scribis-cli', version: '1.0.0' }
        }
      });
      client.write(initReq + '\n');
    });

    let buffer = '';
    const callId = 2;

    client.on('data', (data) => {
      buffer += data.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop(); // keep last incomplete line

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const msg = JSON.parse(line.trim());
          if (msg.id === 1) {
            // initialized
            client.write(
              JSON.stringify({
                jsonrpc: '2.0',
                method: 'notifications/initialized'
              }) + '\n'
            );

            // send tool call
            const toolCallReq = JSON.stringify({
              jsonrpc: '2.0',
              id: callId,
              method: 'tools/call',
              params: {
                name: toolName,
                arguments: toolArgs || {}
              }
            });
            client.write(toolCallReq + '\n');
          } else if (msg.id === callId) {
            client.end();
            if (msg.error) {
              return reject(new Error(msg.error.message || 'MCP Error'));
            }
            const textContent = msg.result?.content?.[0]?.text;
            if (textContent) {
              try {
                return resolve(JSON.parse(textContent));
              } catch {
                return resolve(textContent);
              }
            }
            return resolve(msg.result);
          }
        } catch {
          // ignore invalid JSON lines
        }
      }
    });

    client.on('error', (err) => {
      const error = new Error(`Stdio/socket connection error at ${socketPath}: ${err.message}`);
      error.code = err.code;
      reject(error);
    });
  });
}

async function callTool(toolName, toolArgs, flags = {}) {
  const isMcp = isMcpModeRequested(flags);

  if (isMcp) {
    const port = getMcpPort();
    if (!port) {
      throw new Error(MISSING_PORT_MESSAGE);
    }
    return await callToolOverHttp(port, toolName, toolArgs);
  } else {
    // Stdio mode (Default)
    const target = resolveSocketTarget();
    if (!target.socketPath) {
      throw new Error(target.error);
    }
    try {
      return await callToolOverSocket(target.socketPath, toolName, toolArgs);
    } catch (err) {
      if (target.source === 'discovery' && isMissingSocketError(err)) {
        throw new Error(`${err.message}\n${staleDiscoveryHint(target.discoveryPath)}`);
      }
      throw err;
    }
  }
}

async function checkConnectionStatus(flags = {}) {
  const isMcp = isMcpModeRequested(flags);
  if (isMcp) {
    const port = getMcpPort();
    if (!port) {
      return {
        ok: false,
        mode: 'mcp',
        error: MISSING_PORT_MESSAGE
      };
    }
    return {
      ok: true,
      mode: 'mcp',
      port: port,
      portSource: process.env.SCRIBIS_MCP_PORT || process.env.SCRIBIS_PORT ? 'env' : 'discovery'
    };
  } else {
    const target = resolveSocketTarget();
    if (!target.socketPath) {
      return {
        ok: false,
        mode: 'stdio',
        stale: target.state === 'stale',
        error: target.error
      };
    }
    // A pid can be reused by an unrelated process, so confirm that the socket accepts connections.
    const probe = await probeSocket(target.socketPath);
    if (!probe.ok) {
      const hint =
        target.source === 'env'
          ? `Check SCRIBIS_SOCKET_PATH. ${buildHttpModeHint(getDiscoveredHttpPort())}`
          : staleDiscoveryHint(target.discoveryPath);
      return {
        ok: false,
        mode: 'stdio',
        stale: target.source === 'discovery',
        socketPath: target.socketPath,
        pid: target.pid,
        error: `Cannot connect to ${target.socketPath} (${probe.code || probe.message}). ${hint}`
      };
    }
    return {
      ok: true,
      mode: 'stdio',
      socketPath: target.socketPath,
      pid: target.pid,
      source: target.source
    };
  }
}

module.exports = {
  getUserDataPath,
  getDiscoveryPath,
  loadDiscovery,
  getSocketPath,
  resolveSocketTarget,
  staleDiscoveryHint,
  getDiscoveredHttpPort,
  getMcpPort,
  isMcpModeRequested,
  callTool,
  checkConnectionStatus
};
