#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');
const { formatOutput } = require('../lib/output-formatter');
const { runMcpBridge } = require('../lib/proxy');
const { callTool, checkConnectionStatus } = require('../lib/mcp-client');
const { createWavHeader } = require('../lib/utils');

const KNOWN_BOOLEAN_FLAGS = new Set([
  'mcp',
  'persist',
  'cuda',
  'gpu',
  'vulkan',
  'help',
  'h',
  'realtime',
  'vad'
]);
const KNOWN_SUBCOMMANDS = new Set([
  'transcribe',
  'stream',
  'models',
  'status',
  'install-cli',
  'mcp-bridge',
  'open',
  'youtube',
  'help'
]);

function parseArgs(args) {
  const flags = {};
  const positional = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const parts = arg.slice(2).split('=');
      const key = parts[0];
      let val = parts[1];
      if (
        val === undefined &&
        !KNOWN_BOOLEAN_FLAGS.has(key) &&
        i + 1 < args.length &&
        !args[i + 1].startsWith('-') &&
        !KNOWN_SUBCOMMANDS.has(args[i + 1])
      ) {
        val = args[++i];
      }
      flags[key] = val !== undefined ? val : true;
    } else if (arg.startsWith('-') && arg.length === 2) {
      const key = arg.slice(1);
      let val;
      if (
        i + 1 < args.length &&
        !args[i + 1].startsWith('-') &&
        !KNOWN_SUBCOMMANDS.has(args[i + 1])
      ) {
        val = args[++i];
      }
      flags[key] = val !== undefined ? val : true;
    } else {
      positional.push(arg);
    }
  }
  return { flags, positional };
}

function showHelp() {
  console.log(`
Scribis CLI — Audio & Video Transcription Proxy Client

Usage:
  scribis transcribe <file> [options]    Transcribe audio/video via Scribis app (stdio / mcp)
  scribis stream [options]               Real-time stream transcription from stdin
  scribis models                         List available & installed ASR models
  scribis status                         Show stdio / MCP connection and app status
  scribis install-cli                    Install scribis executable wrapper into system PATH
  scribis mcp-bridge                     Run stdio MCP bridge (proxies stdio ↔ socket to Scribis app)
  scribis open youtube [url]             Open the YouTube AI browser (and load a YouTube URL or video ID)
  scribis open cuts <project_id>         Open a Cuts project in the timeline editor
  scribis open scene <scene_id>          Open a scene in the scene editor
  scribis youtube captions <url>         Print a YouTube video's captions (--lang, --output text|srt|json, -o)
  scribis youtube quota                  Show this month's YouTube video quota (free: 10 new videos)
  scribis youtube history [query]        List videos in the Scribis YouTube history (free to reopen)

Modes:
  stdio (Default):  Communicates via local IPC stdio/socket with running Scribis app.
  MCP (--mcp):      Communicates via MCP HTTP protocol on the port the running app publishes
                    (or SCRIBIS_MCP_PORT).

Options for transcribe / stream:
  --model <name>       Whisper / ASR model name (e.g. base, small, medium, large-v3, sense-voice-small-q8_0, qwen3-asr-0.6b)
  --lang <code>        Language code (e.g. auto, zh, en, ja, fr)
  --output <format>    Output format: json, srt, txt, vtt (default: json)
  --persist            Persist transcription result into Scribis app project database
  -o, --out <file>     Write output to file instead of stdout
  --realtime           Enable real-time incremental stream transcription output
  --chunk <sec>        Chunk size in seconds for real-time incremental output (default: 3)
  --vad                Enable VAD (Voice Activity Detection) mode (transcribe on sentence pauses)
  --vad-threshold <n>  VAD energy threshold (default: 500)
  --mcp                Use MCP HTTP protocol (port from SCRIBIS_MCP_PORT or the running app)

Environment Variables:
  SCRIBIS_MCP_PORT     MCP HTTP port override: the port shown in Settings -> MCP (default 8890)
  SCRIBIS_SOCKET_PATH  Direct socket path override for stdio communication

Examples:
  scribis transcribe ~/lecture.mp4 --model large-v3 --lang zh --output srt -o lecture.srt
  ffmpeg -re -i audio.wav -ar 16000 -ac 1 -f s16le - | scribis stream --vad --lang zh
  ffmpeg -re -i audio.wav -ar 16000 -ac 1 -f s16le - | scribis stream --realtime --chunk 3
  scribis transcribe ~/interview.wav --mcp --output json
  scribis open youtube https://youtu.be/dQw4w9WgXcQ
  scribis youtube captions https://youtu.be/dQw4w9WgXcQ --lang en --output srt -o talk.srt
`);
}

async function handleTranscribe(positional, flags) {
  const inputArg = positional[1];
  if (!inputArg) {
    console.error('Error: Missing input file path. Usage: scribis transcribe <file_path>');
    process.exit(1);
  }

  const filePath = path.resolve(process.cwd(), inputArg);
  if (!fs.existsSync(filePath)) {
    console.error(`Error: File not found at path: ${filePath}`);
    process.exit(1);
  }

  const format = flags.output || flags.f || 'json';
  const outPath = flags.out || flags.o;

  console.error(`[scribis-cli] Requesting transcription for file: ${filePath}`);
  if (flags.model) console.error(`[scribis-cli] Model override: ${flags.model}`);
  if (flags.lang) console.error(`[scribis-cli] Language override: ${flags.lang}`);

  try {
    const toolArgs = {
      path: filePath,
      model: flags.model,
      lang: flags.lang || 'auto',
      persist: Boolean(flags.persist)
    };

    const result = await callTool('transcribe_audio', toolArgs, flags);
    const outputText = formatOutput(result, format);

    if (outPath) {
      const resolvedOut = path.resolve(process.cwd(), outPath);
      fs.writeFileSync(resolvedOut, outputText, 'utf8');
      console.error(`[scribis-cli] Transcript saved to: ${resolvedOut}`);
    } else {
      process.stdout.write(outputText + '\n');
    }
  } catch (err) {
    console.error(`[scribis-cli] Transcription failed: ${err.message}`);
    process.exit(1);
  }
}

async function processAndOutputChunk(rawPcmBuffer, timeOffsetSec, chunkIdx, flags) {
  if (!rawPcmBuffer || rawPcmBuffer.length === 0) return;
  const isRiff =
    rawPcmBuffer.length >= 4 && rawPcmBuffer.subarray(0, 4).toString('ascii') === 'RIFF';
  let wavBuffer = rawPcmBuffer;
  if (!isRiff) {
    const header = createWavHeader(rawPcmBuffer.length, 16000, 1, 16);
    wavBuffer = Buffer.concat([header, rawPcmBuffer]);
  }
  const base64Data = wavBuffer.toString('base64');
  const toolArgs = {
    audio_data: base64Data,
    format: 'wav',
    model: flags.model,
    lang: flags.lang || 'auto'
  };

  try {
    const result = await callTool('transcribe_audio', toolArgs, flags);
    const format = (flags.output || flags.f || 'txt').toLowerCase();
    const text = (result?.text || '').trim();

    if (text) {
      if (format === 'json') {
        const outputObj = {
          chunk: chunkIdx,
          start: timeOffsetSec,
          text,
          segments: (result.segments || result.subtitles || []).map((s) => ({
            start: (s.start || 0) + timeOffsetSec,
            end: (s.end || 0) + timeOffsetSec,
            text: s.text
          }))
        };
        process.stdout.write(JSON.stringify(outputObj) + '\n');
      } else {
        const startFormatted = timeOffsetSec.toFixed(2);
        console.log(`[${startFormatted}s] ${text}`);
      }
    }
  } catch (err) {
    console.error(`[scribis-cli] Chunk ${chunkIdx} transcription error: ${err.message}`);
  }
}

async function handleStream(flags) {
  console.error('[scribis-cli] Reading audio stream from stdin (PCM16 16kHz mono)...');

  const isVad = Boolean(flags.vad);
  const rawChunkFlag = flags.chunk || flags.interval;
  const isRealtime = Boolean(flags.realtime) || rawChunkFlag !== undefined;
  const chunkSizeSec = parseFloat(rawChunkFlag) > 0 ? parseFloat(rawChunkFlag) : 3;

  if (isVad) {
    const vadThreshold = parseFloat(flags['vad-threshold'] || flags.threshold) || 500;
    console.error(
      `[scribis-cli] VAD (Voice Activity Detection) streaming enabled (threshold: ${vadThreshold})...`
    );

    const FRAME_SAMPLES = 512;
    const FRAME_BYTES = FRAME_SAMPLES * 2;
    const MIN_SILENCE_FRAMES = 18; // ~576ms silence to trigger speech segment
    const MAX_SPEECH_BYTES = 16000 * 2 * 15; // Max 15s continuous speech

    let accumPCM = Buffer.alloc(0);
    let speechBuffer = Buffer.alloc(0);

    let isSpeaking = false;
    let silenceFrameCount = 0;
    let totalTimeOffsetSec = 0;
    let chunkIdx = 1;

    const chunkQueue = [];
    let isProcessing = false;

    async function drainQueue() {
      if (isProcessing) return;
      isProcessing = true;
      while (chunkQueue.length > 0) {
        const item = chunkQueue.shift();
        await processAndOutputChunk(item.buffer, item.timeOffset, item.chunkIdx, flags);
      }
      isProcessing = false;
    }

    process.stdin.on('data', (chunk) => {
      accumPCM = Buffer.concat([accumPCM, chunk]);

      while (accumPCM.length >= FRAME_BYTES) {
        const frameBuf = accumPCM.subarray(0, FRAME_BYTES);
        accumPCM = accumPCM.subarray(FRAME_BYTES);

        const int16Array = new Int16Array(frameBuf.buffer, frameBuf.byteOffset, FRAME_SAMPLES);
        let sumSquare = 0;
        for (let i = 0; i < int16Array.length; i++) {
          sumSquare += int16Array[i] * int16Array[i];
        }
        const energy = Math.sqrt(sumSquare / int16Array.length);

        if (energy >= vadThreshold) {
          isSpeaking = true;
          silenceFrameCount = 0;
          speechBuffer = Buffer.concat([speechBuffer, frameBuf]);

          if (speechBuffer.length >= MAX_SPEECH_BYTES) {
            chunkQueue.push({
              buffer: speechBuffer,
              timeOffset: totalTimeOffsetSec,
              chunkIdx: chunkIdx++
            });
            totalTimeOffsetSec += speechBuffer.length / (16000 * 2);
            speechBuffer = Buffer.alloc(0);
            isSpeaking = false;
          }
        } else if (isSpeaking) {
          silenceFrameCount++;
          speechBuffer = Buffer.concat([speechBuffer, frameBuf]);

          if (silenceFrameCount >= MIN_SILENCE_FRAMES) {
            if (speechBuffer.length >= 16000 * 2 * 0.4) {
              chunkQueue.push({
                buffer: speechBuffer,
                timeOffset: totalTimeOffsetSec,
                chunkIdx: chunkIdx++
              });
              totalTimeOffsetSec += speechBuffer.length / (16000 * 2);
            }
            speechBuffer = Buffer.alloc(0);
            isSpeaking = false;
            silenceFrameCount = 0;
            drainQueue();
          }
        } else {
          totalTimeOffsetSec += 0.032;
        }
      }
      drainQueue();
    });

    process.stdin.on('end', async () => {
      if (speechBuffer.length >= 16000 * 2 * 0.3) {
        chunkQueue.push({
          buffer: speechBuffer,
          timeOffset: totalTimeOffsetSec,
          chunkIdx: chunkIdx++
        });
      }
      await drainQueue();
    });
  } else if (isRealtime) {
    console.error(
      `[scribis-cli] Real-time incremental streaming enabled (chunk size: ${chunkSizeSec}s)...`
    );

    const bytesPerSec = 16000 * 2;
    const targetChunkBytes = Math.floor(chunkSizeSec * bytesPerSec);

    let accumBuffer = Buffer.alloc(0);
    let totalTimeOffsetSec = 0;
    let chunkIdx = 1;

    const chunkQueue = [];
    let isProcessing = false;

    async function drainQueue() {
      if (isProcessing) return;
      isProcessing = true;
      while (chunkQueue.length > 0) {
        const item = chunkQueue.shift();
        await processAndOutputChunk(item.buffer, item.timeOffset, item.chunkIdx, flags);
      }
      isProcessing = false;
    }

    process.stdin.on('data', (chunk) => {
      accumBuffer = Buffer.concat([accumBuffer, chunk]);

      while (accumBuffer.length >= targetChunkBytes) {
        const audioChunk = accumBuffer.subarray(0, targetChunkBytes);
        accumBuffer = accumBuffer.subarray(targetChunkBytes);

        chunkQueue.push({
          buffer: audioChunk,
          timeOffset: totalTimeOffsetSec,
          chunkIdx: chunkIdx++
        });
        totalTimeOffsetSec += chunkSizeSec;
      }
      drainQueue();
    });

    process.stdin.on('end', async () => {
      if (accumBuffer.length > 0) {
        chunkQueue.push({
          buffer: accumBuffer,
          timeOffset: totalTimeOffsetSec,
          chunkIdx: chunkIdx++
        });
      }
      await drainQueue();
    });
  } else {
    const chunks = [];
    process.stdin.on('data', (chunk) => {
      chunks.push(chunk);
    });

    process.stdin.on('end', async () => {
      try {
        let buffer = Buffer.concat(chunks);
        if (buffer.length === 0) {
          console.error('Error: No audio data received on stdin.');
          process.exit(1);
        }

        const isRiff = buffer.length >= 4 && buffer.subarray(0, 4).toString('ascii') === 'RIFF';
        if (!isRiff) {
          const header = createWavHeader(buffer.length, 16000, 1, 16);
          buffer = Buffer.concat([header, buffer]);
        }

        const base64Data = buffer.toString('base64');
        const toolArgs = {
          audio_data: base64Data,
          format: 'wav',
          model: flags.model,
          lang: flags.lang || 'auto'
        };

        const result = await callTool('transcribe_audio', toolArgs, flags);
        const format = flags.output || flags.f || 'json';
        const outputText = formatOutput(result, format);
        process.stdout.write(outputText + '\n');
      } catch (err) {
        console.error(`[scribis-cli] Stream transcription failed: ${err.message}`);
        process.exit(1);
      }
    });
  }
}

async function handleModels(flags) {
  try {
    const result = await callTool('list_models', {}, flags);

    console.log('=== Scribis ASR Models ===');
    console.log(`Active Default Model: ${result.active_model || 'base'}`);
    console.log(`Models Directory:     ${result.models_dir || 'N/A'}\n`);
    console.log('Installed Models:');

    if (Array.isArray(result.models)) {
      result.models.forEach((m) => {
        const id = m.id || m.name;
        const installed = m.installed ? '[Installed]' : '[Not Installed]';
        const active = m.active ? '(Active Default)' : '';
        console.log(` - ${id.padEnd(25)} ${installed} ${active}`);
      });
    } else {
      console.log(JSON.stringify(result, null, 2));
    }
  } catch (err) {
    console.error(`[scribis-cli] Failed to fetch models: ${err.message}`);
    process.exit(1);
  }
}

async function handleStatus(flags) {
  console.log('=== Scribis CLI Status ===');
  const status = await checkConnectionStatus(flags);

  if (status.mode === 'mcp') {
    console.log('Protocol Mode:       MCP (HTTP)');
    if (status.ok) {
      console.log(
        `MCP Port:            ${status.port}${status.portSource === 'discovery' ? ' (from discovery.json)' : ''}`
      );
      console.log(
        `Status:              Configured (HTTP Target: http://127.0.0.1:${status.port}/mcp)`
      );
    } else {
      console.log(`Status:              ❌ Error — ${status.error}`);
    }
  } else {
    console.log('Protocol Mode:       stdio (Socket IPC)');
    if (status.ok) {
      console.log(`Socket Path:         ${status.socketPath}`);
      console.log(`App Process (PID):   ${status.pid || 'Running'}`);
      console.log('Status:              ✅ Connected to Scribis stdio socket');
    } else {
      console.log(`Status:              ❌ Error — ${status.error}`);
    }
  }

  if (status.ok) {
    try {
      const modelsInfo = await callTool('list_models', {}, flags);
      // In HTTP mode the configured target is only proven once the app answers a tool call.
      if (status.mode === 'mcp')
        console.log('App Query:           ✅ Connected to Scribis over MCP HTTP');
      console.log(`Default Model:       ${modelsInfo.active_model || 'base'}`);
    } catch (e) {
      console.log(`App Query:           ❌ Unable to reach app tool handler (${e.message})`);
      process.exitCode = 1;
    }
  } else {
    // Scripts and agents gate on the exit code; the printed error explains what to do.
    process.exitCode = 1;
  }
}

function handleInstallCli() {
  const cliBinPath = path.resolve(__dirname, 'scribis.js');
  const platform = os.platform();

  if (platform === 'darwin' || platform === 'linux') {
    const localBinDir = path.join(os.homedir(), '.local', 'bin');
    if (!fs.existsSync(localBinDir)) {
      fs.mkdirSync(localBinDir, { recursive: true });
    }
    const targetLink = path.join(localBinDir, 'scribis');
    try {
      if (fs.existsSync(targetLink)) {
        fs.unlinkSync(targetLink);
      }
      fs.symlinkSync(cliBinPath, targetLink);
      fs.chmodSync(cliBinPath, '755');
      fs.chmodSync(targetLink, '755');
      console.log(`✅ Successfully installed symlink at: ${targetLink}`);
      console.log(
        `Ensure '${localBinDir}' is included in your shell PATH (e.g. in ~/.zshrc or ~/.bashrc):`
      );
      console.log(`  export PATH="$HOME/.local/bin:$PATH"`);
    } catch (err) {
      console.error(`❌ Failed to create symlink: ${err.message}`);
    }
  } else if (platform === 'win32') {
    const localBinDir = path.join(process.env.LOCALAPPDATA || os.homedir(), 'Programs', 'scribis');
    if (!fs.existsSync(localBinDir)) {
      fs.mkdirSync(localBinDir, { recursive: true });
    }
    const cmdPath = path.join(localBinDir, 'scribis.cmd');
    const cmdContent = `@echo off\r\nnode "${cliBinPath}" %*\r\n`;
    try {
      fs.writeFileSync(cmdPath, cmdContent, 'utf8');
      console.log(`✅ Successfully created batch wrapper at: ${cmdPath}`);
      console.log(`Add '${localBinDir}' to your Windows User PATH environment variable.`);
    } catch (err) {
      console.error(`❌ Failed to create batch wrapper: ${err.message}`);
    }
  }
}

const OPEN_TARGETS = {
  youtube: { tool: 'app_open_youtube_browser', key: 'url', required: false },
  cuts: { tool: 'cuts_open_project', key: 'project_id', required: true },
  scene: { tool: 'scenes_open', key: 'scene_id', required: true }
};

async function handleOpen(positional, flags) {
  const target = OPEN_TARGETS[positional[1]];
  const value = positional[2];
  if (!target || (target.required && !value)) {
    console.error(
      'Usage: scribis open youtube [url] | scribis open cuts <project_id> | scribis open scene <scene_id>'
    );
    process.exit(1);
  }
  try {
    const result = await callTool(target.tool, value ? { [target.key]: value } : {}, flags);
    if (!result || result.success === false) {
      console.error(`[scribis-cli] ${result?.error || 'Scribis could not open the page'}`);
      process.exit(1);
    }
    console.log(result.message || result.status || 'Opened');
    if (flags.output === 'json') console.log(JSON.stringify(result, null, 2));
  } catch (err) {
    console.error(`[scribis-cli] Failed to open the page: ${err.message}`);
    process.exit(1);
  }
}

const YOUTUBE_PAGE_SIZE = 2000;

function clock(seconds) {
  const whole = Math.max(0, Math.floor(seconds));
  const h = Math.floor(whole / 3600);
  const m = Math.floor((whole % 3600) / 60);
  const s = String(whole % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}

function srtTime(seconds) {
  const ms = Math.max(0, Math.round(seconds * 1000));
  const pad = (value, width = 2) => String(value).padStart(width, '0');
  return `${pad(Math.floor(ms / 3600000))}:${pad(Math.floor((ms % 3600000) / 60000))}:${pad(
    Math.floor((ms % 60000) / 1000)
  )},${pad(ms % 1000, 3)}`;
}

function quotaLine(quota) {
  if (!quota) return '';
  return quota.is_pro
    ? 'YouTube quota: Scribis Pro (unlimited)'
    : `YouTube quota: ${quota.used}/${quota.limit} new videos used this month, ${quota.remaining} left`;
}

async function handleYouTube(positional, flags) {
  const action = positional[1];
  const fail = (message) => {
    console.error(`[scribis-cli] ${message}`);
    process.exit(1);
  };
  try {
    if (action === 'quota') {
      const result = await callTool('youtube_get_quota', {}, flags);
      if (!result || result.success === false)
        fail(result?.error || 'Scribis could not read the quota');
      if (flags.output === 'json') console.log(JSON.stringify(result, null, 2));
      else console.log(result.message || quotaLine(result));
      return;
    }
    if (action === 'history') {
      const args = { limit: 50 };
      if (positional[2]) args.query = positional.slice(2).join(' ');
      const result = await callTool('youtube_list_history', args, flags);
      if (!result || result.success === false)
        fail(result?.error || 'Scribis could not read the history');
      if (flags.output === 'json') return console.log(JSON.stringify(result, null, 2));
      for (const video of result.videos || [])
        console.log(
          `${video.video_id}  ${video.has_captions ? 'captions' : '        '}  ${video.title || video.url}`
        );
      return;
    }
    if (action !== 'captions' || !positional[2]) {
      fail(
        'Usage: scribis youtube captions <url> [--lang <code>] [--output text|srt|json] [-o file] | scribis youtube quota | scribis youtube history [query]'
      );
    }
    const format = flags.output || 'text';
    if (!['text', 'srt', 'json'].includes(format)) fail('--output must be text, srt or json');
    const cues = [];
    let first;
    let offset = 0;
    for (;;) {
      const args = { url: positional[2], format: 'cues', offset, limit: YOUTUBE_PAGE_SIZE };
      if (typeof flags.lang === 'string') args.lang = flags.lang;
      const page = await callTool('youtube_get_captions', args, flags);
      if (!page || page.success === false) {
        const quota = page?.quota ? `\n${quotaLine(page.quota)}` : '';
        fail(`${page?.error || 'Scribis could not read the captions'}${quota}`);
      }
      first = first || page;
      cues.push(...(page.cues || []));
      if (page.next_offset === undefined || page.next_offset === null) break;
      offset = page.next_offset;
    }
    let output;
    if (format === 'json') {
      const meta = { ...first };
      for (const key of ['cues', 'next_offset', 'offset', 'returned', 'next']) delete meta[key];
      output = JSON.stringify({ ...meta, cues }, null, 2);
    } else if (format === 'srt') {
      output = cues
        .map(
          (cue, index) =>
            `${index + 1}\n${srtTime(cue.start)} --> ${srtTime(cue.end)}\n${cue.text}\n`
        )
        .join('\n');
    } else {
      output = cues
        .map((cue) => `[${clock(cue.start)}] ${cue.text.replace(/\s+/g, ' ')}`)
        .join('\n');
    }
    const outFile = flags.o || flags.out;
    if (typeof outFile === 'string') {
      fs.writeFileSync(path.resolve(outFile), output + '\n', 'utf8');
      console.error(`[scribis-cli] Wrote ${cues.length} cues to ${path.resolve(outFile)}`);
    } else {
      console.log(output);
    }
    console.error(
      `[scribis-cli] ${first.title || first.video_id} · ${first.language} · ${
        first.source === 'history' ? 'from the YouTube history (free)' : 'fetched from YouTube'
      }${first.charged ? ' (used 1 monthly load)' : ''}. ${quotaLine(first.quota)}`
    );
  } catch (err) {
    fail(`YouTube command failed: ${err.message}`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    showHelp();
    process.exit(0);
  }

  const { flags, positional } = parseArgs(args);
  const command = positional[0];

  switch (command) {
    case 'transcribe':
      await handleTranscribe(positional, flags);
      break;

    case 'stream':
      await handleStream(flags);
      break;

    case 'models':
      await handleModels(flags);
      break;

    case 'status':
      await handleStatus(flags);
      break;

    case 'install-cli':
      handleInstallCli();
      break;

    case 'mcp-bridge':
      runMcpBridge();
      break;

    case 'open':
      await handleOpen(positional, flags);
      break;

    case 'youtube':
      await handleYouTube(positional, flags);
      break;

    case 'help':
    case '-h':
    case '--help':
      showHelp();
      break;

    default:
      console.error(`Unknown command: ${command}`);
      showHelp();
      process.exit(1);
  }
}

main();
