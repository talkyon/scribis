---
name: Scribis Transcribe
description: >
  Use the Scribis CLI proxy or MCP server to transcribe audio/video files locally
  via the Scribis application. Supports stdio socket and MCP HTTP interaction,
  batch transcription, real-time streaming, and multiple output formats (JSON/SRT/TXT/VTT).
---

# Scribis Transcribe Skill

This skill allows AI Assistants (Claude Code, Codex CLI, Antigravity, Cursor, etc.) to perform fast, local audio and video transcription using **Scribis**.

Scribis CLI (`scribis`) operates as a lightweight proxy client interacting with the running **Scribis Desktop application** via **stdio** (IPC socket) or **MCP HTTP**:

1. **Stdio Mode (Default)**: Communicates directly with the running Scribis Desktop app over local stdio / IPC socket.
2. **MCP HTTP Mode (`--mcp`)**: Communicates with Scribis application over MCP HTTP protocol. Requires port specified via environment variable `SCRIBIS_MCP_PORT`.

---

## Quick Reference

### 1. Check Status & Connection
Before running transcription tasks, check if the Scribis Desktop app is running and stdio/MCP connection is active:
```bash
# Check default stdio socket status
scribis status

# Check MCP HTTP mode status (requires SCRIBIS_MCP_PORT)
SCRIBIS_MCP_PORT=8890 scribis status --mcp
```

### 2. Batch Transcription
To transcribe an audio or video file into structured subtitles/text:
```bash
scribis transcribe <file_path> [--model base] [--lang auto] [--output srt|json|txt|vtt] [--persist] [-o output_file]
```
Examples:
- Transcribe audio to SRT (via stdio):
  `scribis transcribe ~/audio.mp3 --model large-v3 --lang zh --output srt -o ~/audio.srt`
- Transcribe via MCP HTTP:
  `SCRIBIS_MCP_PORT=8890 scribis transcribe ~/meeting.mp4 --mcp --output json`

### 3. Real-Time Streaming Transcription
To process live audio PCM16 stream (16kHz mono):
```bash
# VAD mode (transcribes sentence-by-sentence on voice pauses)
ffmpeg -re -i input.wav -ar 16000 -ac 1 -f s16le - | scribis stream --vad --lang auto

# Real-time incremental chunk mode (outputs every 3 seconds)
ffmpeg -re -i input.wav -ar 16000 -ac 1 -f s16le - | scribis stream --realtime --chunk 3 --lang auto
```

### 4. List Installed Models
```bash
scribis models
```

---

## Environment Variables

- `SCRIBIS_MCP_PORT`: Target port when using `--mcp` HTTP mode (e.g. `8890`).
- `SCRIBIS_SOCKET_PATH`: Direct Unix domain socket or Windows named pipe override for stdio mode.

---

## Reference Documents

For detailed specs, parameters, and advanced usage, refer to:
- [MCP Tools & Resources Specification](references/mcp-tools-spec.md)
- [Scribis CLI Usage Manual](references/cli-usage.md)
- [Supported ASR Models Reference](references/supported-models.md)
