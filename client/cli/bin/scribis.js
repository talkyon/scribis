#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');
const { formatOutput } = require('../lib/output-formatter');
const { runMcpBridge } = require('../lib/proxy');
const { callTool, checkConnectionStatus, getSocketPath, getMcpPort } = require('../lib/mcp-client');
const { createWavHeader } = require('../lib/utils');

const KNOWN_BOOLEAN_FLAGS = new Set(['mcp', 'persist', 'cuda', 'gpu', 'vulkan', 'help', 'h', 'realtime', 'vad']);
const KNOWN_SUBCOMMANDS = new Set(['transcribe', 'stream', 'models', 'status', 'install-cli', 'mcp-bridge', 'help']);

function parseArgs(args) {
  const flags = {};
  const positional = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const parts = arg.slice(2).split('=');
      const key = parts[0];
      let val = parts[1];
      if (val === undefined && !KNOWN_BOOLEAN_FLAGS.has(key) && i + 1 < args.length && !args[i + 1].startsWith('-') && !KNOWN_SUBCOMMANDS.has(args[i + 1])) {
        val = args[++i];
      }
      flags[key] = val !== undefined ? val : true;
    } else if (arg.startsWith('-') && arg.length === 2) {
      const key = arg.slice(1);
      let val;
      if (i + 1 < args.length && !args[i + 1].startsWith('-') && !KNOWN_SUBCOMMANDS.has(args[i + 1])) {
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

Modes:
  stdio (Default):  Communicates via local IPC stdio/socket with running Scribis app.
  MCP (--mcp):      Communicates via MCP HTTP protocol. Requires SCRIBIS_MCP_PORT env var.

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
  --mcp                Use MCP HTTP protocol (requires SCRIBIS_MCP_PORT in env)

Environment Variables:
  SCRIBIS_MCP_PORT     Port for MCP HTTP communication when using MCP mode
  SCRIBIS_SOCKET_PATH  Direct socket path override for stdio communication

Examples:
  scribis transcribe ~/lecture.mp4 --model large-v3 --lang zh --output srt -o lecture.srt
  ffmpeg -re -i audio.wav -ar 16000 -ac 1 -f s16le - | scribis stream --vad --lang zh
  ffmpeg -re -i audio.wav -ar 16000 -ac 1 -f s16le - | scribis stream --realtime --chunk 3
  SCRIBIS_MCP_PORT=8890 scribis transcribe ~/interview.wav --mcp --output json
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
  const isRiff = rawPcmBuffer.length >= 4 && rawPcmBuffer.subarray(0, 4).toString('ascii') === 'RIFF';
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
    console.error(`[scribis-cli] VAD (Voice Activity Detection) streaming enabled (threshold: ${vadThreshold})...`);

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
    console.error(`[scribis-cli] Real-time incremental streaming enabled (chunk size: ${chunkSizeSec}s)...`);

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
  const status = checkConnectionStatus(flags);

  if (status.mode === 'mcp') {
    console.log('Protocol Mode:       MCP (HTTP)');
    if (status.ok) {
      console.log(`MCP Port:            ${status.port}`);
      console.log(`Status:              Configured (HTTP Target: http://127.0.0.1:${status.port}/mcp)`);
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
      console.log(`Default Model:       ${modelsInfo.active_model || 'base'}`);
    } catch (e) {
      console.log(`App Query:           Unable to reach app tool handler (${e.message})`);
    }
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
      console.log(`Ensure '${localBinDir}' is included in your shell PATH (e.g. in ~/.zshrc or ~/.bashrc):`);
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
