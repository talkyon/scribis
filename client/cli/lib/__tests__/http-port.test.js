// Run with: node mcp_client/cli/lib/__tests__/http-port.test.js
const assert = require('assert');
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');
const { spawn, spawnSync } = require('child_process');
const {
  DEFAULT_HTTP_PORT,
  HTTP_MODE_HINT,
  buildHttpModeHint,
  findDiscoveredHttpPort,
  inspectDiscovery,
  describeDiscoveryProblem
} = require('../discovery');

const CLI_PATH = path.resolve(__dirname, '../../bin/scribis.js');
const BRIDGE_PATH = path.resolve(__dirname, '../../../bridge.js');
const MISSING_SOCKET =
  process.platform === 'win32'
    ? `\\\\.\\pipe\\scribis-missing-test-${process.pid}`
    : path.join(os.tmpdir(), `scribis-missing-test-${process.pid}.sock`);

function getExitedPid() {
  const child = spawnSync(process.execPath, ['-e', 'process.stdout.write(String(process.pid))']);
  return Number(child.stdout.toString());
}

/** Runs a script with every port and socket override cleared unless `env` sets it. */
function runNode(script, args, env) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [script, ...args], {
      env: {
        ...process.env,
        SCRIBIS_SOCKET_PATH: '',
        SCRIBIS_MCP_PORT: '',
        SCRIBIS_PORT: '',
        SCRIBIS_MODE: '',
        USE_MCP: '',
        ...env
      },
      stdio: ['pipe', 'pipe', 'pipe']
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => (stdout += d));
    child.stderr.on('data', (d) => (stderr += d));
    child.on('close', (code) => resolve({ code, stdout, stderr }));
    child.stdin.end();
  });
}

/** A stand-in for the app's /mcp endpoint that records each JSON-RPC request. */
function startFakeMcpServer() {
  const requests = [];
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      const message = JSON.parse(body);
      requests.push({ path: req.url, message });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          jsonrpc: '2.0',
          id: message.id,
          result: {
            content: [{ type: 'text', text: JSON.stringify({ success: true, message: 'Opened' }) }]
          }
        })
      );
    });
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port, requests }));
  });
}

async function main() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'scribis-cli-http-port-'));
  const write = (name, data) => {
    const file = path.join(directory, name);
    fs.writeFileSync(file, JSON.stringify(data));
    return file;
  };
  const fake = await startFakeMcpServer();

  try {
    console.log('Testing buildHttpModeHint...');
    const withPort = buildHttpModeHint(9123);
    assert.ok(withPort.includes('http://127.0.0.1:9123/mcp'), withPort);
    assert.ok(withPort.includes('port 9123'), withPort);
    assert.ok(
      !withPort.includes(String(DEFAULT_HTTP_PORT)),
      'a published port replaces the default'
    );
    assert.strictEqual(HTTP_MODE_HINT, buildHttpModeHint());
    assert.ok(HTTP_MODE_HINT.includes('Settings -> MCP Protocol (default 8890)'), HTTP_MODE_HINT);
    assert.ok(
      !HTTP_MODE_HINT.includes('SCRIBIS_MCP_PORT=8890'),
      'no hard-coded port in the command'
    );
    for (const invalid of [0, -1, 70000, 8890.5, '8890', null]) {
      assert.strictEqual(buildHttpModeHint(invalid), HTTP_MODE_HINT, `ignores port ${invalid}`);
    }
    console.log('  ✓ uses the published port and falls back to Settings');

    console.log('Testing httpPort in discovery.json...');
    const deadPid = getExitedPid();
    const live = write('live.json', {
      socketPath: MISSING_SOCKET,
      pid: process.pid,
      httpPort: fake.port
    });
    const liveNoPort = write('live-no-port.json', { socketPath: MISSING_SOCKET, pid: process.pid });
    const stale = write('stale.json', { socketPath: '/old.sock', pid: deadPid, httpPort: 9001 });
    const badPort = write('bad-port.json', {
      socketPath: '/x.sock',
      pid: process.pid,
      httpPort: 'abc'
    });
    const unavailable = write('unavailable.json', {
      socketPath: '/very/long/mcp.sock',
      pid: process.pid,
      socketError: 'The MCP socket path is over the Unix socket limit.',
      httpPort: 9124
    });
    const missing = path.join(directory, 'missing.json');

    assert.strictEqual(inspectDiscovery(live).httpPort, fake.port);
    assert.strictEqual(inspectDiscovery(liveNoPort).httpPort, undefined);
    assert.strictEqual(inspectDiscovery(badPort).httpPort, undefined);
    assert.strictEqual(inspectDiscovery(unavailable).httpPort, 9124);

    assert.strictEqual(
      findDiscoveredHttpPort([missing, stale, live]),
      fake.port,
      'skips stale files'
    );
    assert.strictEqual(
      findDiscoveredHttpPort([unavailable, live]),
      9124,
      'a running app without a socket counts'
    );
    assert.strictEqual(
      findDiscoveredHttpPort([liveNoPort, live]),
      fake.port,
      'skips files without a port'
    );
    assert.strictEqual(findDiscoveredHttpPort([stale, missing, badPort]), undefined);

    const unavailableMessage = describeDiscoveryProblem(inspectDiscovery(unavailable));
    assert.ok(unavailableMessage.includes('http://127.0.0.1:9124/mcp'), unavailableMessage);
    console.log('  ✓ reads httpPort only from running apps');

    console.log('Testing CLI --mcp with the discovered port...');
    const status = await runNode(CLI_PATH, ['status', '--mcp'], { SCRIBIS_DISCOVERY_PATH: live });
    assert.ok(
      status.stdout.includes(`MCP Port:            ${fake.port} (from discovery.json)`),
      status.stdout
    );

    const envWins = await runNode(CLI_PATH, ['status', '--mcp'], {
      SCRIBIS_DISCOVERY_PATH: live,
      SCRIBIS_MCP_PORT: '9555'
    });
    assert.ok(envWins.stdout.includes('MCP Port:            9555'), envWins.stdout);
    assert.ok(!envWins.stdout.includes('from discovery.json'), envWins.stdout);

    const noPort = await runNode(CLI_PATH, ['status', '--mcp'], {
      SCRIBIS_DISCOVERY_PATH: liveNoPort
    });
    assert.ok(noPort.stdout.includes('Settings -> MCP Protocol (default 8890)'), noPort.stdout);

    // `status` also queried list_models through the discovered port.
    assert.ok(
      fake.requests.some((r) => r.message.params.name === 'list_models'),
      'status reached the app'
    );
    fake.requests.length = 0;
    const opened = await runNode(CLI_PATH, ['open', 'youtube', '--mcp'], {
      SCRIBIS_DISCOVERY_PATH: live
    });
    assert.strictEqual(opened.code, 0, opened.stderr);
    assert.strictEqual(fake.requests.length, 1, 'the CLI called the discovered port');
    assert.strictEqual(fake.requests[0].path, '/mcp');
    assert.strictEqual(fake.requests[0].message.method, 'tools/call');
    assert.strictEqual(fake.requests[0].message.params.name, 'app_open_youtube_browser');
    console.log('  ✓ status and tool calls use the published port; SCRIBIS_MCP_PORT still wins');

    console.log('Testing the bridge hint...');
    const bridge = await runNode(BRIDGE_PATH, [], { SCRIBIS_DISCOVERY_PATH: live });
    assert.strictEqual(bridge.code, 1);
    assert.ok(bridge.stderr.includes(`http://127.0.0.1:${fake.port}/mcp`), bridge.stderr);

    const bridgeEnvSocket = await runNode(BRIDGE_PATH, [], {
      SCRIBIS_SOCKET_PATH: MISSING_SOCKET,
      SCRIBIS_DISCOVERY_PATH: unavailable
    });
    assert.strictEqual(bridgeEnvSocket.code, 1);
    assert.ok(bridgeEnvSocket.stderr.includes('http://127.0.0.1:9124/mcp'), bridgeEnvSocket.stderr);

    const bridgeNoPort = await runNode(BRIDGE_PATH, [], { SCRIBIS_DISCOVERY_PATH: liveNoPort });
    assert.strictEqual(bridgeNoPort.code, 1);
    assert.ok(bridgeNoPort.stderr.includes('(default 8890)'), bridgeNoPort.stderr);
    console.log('  ✓ the bridge names the port the app published');

    console.log('\nAll CLI HTTP port tests passed.');
    process.exitCode = 0;
  } finally {
    fake.server.close();
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

// Fails unless main() reaches the end, so a stalled await cannot pass silently.
process.exitCode = 1;
main().catch((err) => {
  console.error(err);
  process.exit(1);
});
