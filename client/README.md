# Scribis MCP Client & AI Agent Skills (`talkyon/scribis-mcp-client`)

[English](README.md) | [繁體中文](README-zh.md)

Official Model Context Protocol (MCP) Client, Web Test Console, and AI Agent Skills for [Scribis](https://github.com/talkyon/scribis).

This repository provides everything needed to connect AI assistants and MCP hosts, including Claude Code, Cursor, Codex CLI, Google Antigravity IDE, Windsurf, and other MCP-compatible applications. to a running instance of **Scribis** for fast, local audio transcription, timeline video editing, subtitle correction, and TTS speech synthesis.

For server-side integrations, Scribis Desktop provides an authenticated OpenAI-compatible REST API at `http://<scribis-host>:<shared-port>/v1`. Configure the shared HTTP port in **Settings → MCP Protocol** (default `8890`). The API supports `GET /models` and `GET /models/:model`, `GET /audio/voices` (Scribis voice discovery), `POST /audio/transcriptions`, `POST /audio/speech`, `POST /chat/completions`, `POST /completions`, and `POST /embeddings`. Chat and text completions accept `stream: true` for Server-Sent Events, plus optional `temperature` and `max_tokens` generation settings. Chat requests accept standard `system`, `user`, and `assistant` messages. Non-streaming completion responses include usage counts; local and Apple model counts are estimates. LLM requests support Apple Foundation Models and installed local GGUF models; cloud LLM providers are rejected. `POST /embeddings` is available once the Smart Media Search resources are downloaded: use model `embeddinggemma-2-Q8_0` (listed by `GET /models` only while installed), send `input` as a string or up to 64 strings of at most 8192 characters each (token-ID arrays are rejected), and optionally set `encoding_format` (`float` or `base64` little-endian float32) and `dimensions` (`768`, `512`, `256`, or `128`; truncated vectors are re-normalized). Without the model it returns HTTP 404 `model_not_found`; usage token counts are estimates. Generate a key with an `expire_at` in the future and send it as `Authorization: Bearer <API_KEY>`. MCP and the API use one listener; when the API is enabled MCP routes are intercepted and remain localhost-only. The MCP HTTP routes need no token (they only accept local connections): they accept only a loopback `Host` on the active port, refuse other websites' `Origin`, take `/mcp` and `/api/select-file` only as `POST` with `Content-Type: application/json`, refuse request bodies over 256 MiB (HTTP 413), and send no wildcard CORS, so web pages cannot call them. Put the API behind HTTPS and a source-restricted firewall before exposing it outside a trusted network, and forward only `/v1` routes through the proxy.

---

## 📦 Repository Contents

- **`skills/scribis-transcribe/`**: Production-ready Agent Skill definition (`SKILL.md` + specifications) for AI Agents to automatically discover and use Scribis.
- **`skills/scribis-edit/`**: Entry skill for `/scribis-edit cuts <id>` and `/scribis-edit scene <id>` (copied from Scribis): opens that editor, reads it and routes the request (subtitles, rough cut, mosaics/faces, motion graphics, scenes).
- **`skills/scribis-motion/`**: Brief-first motion-graphic skill: starters (`kinetic_title`, `stat_chart`, `explainer`, `callout`, `lower_third`, and the explainer beats `hook_title`, `points_list`, `takeaway_card`, `ui_walkthrough`, `logo_outro`), the inline motion kit, review placement and single-detail edits.
- **`skills/scribis-audio/`**: Music and sound effects: library search and import, generated effects (recipes), placement on Cuts audio tracks or scene audio tracks, and level/timing rules.
- **`skills/scribis-voice/`**: TTS voice-overs, project speakers' voices and cloning, and word timing of what is actually heard for syncing animation and effects.
- **`skills/scribis-explainer/`**: Animated explainers (kinetic, code-driven beats) built as a scene of separate beats (title, points, chart, takeaway) from a report, numbers or a YouTube video, so each beat stays editable on its own.

Install `scribis-edit` together with the skills it routes to (`scribis-transcribe`, `scribis-motion`, `scribis-audio`, `scribis-voice`, `scribis-explainer`).
- **`bridge.js`**: Standalone stdio ↔ socket proxy script for AI Hosts (e.g. Claude Code, Cursor) to connect to a running Scribis instance over stdio.
- **`client.js`**: Node.js demo client using `@modelcontextprotocol/sdk` to test MCP tools and resources.
- **`index.html`**: Interactive Web UI test suite for browser-based MCP verification.
- **`scripts/check-public-content.js`** (`npm run check:public`): for contributors; fails when this public package contains private content (source paths, developer machine paths, team or App Group IDs, real IDs). Add `-- --tools-dir <dir>` to also check every tool name the skills mention against the tool sources.

---

## 🚀 Quick Start for AI Agents

### Option 1: Installing the Included AI Agent Skills

Each folder under `skills/` is a standard Agent Skill (a folder with a `SKILL.md`). Copy or symlink **all six** `skills/scribis-*` folders into your agent's skills directory, side by side: the skills link to each other with relative `../scribis-*/` paths, so a skill installed alone has broken links.

| Agent | Project (this repository only) | Personal (all projects) |
| --- | --- | --- |
| Claude Code | `.claude/skills/` | `~/.claude/skills/` |
| OpenAI Codex (CLI, IDE, app) | `.agents/skills/` | `~/.agents/skills/` |
| Google Antigravity | `.agents/skills/` | `~/.gemini/config/skills/` (older versions: `~/.gemini/antigravity/skills/`) |
| Cursor | `.cursor/skills/` or `.agents/skills/` | `~/.cursor/skills/` or `~/.agents/skills/` |
| Windsurf | `.windsurf/skills/` or `.agents/skills/` | `~/.codeium/windsurf/skills/` or `~/.agents/skills/` |
| Other Agent Skills hosts | `.agents/skills/` | `~/.agents/skills/` |

Skill locations change between host versions; if a folder is not picked up, check your version's documentation. For example, to install every skill for Claude Code on macOS or Linux:

```bash
mkdir -p ~/.claude/skills
cp -R /path/to/scribis-mcp-client/skills/scribis-* ~/.claude/skills/
```

On Windows (PowerShell), the personal folder is `%USERPROFILE%\.claude\skills`:

```powershell
New-Item -ItemType Directory -Force "$env:USERPROFILE\.claude\skills" | Out-Null
Copy-Item -Recurse -Force C:\path\to\scribis-mcp-client\skills\scribis-* "$env:USERPROFILE\.claude\skills"
```

Use `ln -s` instead of `cp -R` to keep the skills updated with `git pull`. On Windows you can also copy the folders with Explorer or `xcopy /E /I`. Cursor also reads `.claude/skills/`, so one Claude Code install covers both. Restart the agent (or start a new session) after installing.

### Option 2: Configuring Scribis in an MCP Host

Enable MCP in Scribis (**Settings → MCP**). That page shows ready-to-copy snippets for these hosts with the real port filled in; below, `<port>` is that port (default `8890`) and `/path/to/` is where you cloned this repository.

| Host | Config file | Snippet |
| --- | --- | --- |
| Claude Code | `.mcp.json` in the project | `{"mcpServers": {"scribis": {"type": "http", "url": "http://127.0.0.1:<port>/mcp"}}}`, or run `claude mcp add --transport http scribis http://127.0.0.1:<port>/mcp` (an entry without `"type": "http"` is read as stdio) |
| Claude Desktop | `claude_desktop_config.json` (macOS `~/Library/Application Support/Claude/`, Windows `%APPDATA%\Claude\`) | stdio only: `{"mcpServers": {"scribis": {"command": "node", "args": ["/path/to/scribis-mcp-client/bridge.js"]}}}` (Method A below) |
| Cursor | `.cursor/mcp.json` (project) or `~/.cursor/mcp.json` | `{"mcpServers": {"scribis": {"url": "http://127.0.0.1:<port>/mcp"}}}` |
| OpenAI Codex (CLI, IDE) | `~/.codex/config.toml` | `[mcp_servers.scribis]` then `url = "http://127.0.0.1:<port>/mcp"` |
| Google Antigravity | `mcp_config.json` (agent panel → MCP Servers → Manage MCP Servers → View raw config) | `{"mcpServers": {"scribis": {"serverUrl": "http://127.0.0.1:<port>/mcp"}}}`; Antigravity requires `serverUrl`, so rename `url` in the generic snippet |
| Windsurf | `mcp_config.json` (Cascade → MCP servers → view raw config) | `{"mcpServers": {"scribis": {"serverUrl": "http://127.0.0.1:<port>/mcp"}}}` (`url` is also accepted) |
| Other hosts | the host's MCP JSON | `{"mcpServers": {"scribis": {"url": "http://127.0.0.1:<port>/mcp"}}}`, or the stdio bridge below |

The HTTP endpoint accepts only local connections. Hosts that can only start a local process (stdio) use `bridge.js`:

#### Method A: Direct Execution via `node bridge.js` (Easiest, Recommended — No CLI installation needed)

```json
{
  "mcpServers": {
    "scribis": {
      "command": "node",
      "args": ["/path/to/scribis-mcp-client/bridge.js"]
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
      "args": ["/path/to/scribis-mcp-client/bridge.js"],
      "env": {
        "SCRIBIS_USER_DATA_PATH": "E:\\CustomScribisData"
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

* **`SCRIBIS_USER_DATA_PATH`**: Custom Scribis application UserData folder path (e.g. `E:\CustomData\scribis`).
* **`SCRIBIS_DISCOVERY_PATH`**: Explicit full path to the `discovery.json` file.
* **`SCRIBIS_SOCKET_PATH`**: Explicit Unix socket or Windows named pipe path (highest priority).
* **`SCRIBIS_BRIDGE_PATH`**: (For `client.js` testing) Explicit path to `bridge.js`.

Keep `bridge.js` and the `cli/` folder together in the cloned repository: the bridge loads `cli/lib/discovery.js`, so it cannot be copied elsewhere on its own.

**Stale discovery files:** Scribis runs as a single instance; launching it again focuses the running window. The bridge and the `scribis` CLI check that the process recorded in `discovery.json` is still running, and `scribis status` also checks that its socket accepts connections. If not, they report `Stale MCP discovery` instead of connecting. Restart Scribis or toggle the MCP server in Settings to rewrite the file, or set `SCRIBIS_SOCKET_PATH` to the running app's socket.

**Discovery file locations:** Without `SCRIBIS_DISCOVERY_PATH` or `SCRIBIS_USER_DATA_PATH`, the bridge and CLI use the first running instance found in:

| Build | `discovery.json` |
| :--- | :--- |
| macOS (direct download) | `~/Library/Application Support/scribis/_mcp/discovery.json` |
| macOS (Mac App Store) | `_mcp/discovery.json` in the Scribis app group container under `~/Library/Group Containers/` (found automatically) |
| macOS (older Mac App Store builds) | `~/Library/Containers/com.talkyon.scribis/Data/Library/Application Support/scribis/_mcp/discovery.json` |
| Windows | `%APPDATA%\scribis\_mcp\discovery.json` |
| Linux | `~/.config/scribis/_mcp/discovery.json` |

**Mac App Store (sandboxed) build:** The app's container path is too long for a Unix socket (macOS limits socket paths to 104 bytes), so the sandboxed build binds `mcp.sock` in its app group container instead. If the socket still cannot listen, Scribis writes `socketError` into `discovery.json`; the bridge and `scribis status` then report `stdio socket is unavailable`. In that case, use the localhost HTTP transport: `scribis status --mcp` (it reads the port the app publishes in `discovery.json`), or point your MCP host at `http://127.0.0.1:<port>/mcp`, where `<port>` is the port shown in Settings → MCP (default 8890). macOS may ask once whether your terminal or MCP host can access data from other apps when it reads the app group container.

**File paths in the sandboxed build:** Scribis can only read files the user has granted it. When `transcribe_audio` (`path`), `get_video_frame` (`video_path`) or `create_avatar` (`image_path`, `audio_path`) receives a path Scribis cannot read, the tool returns an error explaining how to grant access instead of `File not found`. To grant access, open or import the file in Scribis (or add its folder as a synced folder). You can also pass base64 content (`audio_data`, `image_data`) where the tool supports it. Or `POST /api/select-file` (JSON body) on the HTTP transport to pick the file in a Scribis dialog, then pass the returned path.

**Usage Examples:**

- **macOS / Linux (Bash / Zsh)**:
  ```bash
  SCRIBIS_USER_DATA_PATH="/custom/path/scribis" node bridge.js
  SCRIBIS_BRIDGE_PATH="/path/to/bridge.js" npm start
  ```
- **Windows (PowerShell)**:
  ```powershell
  $env:SCRIBIS_USER_DATA_PATH="E:\CustomData\scribis"; node bridge.js
  $env:SCRIBIS_BRIDGE_PATH="C:\path\to\bridge.js"; npm start
  ```
- **Windows (CMD)**:
  ```cmd
  set SCRIBIS_USER_DATA_PATH=E:\CustomData\scribis && node bridge.js
  set SCRIBIS_BRIDGE_PATH=C:\path\to\bridge.js && npm start
  ```

---

## 📖 MCP Resources & Tools Overview

### Resources

- `scribis://subtitles/current`: Live subtitles array JSON of active project.
- `scribis://timeline/state`: Live timeline structure with audio/video/mosaic/text/zoom blocks.
- `scribis://cuts/motion-guide`, `scribis://cuts/motion-template`: HTML motion-graphic contract and template (same as `scenes_get_motion_guide`).

### Key Tools

- **ASR & Models**: `list_models`, `transcribe_audio`, `cancel_transcription`
- **TTS Engine**: `list_voices`, `generate_tts`
- **Avatar Video**: `create_avatar`

`generate_tts` accepts an installed `voice_id` or reference audio for voice cloning without a voice ID. Pass reference audio as Base64 or a `data:audio/...;base64,...` Data URL (up to 20 MiB); do not pass a local filesystem path as `ref_audio`. MioCodec `native` accepts WAV, MP3, M4A, FLAC, OGG, WebM, and AAC; VoxCPM2 (`engine: "voxcpm2-tts"`) requires a WAV reference voice and the VoxCPM2 model installed in Scribis. Use `list_voices({engine: "voxcpm2-tts"})` to get an installed voice ID, or pass a WAV data URL as `ref_audio`. VoxCPM2 style can be set with `instruct`. Local TTS models may fail on long sentences, so split long text at sentence-ending punctuation and synthesize each chunk in order.

`create_avatar` generates an MP4 from `image_path` or `image_data` plus `audio_path` or `audio_data`. Base64 inputs can be raw Base64 or a matching data URL; image data is limited to 20 MiB and audio data to 100 MiB. Choose `max_dimension: 256` or `512` (default) for output resolution. The default response contains `video_path` in Scribis temp storage. Set `enable_binary: true` to return `video_base64` instead. If the selected Avatar model is not installed, the tool reports that directly and does not download it.

```json
{
  "text": "Hello, this is a voice test.",
  "lang": "en",
  "engine": "native",
  "ref_audio": "data:audio/wav;base64,<base64 audio>",
  "return_base64": true
}
```

When `ref_audio` is provided, omit `voice_id`. The response includes a WAV Data URL in `audio_base64` by default.
- **Timeline Editing**: `get_timeline_state`, `add_timeline_block`, `delete_segment` (rough-cut ranges; `mode="review"` by default, accepted in the Scribis editor), `delete_timeline_block` (also removes deletion blocks), `split_media` (splits crossing subtitles/effect blocks, not audio clips), `reset_timeline`. Each successful MCP timeline change is one undo step.
- **Subtitle Management**: `get_all_subtitles`, `update_subtitle`, `batch_correct_subtitles`
- **Vision & Frames**: `render_preview_frame`, `get_video_frame`, `get_current_frame`, `seek_player`
- **LLM Models & Chat**: `list_llm_models`, `llm_completion` (supports Apple Intelligence on ARM64 macOS 26+, Apple PCC on MAS macOS 27+, and all local/custom GGUF models; cloud models are excluded)
- **Open Pages**: `app_open_youtube_browser(url?)` opens the YouTube AI browser and loads a YouTube URL or video ID; `cuts_open_project(project_id)` and `scenes_open(scene_id)` open a Cuts project or scene in its editor (IDs from `cuts_list_projects` / `scenes_list`, or the copy button next to **Open** in Cuts, which copies `/scribis-edit cuts <id>` / `/scribis-edit scene <id>` for the `scribis-edit` skill, which opens the editor and starts editing). They refuse while another editor is open instead of closing it.
- **YouTube**: `youtube_get_captions(url, lang?, format?)` (captions as `[m:ss]` text, cues or SRT; paged), `youtube_get_quota`, `youtube_list_history`. Free accounts may use 10 new YouTube videos per month, shared with the YouTube AI browser (a video counts once; saved history videos are free; Pro is unlimited); past the limit the tools and `app_open_youtube_browser` fail with `error_code: "YOUTUBE_MONTHLY_LIMIT_REACHED"`.
- **Faces & free space**: `cuts_detect_faces(action)` marks faces with Auto Mosaic grain `none` (no pixelation); it is optional and runs only when the user wants face-aware placement. `cuts_get_avoid_regions(start, end, project_id? | scene_id?, include_faces?, content_aspect?)` returns regions to keep clear and `free_areas` (largest clear rectangles ranked in real frame pixels) for B-roll, text and motion graphics. An HTML motion graphic is laid out at its placement box size, and can use fonts from the Scribis font library by name. Read `skills/scribis-transcribe/references/mcp-playbook.md` before editing.
- **Cuts Projects**: `cuts_list_projects`, `cuts_get_project`, `cuts_list_assets`, `cuts_place_visual`, `cuts_update_visual`, `cuts_remove_visual`, `cuts_split_block`, `cuts_merge_blocks`, `cuts_set_track_state` (`mode="review"` by default). Besides its own video, the Cuts timeline editor takes HTML motion graphics (`cuts_place_visual` creates a visual track when needed) and music or sound effects (`cuts_place_audio`, audio tracks); place images and videos in a scene with `scenes_edit` (`add_clip`, `source="asset"`). `cuts_add_track` is temporarily unavailable.
- **Scenes**: `scenes_list(query?, limit?)`, `scenes_get(scene_id?)`, `scenes_create(name, aspect_ratio?)`, `scenes_edit(scene_id?, operations[], mode?, expected_revision?)`, `scenes_render_frame(scene_id?, timestamp_sec? | times?, width?, height?, return?)`. A scene combines Cuts timelines: track 1 is the storyboard (timeline clips only, played in order without overlaps, transitions between adjacent clips); layer tracks above hold timelines, images, videos and HTML motion graphics; audio tracks below hold only audio. Timelines come from `cuts_list_projects`, assets from `cuts_list_assets`. HTML clips take `params` (validated against the template manifest); `replace_asset` switches clips to another asset of the same kind, e.g. a new template version. When the scene is open in Scribis, edits default to `mode="review"` (the user accepts or rejects; read the decision with `scenes_get` → `review.recent`); `mode="auto"` applies directly. `scenes_render_frame` renders composite scene frames exactly as the scene preview and export show them (storyboard transitions, layer tracks including HTML motion graphics, scene background) from the open editor's live state or the saved scene, waiting for decoded video and prepared HTML layers; it returns PNG images plus temp file paths (up to 6 `times`, or up to 12 in one labelled contact sheet with `return="sheet"`, also on `scenes_render_motion_graphic`; default: the open editor's playhead). In `scenes_edit`, `add_clip` with `track="previous"` uses the track of the previous `add_clip` in the same edit (start a sequence with `new_layer` / `new_audio`); without a track, clips go to the first track of their kind. Scene clips are at least 0.1 s; `audio_generate_sfx` returns a `warning` for shorter effects.
- **AI references**: every item selected in the Cuts or Scene editor shows a copyable reference (`audio-1a2b3c4d`, `motion-…`, `subtitle-…`, … with `project:<id>` / `scene:<id>`; scene clips, Cuts visual blocks (not images) and music blocks also show the source range they play, e.g. the HTML composition time `(source 0:05.38–0:26.54)`); `scribis_resolve_ref` finds the item and the tool that edits it, and the edit tools accept the reference directly as `block_id` / `clip_id` / `id`.
- **Speech**: `audio_list_voices`, `audio_generate_speech` (TTS into a Cuts asset with a catalog voice, a project speaker's voice, a speaker cloned from the video, or a reference recording), `cuts_get_speech_words` / `scenes_get_speech_words` / `audio_get_speech_words` (word timing of what is heard; TTS lines are transcribed and aligned to their text because subtitles keep the original recording's timing). See the `scribis-voice` skill.
- **Library, music and sound effects**: `cuts_search_assets` (ranked search of audio, images, video and HTML by words and, with the Media Search Index, by content; audio and video content matches list `match_times`, where in the file the query matched), `cuts_import_asset` (copy a local file into the Cuts library), `cuts_place_audio` / `cuts_update_audio` / `cuts_remove_audio` (music and effects on Cuts audio tracks; TTS speech stays separate), `audio_list_sfx_recipes` / `audio_generate_sfx` (procedural sound effects such as whoosh, riser, impact, pop, click, ding, saved as `sfx` audio assets). Music and effect clips have a volume envelope (`volume_keyframes`: `{time, gain, curve}` points, edited as a volume line in the app; preview and export sound the same) on Cuts blocks and scene audio clips (`scenes_edit` `update_clip`); `fade_in` / `fade_out` and `cuts_duck_audio` / `scenes_duck_audio` (lower music while speech plays) are presets that write points into it. Levels are measured, not guessed: `audio_measure` (integrated LUFS, true peak, loudness range, suggested volumes) and `cuts_audio_check` / `scenes_audio_check` (music level under speech, effects over spoken words, effect loudness and density, missing fades, clipping; each issue lists the call that fixes it). See the `scribis-audio` skill.
- **Scene Motion Graphics**: `scenes_get_motion_guide(starter?)` (starters: `lower_third`, `kinetic_title`, `stat_chart`, `explainer`, `callout`, and the explainer beats `hook_title`, `points_list`, `takeaway_card`, `ui_walkthrough`, `logo_outro`; see the `scribis-motion` skill), `scenes_find_motion_templates`, `scenes_create_motion_graphic`, `scenes_get_motion_graphic`, `scenes_import_motion_graphic`, `scenes_update_motion_graphic`, `scenes_render_motion_graphic`. Motion graphics are self-contained HTML documents (`scribis.motion/1`) saved to the HTML templates library with a stable `template_id`, a searchable description and tags; the starters are also in the library as read-only built-in templates. Identical or near-duplicate templates are not saved twice: create returns the existing template (`status: "existing"`) or the similar ones (`status: "similar_found"`, bypass with `force: true`), an unchanged update makes no version (`status: "unchanged"`), and search results carry `usage_count`. Params can be text, color, number, boolean, select, `image` (a Cuts image asset) or `font` (an installed font), each with an optional `role`; templates carry a `category` and designed-for `aspects`, so `scenes_find_motion_templates` can browse by `category`/`aspect`. Find one by keywords or scene/timeline position ("the template at 11:50") with `scenes_find_motion_templates`, change it (`scenes_update_motion_graphic`, `retarget="open_scene"` or `"open_project"` proposes switching the open scene's clips or Cuts project's blocks) or derive a new template (`scenes_create_motion_graphic` with `based_on`), then place it with `scenes_edit` `add_clip(source="asset", params)` or `cuts_place_visual`. Create, update and render results carry `warnings` (static checks) and `logs` (the document's console output and uncaught exceptions while the frames rendered, with the line in the HTML), so an agent can debug a template without the in-app code editor. `scenes_import_motion_graphic(format="hyperframes", html, files)` turns a HyperFrames composition (its index.html plus every sub-composition file and local script/stylesheet) into one template: sub-compositions and local scripts are inlined, `composition` imports a single scene of a multi-scene project, declared variables become params, `<video>`/`<audio>` are rejected unless `strip_media` removes them, and the result carries `import.warnings`. See `skills/scribis-transcribe/references/mcp-tools-spec.md`.

---

## 📄 License

This repository is licensed under the [MIT License](LICENSE).
