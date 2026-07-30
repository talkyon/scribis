const net = require('net');
const http = require('http');
const path = require('path');
const fs = require('fs');
const os = require('os');

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

function getDiscoveryPath() {
  if (process.env.SCRIBIS_DISCOVERY_PATH) {
    return process.env.SCRIBIS_DISCOVERY_PATH;
  }
  return path.join(getUserDataPath(), '_mcp', 'discovery.json');
}

function loadDiscovery() {
  const discoveryPath = getDiscoveryPath();
  if (!fs.existsSync(discoveryPath)) {
    return null;
  }
  try {
    const raw = fs.readFileSync(discoveryPath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    return null;
  }
}

function getSocketPath() {
  if (process.env.SCRIBIS_SOCKET_PATH) {
    return process.env.SCRIBIS_SOCKET_PATH;
  }
  const discovery = loadDiscovery();
  return discovery ? discovery.socketPath : null;
}

function getMcpPort() {
  return process.env.SCRIBIS_MCP_PORT || process.env.SCRIBIS_PORT || null;
}

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
              } catch (e) {
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
    let initialized = false;
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
            initialized = true;
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
              } catch (e) {
                return resolve(textContent);
              }
            }
            return resolve(msg.result);
          }
        } catch (e) {
          // ignore invalid JSON lines
        }
      }
    });

    client.on('error', (err) => {
      reject(new Error(`Stdio/socket connection error at ${socketPath}: ${err.message}`));
    });
  });
}

async function callTool(toolName, toolArgs, flags = {}) {
  const isMcp = isMcpModeRequested(flags);

  if (isMcp) {
    const port = getMcpPort();
    if (!port) {
      throw new Error(
        'MCP mode is enabled, but no port was specified.\nPlease set the environment variable SCRIBIS_MCP_PORT (e.g. SCRIBIS_MCP_PORT=8890).'
      );
    }
    return await callToolOverHttp(port, toolName, toolArgs);
  } else {
    // Stdio mode (Default)
    const socketPath = getSocketPath();
    if (!socketPath) {
      throw new Error(
        'Scribis stdio socket is not accessible.\nPlease ensure the Scribis Desktop application is running.'
      );
    }
    return await callToolOverSocket(socketPath, toolName, toolArgs);
  }
}

function checkConnectionStatus(flags = {}) {
  const isMcp = isMcpModeRequested(flags);
  if (isMcp) {
    const port = getMcpPort();
    if (!port) {
      return {
        ok: false,
        mode: 'mcp',
        error: 'MCP mode enabled but environment variable SCRIBIS_MCP_PORT is not set.'
      };
    }
    return {
      ok: true,
      mode: 'mcp',
      port: port
    };
  } else {
    const socketPath = getSocketPath();
    const discovery = loadDiscovery();
    if (!socketPath) {
      return {
        ok: false,
        mode: 'stdio',
        error: 'Scribis stdio socket is not accessible. Desktop app not running.'
      };
    }
    return {
      ok: true,
      mode: 'stdio',
      socketPath: socketPath,
      pid: discovery?.pid
    };
  }
}

module.exports = {
  getUserDataPath,
  getDiscoveryPath,
  loadDiscovery,
  getSocketPath,
  getMcpPort,
  isMcpModeRequested,
  callTool,
  checkConnectionStatus
};
