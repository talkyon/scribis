// Run with: node mcp_client/cli/lib/__tests__/discovery-locations.test.js
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn, spawnSync } = require('child_process');
const {
  MAS_BUNDLE_ID,
  HTTP_MODE_HINT,
  getDiscoveryCandidates,
  findDiscovery,
  inspectDiscovery,
  describeDiscoveryProblem
} = require('../discovery');

const CLI_PATH = path.resolve(__dirname, '../../bin/scribis.js');
const BRIDGE_PATH = path.resolve(__dirname, '../../../bridge.js');

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
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'scribis-cli-locations-'));
  const write = (name, data) => {
    const file = path.join(directory, name);
    fs.writeFileSync(file, typeof data === 'string' ? data : JSON.stringify(data));
    return file;
  };

  try {
    console.log('Testing getDiscoveryCandidates...');
    const listedDirectories = [];
    const listDirectory = (directory) => {
      listedDirectories.push(directory);
      return [
        'group.other.app',
        `TEAMID1234.${MAS_BUNDLE_ID}`,
        'ABCDE12345.com.talkyon.scribis.extra',
        `ANOTHER999.${MAS_BUNDLE_ID}`
      ];
    };
    const mac = getDiscoveryCandidates({
      env: {},
      platform: 'darwin',
      homeDir: '/Users/alice',
      listDirectory
    });
    assert.deepStrictEqual(mac, [
      '/Users/alice/Library/Application Support/scribis/_mcp/discovery.json',
      '/Users/alice/Library/Group Containers/ANOTHER999.com.talkyon.scribis/_mcp/discovery.json',
      '/Users/alice/Library/Group Containers/TEAMID1234.com.talkyon.scribis/_mcp/discovery.json',
      '/Users/alice/Library/Containers/com.talkyon.scribis/Data/Library/Application Support/scribis/_mcp/discovery.json'
    ]);
    assert.deepStrictEqual(
      listedDirectories,
      ['/Users/alice/Library/Group Containers'],
      'only the group container directory is listed'
    );
    assert.deepStrictEqual(
      getDiscoveryCandidates({
        env: {},
        platform: 'darwin',
        homeDir: '/Users/alice',
        listDirectory: () => {
          throw Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
        }
      }),
      [
        '/Users/alice/Library/Application Support/scribis/_mcp/discovery.json',
        '/Users/alice/Library/Containers/com.talkyon.scribis/Data/Library/Application Support/scribis/_mcp/discovery.json'
      ],
      'no group containers directory means no app group candidates'
    );
    assert.deepStrictEqual(
      getDiscoveryCandidates({
        env: { APPDATA: 'C:\\Users\\alice\\AppData\\Roaming' },
        platform: 'win32',
        homeDir: 'C:\\Users\\alice'
      }),
      ['C:\\Users\\alice\\AppData\\Roaming\\scribis\\_mcp\\discovery.json']
    );
    assert.deepStrictEqual(
      getDiscoveryCandidates({ env: {}, platform: 'linux', homeDir: '/home/alice' }),
      ['/home/alice/.config/scribis/_mcp/discovery.json']
    );
    assert.deepStrictEqual(
      getDiscoveryCandidates({
        env: { SCRIBIS_DISCOVERY_PATH: '/x/discovery.json', SCRIBIS_USER_DATA_PATH: '/y' },
        platform: 'darwin',
        homeDir: '/Users/alice',
        listDirectory
      }),
      ['/x/discovery.json']
    );
    assert.deepStrictEqual(
      getDiscoveryCandidates({
        env: { SCRIBIS_USER_DATA_PATH: '/custom/scribis' },
        platform: 'darwin',
        homeDir: '/Users/alice',
        listDirectory
      }),
      ['/custom/scribis/_mcp/discovery.json']
    );
    console.log('  ✓ covers direct, MAS app group and MAS container locations; overrides win');

    console.log('Testing findDiscovery...');
    const deadPid = getExitedPid();
    const missingA = path.join(directory, 'a.json');
    const missingB = path.join(directory, 'b.json');
    const live = write('live.json', { socketPath: '/tmp/live.sock', pid: process.pid });
    const stale = write('stale.json', { socketPath: '/tmp/old.sock', pid: deadPid });
    const invalid = write('invalid.json', '{oops');
    const unavailable = write('unavailable.json', {
      socketPath: '/very/long/mcp.sock',
      pid: process.pid,
      socketError: 'The MCP socket path is 130 bytes, over the 103-byte Unix socket limit.',
      httpPort: 8890
    });

    assert.strictEqual(findDiscovery([missingA, stale, live]).discoveryPath, live);
    assert.strictEqual(findDiscovery([missingA, stale, live]).state, 'ok');
    assert.strictEqual(findDiscovery([invalid, stale, missingA]).state, 'stale');
    assert.strictEqual(findDiscovery([missingA, invalid]).state, 'invalid');
    assert.strictEqual(findDiscovery([stale, unavailable]).state, 'unavailable');
    assert.strictEqual(findDiscovery([unavailable, live]).discoveryPath, live);

    const reads = [];
    findDiscovery([live, missingA], {
      readFile: (p) => {
        reads.push(p);
        return fs.readFileSync(p, 'utf8');
      }
    });
    assert.deepStrictEqual(reads, [live], 'stops at the first live file');

    const none = findDiscovery([missingA, missingB]);
    assert.deepStrictEqual(none, {
      state: 'missing',
      discoveryPath: missingA,
      checkedPaths: [missingA, missingB]
    });
    const noneMessage = describeDiscoveryProblem(none);
    assert.ok(noneMessage.includes(missingA) && noneMessage.includes(missingB), noneMessage);
    assert.ok(noneMessage.includes(HTTP_MODE_HINT), noneMessage);
    assert.ok(noneMessage.includes('--mcp'), noneMessage);
    assert.ok(
      describeDiscoveryProblem(findDiscovery([missingA])).includes(`at ${missingA}`),
      'a single path keeps the original wording'
    );
    console.log('  ✓ prefers live files, then the most useful problem, and lists checked paths');

    console.log('Testing the unavailable state...');
    const info = inspectDiscovery(unavailable);
    assert.strictEqual(info.state, 'unavailable');
    assert.strictEqual(info.pid, process.pid);
    const message = describeDiscoveryProblem(info);
    assert.ok(message.includes('stdio socket is unavailable'), message);
    assert.ok(message.includes('103-byte'), message);
    // A dead process wins over a stale socketError.
    const staleUnavailable = write('stale-unavailable.json', {
      socketPath: '/x.sock',
      pid: deadPid,
      socketError: 'old'
    });
    assert.strictEqual(inspectDiscovery(staleUnavailable).state, 'stale');
    console.log('  ✓ reports a running app whose socket could not listen');

    console.log('Testing CLI status and bridge with an unavailable socket...');
    const status = await runNode(CLI_PATH, ['status'], { SCRIBIS_DISCOVERY_PATH: unavailable });
    assert.ok(!status.stdout.includes('Connected'), status.stdout);
    assert.ok(status.stdout.includes('stdio socket is unavailable'), status.stdout);

    const bridge = await runNode(BRIDGE_PATH, [], { SCRIBIS_DISCOVERY_PATH: unavailable });
    assert.strictEqual(bridge.code, 1);
    assert.ok(bridge.stderr.includes('stdio socket is unavailable'), bridge.stderr);

    const missingBridge = await runNode(BRIDGE_PATH, [], { SCRIBIS_DISCOVERY_PATH: missingA });
    assert.strictEqual(missingBridge.code, 1);
    assert.ok(missingBridge.stderr.includes('--mcp'), missingBridge.stderr);
    console.log('  ✓ status and bridge explain the failure and suggest HTTP mode');

    console.log('\nAll CLI discovery location tests passed.');
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
