# Scribis MCP Client & AI Agent Skills (`talkyon/scribis-mcp-client`)

[English](README.md) | [繁體中文](README-zh.md)

Official Model Context Protocol (MCP) Client, Web Test Console, and AI Agent Skills for [Scribis](https://github.com/talkyon/scribis).

This repository provides everything needed to connect AI assistants and MCP hosts, including Claude Code, Cursor, Codex CLI, Google Antigravity IDE, Windsurf, and other MCP-compatible applications. to a running instance of **Scribis** for fast, local audio transcription, timeline video editing, subtitle correction, and TTS speech synthesis.

---

## 📦 Repository Contents

- **`skills/scribis-transcribe/`**: Production-ready Agent Skill definition (`SKILL.md` + specifications) for AI Agents to automatically discover and use Scribis.
- **`bridge.js`**: Standalone stdio ↔ socket proxy script for AI Hosts (e.g. Claude Code, Cursor) to connect to a running Scribis instance over stdio.
- **`client.js`**: Node.js demo client using `@modelcontextprotocol/sdk` to test MCP tools and resources.
- **`index.html`**: Interactive Web UI test suite for browser-based MCP verification.

---

## 🚀 Quick Start for AI Agents

### Option 1: Using the Included AI Agent Skill

Copy or reference `skills/scribis-transcribe` in your AI Agent's skill configuration (e.g. `skills.json`):

```json
{
  "entries": [{ "path": "path/to/scribis-mcp-client/skills" }]
}
```

### Option 2: Configuring Scribis in an MCP Host

Add Scribis to your host application's `mcp.json` (choose one method):

#### Method A: Direct Execution via `node bridge.js` (Easiest, Recommended — No CLI installation needed)

```json
{
  "mcpServers": {
    "scribis": {
      "command": "node",
      "args": ["/path/to/mcp_client/bridge.js"]
    }
  }
}
```

*Tip: If Scribis is installed in a non-default location, environment variables can be passed directly inside `"env"` in `mcp.json`:*
```json
{
  "mcpServers": {
    "scribis": {
      "command": "node",
      "args": ["/path/to/mcp_client/bridge.js"],
      "env": {
        "SCRIBIS_USER_DATA_PATH": "D:\\CustomScribisData"
      }
    }
  }
}
```

#### Method B: Global CLI Command (Requires running `scribis install-cli` and adding to PATH)

```json
{
  "mcpServers": {
    "scribis": {
      "command": "scribis",
      "args": ["mcp-bridge"]
    }
  }
}
```

---

## 🧪 Testing MCP Connectivity

1. Ensure **Scribis Desktop Application** is running on your machine.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the demonstration client script:
   ```bash
   npm start
   ```

### Custom Bridge Script & Environment Variables

`bridge.js` supports the following environment variables for custom installation directories or non-standard setups:

* **`SCRIBIS_USER_DATA_PATH`**: Custom Scribis application UserData folder path (e.g. `D:\CustomData\scribis`).
* **`SCRIBIS_DISCOVERY_PATH`**: Explicit full path to the `discovery.json` file.
* **`SCRIBIS_SOCKET_PATH`**: Explicit Unix socket or Windows named pipe path (highest priority).
* **`SCRIBIS_BRIDGE_PATH`**: (For `client.js` testing) Explicit path to `bridge.js`.

**Usage Examples:**

- **macOS / Linux (Bash / Zsh)**:
  ```bash
  SCRIBIS_USER_DATA_PATH="/custom/path/scribis" node bridge.js
  SCRIBIS_BRIDGE_PATH="/path/to/bridge.js" npm start
  ```
- **Windows (PowerShell)**:
  ```powershell
  $env:SCRIBIS_USER_DATA_PATH="D:\CustomData\scribis"; node bridge.js
  $env:SCRIBIS_BRIDGE_PATH="C:\path\to\bridge.js"; npm start
  ```
- **Windows (CMD)**:
  ```cmd
  set SCRIBIS_USER_DATA_PATH=D:\CustomData\scribis && node bridge.js
  set SCRIBIS_BRIDGE_PATH=C:\path\to\bridge.js && npm start
  ```

---

## 📖 MCP Resources & Tools Overview

### Resources

- `scribis://subtitles/current`: Live subtitles array JSON of active project.
- `scribis://timeline/state`: Live timeline structure with audio/video/mosaic/text/zoom blocks.

### Key Tools

- **ASR & Models**: `list_models`, `transcribe_audio`, `cancel_transcription`
- **TTS Engine**: `list_voices`, `generate_tts`
- **Timeline Editing**: `get_timeline_state`, `add_timeline_block`, `delete_segment`, `reset_timeline`
- **Subtitle Management**: `get_all_subtitles`, `update_subtitle`, `batch_correct_subtitles`
- **Vision & Frames**: `render_preview_frame`, `get_video_frame`, `get_current_frame`, `seek_player`

---

## 📄 License

This repository is licensed under the [MIT License](LICENSE).
