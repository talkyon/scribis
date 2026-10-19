// Run with: node mcp_client/cli/lib/__tests__/discovery.test.js
const assert = require('assert');
const fs = require('fs');
const net = require('net');
const os = require('os');
const path = require('path');
const { spawn, spawnSync } = require('child_process');
const {
  isPidAlive,
  inspectDiscovery,
  describeDiscoveryProblem,
  probeSocket,
  isMissingSocketError
} = require('../discovery');

const CLI_PATH = path.resolve(__dirname, '../../bin/scribis.js');
const BRIDGE_PATH = path.resolve(__dirname, '../../../bridge.js');

function errorWithCode(code) {
  const err = new Error(code);
  err.code = code;
  return err;
}

function uniqueSocketPath(directory) {
  if (process.platform === 'win32') {
    const id = `${process.pid}-${Date.now()}`;
    return `\\\\.\\pipe\\scribis-discovery-test-${id}`;
  }
  // macOS limits AF_UNIX paths; the temp directory is already unique per test run.
  return path.join(directory, 's');
}

function getExitedPid() {
  const child = spawnSync(process.execPath, ['-e', 'process.stdout.write(String(process.pid))']);
  return Number(child.stdout.toString());
}

function runNode(script, args, env) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [script, ...args], {
      env: { ...process.env, SCRIBIS_SOCKET_PATH: '', ...env },
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

async function main() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'scribis-cli-discovery-'));
  const discoveryPath = path.join(directory, 'discovery.json');
  const writeDiscovery = (data) => fs.writeFileSync(discoveryPath, JSON.stringify(data));

  try {
    console.log('Testing isPidAlive...');
    assert.strictEqual(isPidAlive(process.pid), true);
    assert.strictEqual(isPidAlive(0), false);
    assert.strictEqual(isPidAlive(-1), false);
    assert.strictEqual(isPidAlive('123'), false);
    assert.strictEqual(isPidAlive(undefined), false);
    assert.strictEqual(
      isPidAlive(123, () => {
        throw errorWithCode('ESRCH');
      }),
      false
    );
    assert.strictEqual(
      isPidAlive(123, () => {
        throw errorWithCode('EPERM');
      }),
      true
    );
    assert.strictEqual(isPidAlive(getExitedPid()), false);
    console.log('  ✓ detects live, exited and inaccessible processes');

    console.log('Testing inspectDiscovery...');
    assert.strictEqual(inspectDiscovery(discoveryPath).state, 'missing');

    fs.writeFileSync(discoveryPath, '{oops');
    assert.strictEqual(inspectDiscovery(discoveryPath).state, 'invalid');
    writeDiscovery({ pid: process.pid });
    assert.strictEqual(inspectDiscovery(discoveryPath).state, 'invalid');

    writeDiscovery({ socketPath: '/tmp/live.sock', pid: process.pid });
    assert.deepStrictEqual(inspectDiscovery(discoveryPath), {
      state: 'ok',
      discoveryPath,
      socketPath: '/tmp/live.sock',
      pid: process.pid
    });

    // The reported incident: another instance overwrote the file and then exited.
    const deadPid = getExitedPid();
    writeDiscovery({ socketPath: '\\\\.\\pipe\\scribis-mcp-1791992694728', pid: deadPid });
    const stale = inspectDiscovery(discoveryPath);
    assert.strictEqual(stale.state, 'stale');
    assert.strictEqual(stale.pid, deadPid);
    assert.ok(describeDiscoveryProblem(stale).includes('Stale MCP discovery'));
    assert.ok(describeDiscoveryProblem(stale).includes(String(deadPid)));

    // Files without a pid cannot be verified and are left to the socket probe.
    writeDiscovery({ socketPath: '/tmp/legacy.sock' });
    assert.strictEqual(inspectDiscovery(discoveryPath).state, 'ok');

    const readError = inspectDiscovery(discoveryPath, {
      readFile: () => {
        throw errorWithCode('EACCES');
      }
    });
    assert.strictEqual(readError.state, 'invalid');
    assert.strictEqual(describeDiscoveryProblem({ state: 'ok' }), null);
    console.log('  ✓ classifies missing, invalid, stale and live discovery files');

    console.log('Testing isMissingSocketError...');
    assert.strictEqual(isMissingSocketError(errorWithCode('ENOENT')), true);
    assert.strictEqual(isMissingSocketError(errorWithCode('ECONNREFUSED')), true);
    assert.strictEqual(isMissingSocketError(errorWithCode('EPIPE')), false);
    assert.strictEqual(isMissingSocketError(null), false);
    console.log('  ✓ recognises missing-socket errors');

    console.log('Testing probeSocket...');
    const socketPath = uniqueSocketPath(directory);
    const server = net.createServer((socket) => socket.end());
    await new Promise((resolve) => server.listen(socketPath, resolve));
    try {
      assert.deepStrictEqual(await probeSocket(socketPath), { ok: true });
      const missing = await probeSocket(`${socketPath}-missing`);
      assert.strictEqual(missing.ok, false);
      assert.ok(isMissingSocketError(missing));

      const hanging = await probeSocket('unused', {
        timeoutMs: 20,
        connect: () => new net.Socket()
      });
      assert.strictEqual(hanging.code, 'ETIMEDOUT');
      console.log('  ✓ reports listening, missing and unresponsive sockets');

      console.log('Testing CLI status and bridge against discovery files...');
      writeDiscovery({ socketPath, pid: process.pid });
      const live = await runNode(CLI_PATH, ['status'], { SCRIBIS_DISCOVERY_PATH: discoveryPath });
      assert.ok(live.stdout.includes('Connected'), live.stdout);
      assert.ok(live.stdout.includes(String(process.pid)), live.stdout);

      writeDiscovery({ socketPath: `${socketPath}-gone`, pid: deadPid });
      const staleStatus = await runNode(CLI_PATH, ['status'], {
        SCRIBIS_DISCOVERY_PATH: discoveryPath
      });
      assert.ok(!staleStatus.stdout.includes('Connected'), staleStatus.stdout);
      assert.ok(staleStatus.stdout.includes('Stale MCP discovery'), staleStatus.stdout);

      // A live pid whose socket is gone (e.g. a reused pid) must not report Connected either.
      writeDiscovery({ socketPath: `${socketPath}-gone`, pid: process.pid });
      const deadSocket = await runNode(CLI_PATH, ['status'], {
        SCRIBIS_DISCOVERY_PATH: discoveryPath
      });
      assert.ok(!deadSocket.stdout.includes('Connected'), deadSocket.stdout);
      assert.ok(deadSocket.stdout.includes('may be stale'), deadSocket.stdout);

      writeDiscovery({ socketPath: `${socketPath}-gone`, pid: deadPid });
      const bridge = await runNode(BRIDGE_PATH, [], { SCRIBIS_DISCOVERY_PATH: discoveryPath });
      assert.strictEqual(bridge.code, 1);
      assert.ok(bridge.stderr.includes('Stale MCP discovery'), bridge.stderr);

      const cliBridge = await runNode(CLI_PATH, ['mcp-bridge'], {
        SCRIBIS_DISCOVERY_PATH: discoveryPath
      });
      assert.strictEqual(cliBridge.code, 1);
      assert.ok(cliBridge.stderr.includes('Stale MCP discovery'), cliBridge.stderr);

      // SCRIBIS_SOCKET_PATH still overrides a stale discovery file.
      const override = await runNode(CLI_PATH, ['status'], {
        SCRIBIS_DISCOVERY_PATH: discoveryPath,
        SCRIBIS_SOCKET_PATH: socketPath
      });
      assert.ok(override.stdout.includes('Connected'), override.stdout);
      console.log('  ✓ status, bridge and override behave as expected');
    } finally {
      // Named pipe servers on Windows may never emit 'close', so do not await it.
      server.close();
    }

    console.log('\nAll CLI discovery tests passed.');
    process.exitCode = 0;
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

// Fails unless main() reaches the end, so a stalled await cannot pass silently.
process.exitCode = 1;
main().catch((err) => {
  console.error(err);
  process.exit(1);
});
