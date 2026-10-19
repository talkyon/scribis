const net = require('net');
const { resolveSocketTarget, staleDiscoveryHint } = require('./mcp-client');
const { isMissingSocketError } = require('./discovery');

function runMcpBridge() {
  const target = resolveSocketTarget();
  const socketPath = target.socketPath;

  if (!socketPath) {
    console.error(`[scribis-cli] Error: ${target.error}`);
    process.exit(1);
  }

  const client = net.connect(socketPath, () => {
    process.stdin.pipe(client);
    client.pipe(process.stdout);
  });

  client.on('error', (err) => {
    console.error('[scribis-cli] MCP Connection error:', err.message);
    if (target.source === 'discovery' && isMissingSocketError(err)) {
      console.error(`[scribis-cli] ${staleDiscoveryHint(target.discoveryPath)}`);
    }
    process.exit(1);
  });

  client.on('close', () => {
    process.exit(0);
  });

  process.stdin.on('end', () => {
    client.end();
  });
}

module.exports = {
  runMcpBridge
};
