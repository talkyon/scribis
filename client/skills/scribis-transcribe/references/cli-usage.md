# Scribis CLI Usage Manual

The `scribis` command-line utility provides a lightweight proxy interface to interact with the running Scribis Desktop application via **stdio** (IPC socket) or **MCP HTTP**.

## Installation

The CLI ships in the public `scribis-mcp-client` repository (the folder that also holds
these skills and `bridge.js`); it is not installed with the Scribis app.

```bash
cd /path/to/scribis-mcp-client/cli
npm install
node bin/scribis.js install-cli
```

Ensure `~/.local/bin` (macOS/Linux) or `%LOCALAPPDATA%\Programs\scribis` (Windows) is in your shell PATH. Without the shim, run every command as `node /path/to/scribis-mcp-client/cli/bin/scribis.js <command>`. On Windows a bare `scribis` may resolve to the desktop app's own executable when the shim folder is not on PATH; the file form avoids that.

Exit codes: every command exits 0 on success and 1 on failure (`status` exits 1 when Scribis is not reachable or does not answer a tool call), so scripts and agents can gate on it.

## Communication Modes

1. **stdio Mode (Default)**:
   Communicates over IPC socket with the running Scribis Desktop app. Requires the app to be running.
2. **MCP HTTP Mode (`--mcp`)**:
   Communicates with Scribis over its localhost HTTP JSON-RPC endpoint. The CLI uses the port the
   running app publishes in `discovery.json`; set `SCRIBIS_MCP_PORT` to override it with the port
   shown in Settings → MCP (default 8890):
   ```bash
   scribis transcribe sample.mp4 --mcp
   SCRIBIS_MCP_PORT=<port> scribis transcribe sample.mp4 --mcp
   ```
   If `--mcp` is set and no port is found (no `SCRIBIS_MCP_PORT`, and the app has not published one),
   an explicit error message will be returned.
   The HTTP endpoint needs no token; it only accepts local connections. Requests from
   other websites, and requests whose `Host` is not `127.0.0.1`/`localhost`/`[::1]` on the active port, are rejected.

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
Displays connection status, communication mode (stdio / MCP HTTP), socket path or MCP HTTP target, and app status. In stdio mode it reports Connected only when the process recorded in `discovery.json` is running and its socket accepts connections; otherwise it reports a stale discovery file (restart Scribis or toggle the MCP server in Settings, or set `SCRIBIS_SOCKET_PATH`). On macOS the CLI looks for `discovery.json` in Application Support, then in the Mac App Store app group container, then in the MAS app container. If Scribis reports `stdio socket is unavailable`, use `--mcp` instead (the message names the port the app is listening on).

### `scribis open <target> [id|url]`
Brings the Scribis window to the front and opens a page (same as the `app_open_youtube_browser`, `cuts_open_project` and `scenes_open` MCP tools). Refuses while another Cuts or scene editor is open.

- `scribis open youtube [url]`: YouTube AI browser; with a YouTube URL (`watch`, `shorts`, `embed`, `live`, `youtu.be`) or 11-character video ID it loads that video.
- `scribis open cuts <project_id>`: Cuts project in the timeline editor (the copy button next to **Open editor** in Cuts → Recent edits copies `/scribis-edit cuts <id>`; the last word is the ID).
- `scribis open scene <scene_id>`: scene in the scene editor (the copy button next to **Open** in Cuts → Scenes copies `/scribis-edit scene <id>`).
- `--output json`: also print the full tool result. `--mcp`: use MCP HTTP.

### `scribis youtube <action>`
YouTube captions and quota (same as the `youtube_get_captions`, `youtube_get_quota` and `youtube_list_history` MCP tools). Free accounts may use 10 new YouTube videos per month (shared with the YouTube AI browser; saved history videos are free); past the limit the command fails with `YOUTUBE_MONTHLY_LIMIT_REACHED`.

- `scribis youtube captions <url> [--lang <code>] [--output text|srt|json] [-o file]`: all caption pages of the video; `text` prints `[m:ss] text` lines. The source, language and quota go to stderr.
- `scribis youtube quota`: new videos used and left this month (Pro: unlimited).
- `scribis youtube history [query]`: saved videos (`video_id`, whether captions are saved, title).

### `scribis mcp-bridge`
Runs the stdio MCP bridge for connecting AI Hosts (Claude Code, Cursor, Codex, etc.) to the running Scribis Desktop app. Register it in the host's MCP configuration, for example:

```json
{
  "mcpServers": {
    "scribis": { "command": "scribis", "args": ["mcp-bridge"] }
  }
}
```

or, without the PATH shim, `"command": "node", "args": ["/path/to/scribis-mcp-client/bridge.js"]`. Hosts that take a URL instead (Codex `config.toml`, Cursor, Antigravity) can use the localhost HTTP endpoint shown in Scribis Settings → MCP, where ready-made snippets for each host can be copied.
