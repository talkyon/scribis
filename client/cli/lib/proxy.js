const net = require('net');
const { loadDiscovery } = require('./mcp-client');

function runMcpBridge() {
  let socketPath = process.env.SCRIBIS_SOCKET_PATH;
  if (!socketPath) {
    const discovery = loadDiscovery();
    if (discovery && discovery.socketPath) {
      socketPath = discovery.socketPath;
    }
  }

  if (!socketPath) {
    console.error('[scribis-cli] Error: Scribis desktop app is not running or MCP socket discovery file not found.');
    process.exit(1);
  }

  const client = net.connect(socketPath, () => {
    process.stdin.pipe(client);
    client.pipe(process.stdout);
  });

  client.on('error', (err) => {
    console.error('[scribis-cli] MCP Connection error:', err.message);
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
