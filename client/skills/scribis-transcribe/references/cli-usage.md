# Scribis CLI Usage Manual

The `scribis` command-line utility provides a lightweight proxy interface to interact with the running Scribis Desktop application via **stdio** (IPC socket) or **MCP HTTP**.

## Installation

```bash
cd client/cli
npm install
node bin/scribis.js install-cli
```

Ensure `~/.local/bin` (macOS/Linux) or `%LOCALAPPDATA%\Programs\scribis` (Windows) is in your shell PATH.

## Communication Modes

1. **stdio Mode (Default)**:
   Communicates over IPC socket with the running Scribis Desktop app. Requires the app to be running.
2. **MCP HTTP Mode (`--mcp`)**:
   Communicates with Scribis over HTTP JSON-RPC endpoint. Requires setting `SCRIBIS_MCP_PORT` in the environment:
   ```bash
   SCRIBIS_MCP_PORT=8890 scribis transcribe sample.mp4 --mcp
   ```
   If `--mcp` is set without `SCRIBIS_MCP_PORT`, an explicit error message will be returned.

## Commands

### `scribis transcribe <file>`
Transcribes a media file via Scribis application.

**Flags:**
- `--model <name>`: Model to use (e.g. `base`, `small`, `medium`, `large-v3`, `sense-voice-small-q8_0`, `qwen3-asr-0.6b`).
- `--lang <code>`: Language code (`auto`, `zh`, `en`, `ja`, `fr`, `de`, `es`, etc.).
- `--output <format>`: Output format (`json`, `srt`, `txt`, `vtt`). Default: `json`.
- `--persist`: Persist result to Scribis app database.
- `-o, --out <file>`: Output target file path. Defaults to stdout.
- `--mcp`: Use MCP HTTP protocol instead of stdio.

### `scribis stream`
Real-time streaming transcription from stdin.

**Flags:**
- `--vad`: Enable VAD (Voice Activity Detection) mode (transcribes on sentence pauses).
- `--vad-threshold <n>`: VAD energy threshold (default: `500`).
- `--realtime`: Enable real-time incremental output.
- `--chunk <sec>`: Chunk size in seconds for real-time incremental output (default: `3`).
- `--model <name>`: Model to use. Default: `base`.
- `--lang <code>`: Language code. Default: `auto`.
- `--output <format>`: Output format (`json`, `txt`, `srt`, `vtt`). Default: `json`.
- `--mcp`: Use MCP HTTP protocol instead of stdio.

**Input Format:** Raw PCM 16-bit signed integer, 16000 Hz, mono.

### `scribis models`
Lists all supported ASR models, installed models, and active default model.

### `scribis status`
Displays connection status, communication mode (stdio / MCP HTTP), socket path or MCP HTTP target, and app status.

### `scribis mcp-bridge`
Runs the stdio MCP bridge for connecting AI Hosts (Claude Code, Cursor, Codex, etc.) to the running Scribis Desktop app.
