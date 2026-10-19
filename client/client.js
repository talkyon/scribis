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
  } catch {
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
    console.log(
      `Avatar create tool registered: ${toolsResult.tools.some((tool) => tool.name === 'create_avatar')}`
    );
    for (const toolName of ['list_llm_models', 'llm_completion']) {
      if (!toolsResult.tools.some((tool) => tool.name === toolName)) {
        throw new Error(`Expected LLM tool is missing: ${toolName}`);
      }
    }
    for (const toolName of [
      'cuts_list_projects',
      'cuts_list_assets',
      'cuts_place_visual',
      'cuts_update_visual',
      'cuts_remove_visual',
      'scenes_list',
      'scenes_get',
      'scenes_create',
      'scenes_edit',
      'scenes_render_frame',
      'scenes_get_motion_guide',
      'scenes_find_motion_templates',
      'app_open_youtube_browser',
      'cuts_open_project',
      'scenes_open',
      'youtube_get_captions',
      'youtube_get_quota',
      'youtube_list_history',
      'cuts_get_avoid_regions',
      'cuts_detect_faces',
      'cuts_search_assets',
      'cuts_import_asset',
      'cuts_place_audio',
      'cuts_update_audio',
      'cuts_remove_audio',
      'cuts_split_block',
      'cuts_merge_blocks',
      'audio_list_sfx_recipes',
      'audio_generate_sfx',
      'audio_list_voices',
      'audio_generate_speech',
      'cuts_get_speech_words',
      'scenes_get_speech_words',
      'audio_get_speech_words',
      'scribis_resolve_ref',
      'audio_measure',
      'cuts_audio_check',
      'scenes_audio_check',
      'cuts_duck_audio',
      'scenes_duck_audio'
    ]) {
      if (!toolsResult.tools.some((tool) => tool.name === toolName)) {
        throw new Error(`Expected Cuts/Scenes tool is missing: ${toolName}`);
      }
    }
    console.log('\n');

    // Cuts and Scenes: read-only checks (no scenes are created and nothing is edited).
    console.log('🎞️ --- Testing Cuts and Scenes tools (read-only) ---');
    const projects = await client.callTool({ name: 'cuts_list_projects', arguments: { limit: 5 } });
    console.log('Cuts projects:', projects.content[0]?.text || '(none)');
    const scenes = await client.callTool({ name: 'scenes_list', arguments: { limit: 5 } });
    if (scenes.isError) {
      throw new Error(scenes.content.map((item) => item.text || '').join('\n'));
    }
    console.log('Scenes:', scenes.content[0]?.text || '(none)');
    // YouTube reads that never spend the free monthly quota (no captions are fetched here).
    const youtubeQuota = await client.callTool({ name: 'youtube_get_quota', arguments: {} });
    console.log('YouTube quota:', youtubeQuota.content[0]?.text || '(none)');
    const youtubeHistory = await client.callTool({
      name: 'youtube_list_history',
      arguments: { limit: 3 }
    });
    console.log('YouTube history:', youtubeHistory.content[0]?.text || '(none)');
    // Rendering a frame is read-only; it composites the newest scene as preview/export would.
    const firstScene = JSON.parse(scenes.content[0]?.text || '{}').scenes?.find(
      (scene) => scene.duration > 0
    );
    if (firstScene) {
      const sceneFrame = await client.callTool({
        name: 'scenes_render_frame',
        arguments: { scene_id: firstScene.scene_id, timestamp_sec: 0, width: 320, return: 'path' }
      });
      console.log('Scene frame:', sceneFrame.content[0]?.text || '(none)');
      // The mix check only reads the scene (and measures its audio files).
      const sceneMix = await client.callTool({
        name: 'scenes_audio_check',
        arguments: { scene_id: firstScene.scene_id }
      });
      if (sceneMix.isError) {
        throw new Error(sceneMix.content.map((item) => item.text || '').join('\n'));
      }
      const sceneReport = JSON.parse(sceneMix.content[0]?.text || '{}');
      console.log(
        `Scene audio check: ${sceneReport.issues?.length ?? 0} issue(s), speech ${sceneReport.speech?.lufs ?? 'unmeasured'} LUFS`
      );
    }
    // Loudness of the first library audio asset (read-only).
    const audioAssets = await client.callTool({
      name: 'cuts_search_assets',
      arguments: { kind: 'audio', limit: 1 }
    });
    const firstAudio = JSON.parse(audioAssets.content[0]?.text || '{}').assets?.[0];
    if (firstAudio) {
      const measured = await client.callTool({
        name: 'audio_measure',
        arguments: { asset_id: firstAudio.asset_id }
      });
      console.log('Audio measure:', measured.content[0]?.text || '(none)');
    }
    const guide = await client.callTool({ name: 'scenes_get_motion_guide', arguments: {} });
    if (guide.isError || !guide.content[0]?.text?.includes('scribis.motion/1')) {
      throw new Error('scenes_get_motion_guide did not return the motion contract');
    }
    const chartStarter = await client.callTool({
      name: 'scenes_get_motion_guide',
      arguments: { starter: 'stat_chart' }
    });
    if (chartStarter.isError || !chartStarter.content[0]?.text?.includes('kit.play')) {
      throw new Error('scenes_get_motion_guide did not return the stat_chart starter');
    }
    console.log('\n');

    // 2. List installed LLM models without starting inference.
    console.log('🧠 --- Testing list_llm_models ---');
    const llmModels = await client.callTool({
      name: 'list_llm_models',
      arguments: { filter: 'installed' }
    });
    if (llmModels.isError) {
      throw new Error(llmModels.content.map((item) => item.text || '').join('\n'));
    }
    console.log('Installed LLM Models:', llmModels.content[0]?.text || '(none)');
    console.log('\n');

    // 3. Get Live Timeline State
    console.log('🎬 --- Fetching Live Timeline State ---');
    const timelineState = await client.callTool({ name: 'get_timeline_state', arguments: {} });
    console.log('Timeline State:', timelineState.content[0].text);
    console.log('\n');

    // 4. Render Preview Frame with Effects
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
    process.exitCode = 1;
  } finally {
    process.exit(process.exitCode ?? 0);
  }
}

runDemo();
