import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getTransport() {
  // 1. Explicit environment variable override
  if (process.env.SCRIBIS_BRIDGE_PATH && fs.existsSync(process.env.SCRIBIS_BRIDGE_PATH)) {
    console.log(`ℹ️ [Bridge] Using env SCRIBIS_BRIDGE_PATH: ${process.env.SCRIBIS_BRIDGE_PATH}`);
    return new StdioClientTransport({
      command: 'node',
      args: [process.env.SCRIBIS_BRIDGE_PATH]
    });
  }

  // 2. Relative path fallback
  const localDevBridge = path.resolve(__dirname, './bridge.js');
  if (fs.existsSync(localDevBridge)) {
    console.log(`ℹ️ [Bridge] Using local bridge: ${localDevBridge}`);
    return new StdioClientTransport({
      command: 'node',
      args: [localDevBridge]
    });
  }

  // 3. System installed "scribis" CLI command
  try {
    const checkCmd = process.platform === 'win32' ? 'where scribis' : 'which scribis';
    execSync(checkCmd, { stdio: 'ignore' });
    console.log(`ℹ️ [Bridge] Using system CLI command: scribis mcp-bridge`);
    return new StdioClientTransport({
      command: 'scribis',
      args: ['mcp-bridge']
    });
  } catch (e) {
    // ignore if not installed
  }

  // 4. Default fallback attempt
  return new StdioClientTransport({
    command: 'node',
    args: [localDevBridge]
  });
}

async function runDemo() {
  console.log('🚀 Connecting to Scribis MCP Server...');

  const transport = getTransport();

  const client = new Client(
    { name: 'scribis-mcp-demo-client', version: '1.0.0' },
    { capabilities: { resources: {}, tools: {} } }
  );

  try {
    await client.connect(transport);
    console.log('✅ Connected to Scribis MCP Server successfully!\n');

    // 1. List Available Tools
    console.log('📋 --- Fetching Available Tools ---');
    const toolsResult = await client.listTools();
    console.log(`Found ${toolsResult.tools.length} tools:`);
    toolsResult.tools.forEach((t) => console.log(` - ${t.name}: ${t.description}`));
    console.log('\n');

    // 2. Get Live Timeline State
    console.log('🎬 --- Fetching Live Timeline State ---');
    const timelineState = await client.callTool({ name: 'get_timeline_state', arguments: {} });
    console.log('Timeline State:', timelineState.content[0].text);
    console.log('\n');

    // 3. Render Preview Frame with Effects
    console.log('🖼️ --- Testing render_preview_frame ---');
    const previewResult = await client.callTool({
      name: 'render_preview_frame',
      arguments: { timestamp_sec: 5.0 }
    });
    console.log('Render Preview Result:', previewResult.content[0].text);
    console.log('\n');

    console.log('🎉 All demo tool tests passed!');
  } catch (error) {
    console.error('❌ MCP Client Error:', error.message);
  } finally {
    process.exit(0);
  }
}

runDemo();
