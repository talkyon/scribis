---
name: scribis-transcribe
description: >
  Use this skill whenever the user wants to transcribe audio or video, generate
  subtitles/captions, convert speech to text, do live/real-time transcription,
  or work with the Scribis desktop app's timeline, subtitles, TTS, or preview
  frames — even if they don't say "Scribis" explicitly (e.g. "把這段錄音轉成逐字稿",
  "幫我加字幕", "transcribe this meeting recording", "generate an SRT for this video").
  Covers both the `scribis` CLI proxy and the Scribis MCP server/tools.
---

# Scribis Transcribe Skill

This skill lets AI assistants (Claude Code, Codex CLI, Antigravity, Cursor, etc.)
perform fast, local audio/video transcription — and related editing/TTS/preview
tasks — through **Scribis**, a desktop app that must already be running.

## Step 0: Decide how to talk to Scribis

There are two independent ways to reach Scribis. Pick based on what's actually
available to you right now — don't mix them for the same task, since the CLI
and the MCP tools can end up with an inconsistent view of app state (e.g. one
side edits the timeline without the other knowing).

1. **Native MCP tools** (`transcribe_audio`, `list_models`, `get_timeline_state`,
   `update_subtitle`, etc.) — if these already appear in your tool list, use them
   directly. This is the preferred path: no shell process, no parsing stdout,
   and you get structured JSON back.
2. **`scribis` CLI proxy** — use this when the MCP tools aren't registered as
   native tools, but you still have shell access. It talks to Scribis over the
   same stdio socket, or over MCP HTTP if you pass `--mcp` (requires
   `SCRIBIS_MCP_PORT`).

If neither is available, tell the user Scribis doesn't appear to be reachable
and ask them to open the Scribis Desktop app (or, for MCP HTTP, confirm the
port).

---

## Quick Reference (CLI path)

### 1. Check connection before doing anything else
```bash
scribis status
# or, for MCP HTTP mode:
SCRIBIS_MCP_PORT=8890 scribis status --mcp
```
If this reports the app isn't connected, stop and tell the user to launch
Scribis Desktop (and, for `--mcp`, confirm `SCRIBIS_MCP_PORT` matches the port
shown inside the app) — retrying the same command won't help.

### 2. Confirm the model you want is actually installed
Not every model listed in the models reference is installed by default (see
`references/supported-models.md`). Run `scribis models` first if you're about
to request anything other than the active default model, so you can tell the
user upfront if it needs to be downloaded rather than let `transcribe` fail
partway through:
```bash
scribis models
```

### 3. Batch transcription
```bash
scribis transcribe <file_path> [--model base] [--lang auto] [--output srt|json|txt|vtt] [--persist] [-o output_file]
```
Examples:
- Transcribe to SRT via stdio:
  `scribis transcribe ~/audio.mp3 --model large-v3 --lang zh --output srt -o ~/audio.srt`
- Transcribe via MCP HTTP:
  `SCRIBIS_MCP_PORT=8890 scribis transcribe ~/meeting.mp4 --mcp --output json`

Only pass `--persist` when the file is part of a project the user is actively
editing inside Scribis (it saves the transcript into the app's database). If
the user just wants a transcript/subtitle file to keep or hand off elsewhere,
skip it — there's nothing to clean up later that way.

### 4. Real-time streaming transcription
For live PCM16 audio (16kHz mono):
```bash
# VAD mode: transcribes sentence-by-sentence on voice pauses
ffmpeg -re -i input.wav -ar 16000 -ac 1 -f s16le - | scribis stream --vad --lang auto

# Real-time incremental mode: emits partial output every N seconds
ffmpeg -re -i input.wav -ar 16000 -ac 1 -f s16le - | scribis stream --realtime --chunk 3 --lang auto
```
Use `--vad` when the user cares about clean sentence boundaries (e.g. subtitles);
use `--realtime` when they want to see text as it's spoken, even if it means
mid-sentence updates.

### 5. List installed models
```bash
scribis models
```

---

## Quick Reference (MCP tools path)

When `transcribe_audio`, `list_models`, `get_all_subtitles`, etc. are directly
available as tools, call them instead of shelling out. Full argument list and
descriptions are in `references/mcp-tools-spec.md` — notably:
- `transcribe_audio` accepts either a file path or base64 audio data, so you
  don't need the file to exist on disk from Scribis's perspective.
- Timeline/subtitle tools (`get_timeline_state`, `add_timeline_block`,
  `update_subtitle`, `batch_correct_subtitles`) let you go beyond plain
  transcription into actually editing the open project — reach for these when
  the user's ask is about fixing or building out a project, not just getting
  a transcript.
- Pass `auto=false` on subtitle edits when the change is subjective or the
  user hasn't explicitly approved it, so it lands in Scribis's UI review queue
  instead of applying silently.

---

## Environment Variables

- `SCRIBIS_MCP_PORT`: Target port when using `--mcp` HTTP mode (e.g. `8890`).
- `SCRIBIS_SOCKET_PATH`: Direct Unix domain socket or Windows named pipe override for stdio mode.

---

## Reference Documents

For detailed specs, parameters, and advanced usage, refer to:
- [MCP Tools & Resources Specification](references/mcp-tools-spec.md) — full tool/resource list for the native MCP path.
- [Scribis CLI Usage Manual](references/cli-usage.md) — full flag reference for the CLI path, including `scribis mcp-bridge`.
- [Supported ASR Models Reference](references/supported-models.md) — model families, install state, and how to query them.
