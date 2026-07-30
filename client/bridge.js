#!/usr/bin/env node

/**
 * Scribis MCP Bridge
 * Standalone stdio ↔ socket proxy script spawned by AI Hosts (Claude Code, Codex CLI, Antigravity IDE).
 * Connects via Unix Socket / Named Pipe to the active running Scribis desktop app.
 *
 * Supported Environment Variables:
 * - SCRIBIS_SOCKET_PATH: Direct Unix socket or Windows named pipe path override.
 * - SCRIBIS_DISCOVERY_PATH: Direct path override to discovery.json.
 * - SCRIBIS_USER_DATA_PATH: Custom Scribis userData directory path override.
 */

const net = require('net');
const fs = require('fs');
const path = require('path');
const os = require('os');

function getDiscoveryPath() {
  if (process.env.SCRIBIS_DISCOVERY_PATH) {
    return process.env.SCRIBIS_DISCOVERY_PATH;
  }

  let userDataPath = process.env.SCRIBIS_USER_DATA_PATH;
  if (!userDataPath) {
    const platform = os.platform();
    if (platform === 'darwin') {
      userDataPath = path.join(os.homedir(), 'Library', 'Application Support', 'scribis');
    } else if (platform === 'win32') {
      userDataPath = path.join(process.env.APPDATA || os.homedir(), 'scribis');
    } else {
      userDataPath = path.join(os.homedir(), '.config', 'scribis');
    }
  }

  return path.join(userDataPath, '_mcp', 'discovery.json');
}

function main() {
  let socketPath = process.env.SCRIBIS_SOCKET_PATH;

  if (!socketPath) {
    const discoveryFile = getDiscoveryPath();

    if (!fs.existsSync(discoveryFile)) {
      console.error(`[scribis-mcp-bridge] Error: Scribis is not running or MCP discovery file not found at ${discoveryFile}`);
      process.exit(1);
    }

    try {
      const raw = fs.readFileSync(discoveryFile, 'utf8');
      const discoveryData = JSON.parse(raw);
      socketPath = discoveryData.socketPath;
    } catch (err) {
      console.error('[scribis-mcp-bridge] Error reading discovery file:', err.message);
      process.exit(1);
    }
  }

  if (!socketPath) {
    console.error('[scribis-mcp-bridge] Invalid socketPath');
    process.exit(1);
  }

  const client = net.connect(socketPath, () => {
    // Pipe stdio ↔ socket
    process.stdin.pipe(client);
    client.pipe(process.stdout);
  });

  client.on('error', (err) => {
    if (err.code === 'ENOENT' || err.code === 'ECONNREFUSED') {
      console.error(
        `[scribis-mcp-bridge] Connection Error: Failed to connect to Scribis socket at "${socketPath}".\n` +
        `Possible causes:\n` +
        `1. Scribis desktop application is NOT currently running (or was closed).\n` +
        `2. MCP Server is DISABLED in Scribis App (Settings -> MCP Protocol -> Enable MCP Server).\n` +
        `3. A stale discovery file was read from a previous app run.`
      );
    } else {
      console.error('[scribis-mcp-bridge] Connection error to Scribis socket:', err.message);
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

main();
