#!/usr/bin/env node

/**
 * Scribis MCP Bridge
 * stdio ↔ socket proxy script spawned by AI Hosts (Claude Code, Codex CLI, Antigravity IDE).
 * Connects via Unix Socket / Named Pipe to the active running Scribis desktop app.
 * Run it from the mcp_client directory: it shares discovery checks with cli/lib/discovery.js.
 *
 * Supported Environment Variables:
 * - SCRIBIS_SOCKET_PATH: Direct Unix socket or Windows named pipe path override.
 * - SCRIBIS_DISCOVERY_PATH: Direct path override to discovery.json.
 * - SCRIBIS_USER_DATA_PATH: Custom Scribis userData directory path override.
 *
 * Without overrides, macOS checks the direct-download userData folder, the Mac App Store app
 * group container and the MAS app container (see getDiscoveryCandidates).
 */

import net from 'net';
import discovery from './cli/lib/discovery.js';

const {
  buildHttpModeHint,
  findDiscoveredHttpPort,
  getDiscoveryCandidates,
  findDiscovery,
  describeDiscoveryProblem,
  isMissingSocketError
} = discovery;

function main() {
  let socketPath = process.env.SCRIBIS_SOCKET_PATH;
  let httpPort;

  if (!socketPath) {
    const info = findDiscovery(getDiscoveryCandidates());
    if (info.state !== 'ok') {
      console.error(`[scribis-mcp-bridge] Error: ${describeDiscoveryProblem(info)}`);
      process.exit(1);
    }
    socketPath = info.socketPath;
    httpPort = info.httpPort;
  }

  const client = net.connect(socketPath, () => {
    // Pipe stdio ↔ socket
    process.stdin.pipe(client);
    client.pipe(process.stdout);
  });

  client.on('error', (err) => {
    if (isMissingSocketError(err)) {
      console.error(
        `[scribis-mcp-bridge] Connection Error: Failed to connect to Scribis socket at "${socketPath}".\n` +
          `Possible causes:\n` +
          `1. Scribis desktop application is NOT currently running (or was closed).\n` +
          `2. MCP Server is DISABLED in Scribis App (Settings -> MCP Protocol -> Enable MCP Server).\n` +
          `3. A stale discovery file was read from a previous app run.\n` +
          // The port the running app published, so the hint can be copied as is.
          buildHttpModeHint(httpPort || findDiscoveredHttpPort(getDiscoveryCandidates()))
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
