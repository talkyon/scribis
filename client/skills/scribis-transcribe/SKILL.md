---
name: scribis-transcribe
description: >
  Transcribe audio or video, generate subtitles/SRT, live speech-to-text, local LLM text, or
  edit a video in the Scribis desktop app: fix subtitles, rough-cut filler words, pauses and
  retakes, add zooms, mosaics, text or HTML motion graphics, combine Cuts timelines into
  scenes, TTS and preview frames. Trigger even without the word Scribis ("把這段錄音轉成逐字稿",
  "幫我加字幕", "剪掉口頭禪和停頓", "transcribe this meeting", "remove the ums"). Covers the scribis CLI
  and the Scribis MCP tools.
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

1. **Native MCP tools** (`transcribe_audio`, `list_models`, `list_llm_models`,
   `llm_completion`, `get_timeline_state`, `update_subtitle`, etc.) — if these
   already appear in your tool list, use them directly. This is the preferred
   path: no shell process, no parsing stdout, and you get structured JSON back.
2. **`scribis` CLI proxy** — use this when the MCP tools aren't registered as
   native tools, but you still have shell access. It talks to Scribis over the
   same stdio socket, or over MCP HTTP if you pass `--mcp` (it uses the port the
   running app publishes; `SCRIBIS_MCP_PORT` overrides it).

If neither is available, tell the user Scribis doesn't appear to be reachable
and ask them to open the Scribis Desktop app (or, for MCP HTTP, confirm the
port).

---

## Quick Reference (CLI path)

### 1. Check connection before doing anything else
```bash
scribis status
# or, for MCP HTTP mode:
scribis status --mcp
```
A healthy run prints `Connected` (stdio: `Connected to Scribis stdio socket`;
`--mcp`: `App Query: Connected to Scribis over MCP HTTP`) and exits 0; any failure
prints `Error` or `Unable to reach` and exits 1. If it fails, stop and tell the user to
launch Scribis Desktop (and, for `--mcp`, confirm the port: the one shown in
Settings → MCP, default 8890) — retrying the same command won't help.
If `scribis` is not on PATH (on Windows a bare `scribis` may even resolve to the desktop
app's executable), run the CLI by file instead:
`node /path/to/scribis-mcp-client/cli/bin/scribis.js status`, or install the shim with
`node /path/to/scribis-mcp-client/cli/bin/scribis.js install-cli`. A `Stale MCP discovery`
error means the discovery file points to a process that has exited: ask the user to
restart Scribis or toggle the MCP server in Settings. `stdio socket is unavailable`
means Scribis is running but its socket could not listen (possible in the Mac App
Store build): switch to `--mcp` (the error names the port to use) instead of retrying.

### 2. Confirm the model you want is actually installed
Not every model listed in the models reference is installed by default (see
`references/supported-models.md`). Run `scribis models` first if you're about
to request anything other than the active default model, so you can tell the
user upfront if it needs to be downloaded rather than let `transcribe` fail
partway through:
```bash
scribis models
```
The output marks each model `[Installed]` or `[Not Installed]`; the default `base`
and the examples' `large-v3` are often not installed. Pick an installed model with
`--model <name>` (prefer the installed Whisper or SenseVoice/Parakeet model for the
user's language), or tell the user to download the one they want in Scribis
(Settings → Models) first. The CLI never downloads models.

### 3. Batch transcription
```bash
scribis transcribe <file_path> [--model base] [--lang auto] [--output srt|json|txt|vtt] [--persist] [-o output_file]
```
Examples:
- Transcribe to SRT via stdio:
  `scribis transcribe ~/audio.mp3 --model large-v3 --lang zh --output srt -o ~/audio.srt`
- Transcribe via MCP HTTP:
  `scribis transcribe ~/meeting.mp4 --mcp --output json`

Only pass `--persist` when the file is part of a project the user is actively
editing inside Scribis (it saves the transcript into the app's database). If
the user just wants a transcript/subtitle file to keep or hand off elsewhere,
skip it — there's nothing to clean up later that way.

On Windows use the same commands with Windows paths (`scribis transcribe
"C:\path\to\meeting.mp4" --output srt -o "C:\path\to\meeting.srt"`). The CLI always sends
the file *path* to Scribis; with the Mac App Store (sandboxed) build, an error saying
Scribis cannot read the file means the app has no access to that folder: ask the user to
open or import the file in Scribis (or add its folder as a synced folder), then run the
command again, or use the MCP tool `transcribe_audio` with `audio_data` for short files.

A transcript made with the CLI is a standalone file. Rough cuts (filler words, pauses)
are edited on a Cuts project's own transcript and word timings inside Scribis: ask the user
to open or create the Cuts project for that video, then follow the `scribis-edit` skill.

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

> **Read [references/mcp-playbook.md](references/mcp-playbook.md) before editing.**
> It covers the golden rules (open first, read before write, review by default, one
> proposal per editor, keep faces clear), the time and coordinate spaces, ID sources,
> what each tool needs open, error → fix, recipes, and what MCP cannot do.

- **Faces and free space**: `cuts_detect_faces(action="start"|"status")` marks
  faces with Auto Mosaic grain `none` (no pixelation); it is optional, so ask the user
  before scanning. `cuts_get_avoid_regions(start, end, project_id? | scene_id?,
  include_faces?, content_aspect?)` returns the regions to keep clear and `free_areas`
  (largest clear rectangles, ranked in real frame pixels) for B-roll, text and
  motion graphics. `add_mosaic_block` takes `grain`
  (none/fine/medium/coarse), and x, y are the top-left corner.
- **Subtitles in the Cuts editor**: reads come from the open editor. Write with
  `update_timeline_block(id=<subBlocks id>, parameters={"text": …})`; the
  `update_subtitle` family only edits the transcript page.

When `transcribe_audio`, `list_models`, `get_all_subtitles`, etc. are directly
available as tools, call them instead of shelling out. Full argument list and
descriptions are in `references/mcp-tools-spec.md` — notably:
- `transcribe_audio` accepts either a file path or base64 audio data (`audio_data`,
  with `format` = the file extension such as `mp3` or `mp4`), so you don't need the
  file to exist on disk from Scribis's perspective. Base64 suits short clips; for a
  long recording in the sandboxed Mac App Store build, if a path error says Scribis
  cannot read the file, ask the user to open or import it in Scribis instead. The
  result is JSON: `text` plus `subtitles[]` (`start`, `end` in seconds, `text`, and
  `words` when the model provides them); the tool does not write SRT. Build the SRT
  yourself from `subtitles`: number each cue from 1, write
  `HH:MM:SS,mmm --> HH:MM:SS,mmm`, the text, then a blank line, e.g.
  ```
  1
  00:00:01,250 --> 00:00:03,900
  Welcome to the meeting.
  ```
  or use the CLI (`scribis transcribe … --output srt`) when a file is wanted.
- `create_avatar` accepts a portrait photo and audio as paths or Base64 data;
  choose `max_dimension=256` or `512` for output size. It returns a temporary
  MP4 path by default, or MP4 Base64 with `enable_binary=true`. Check that the
  Avatar model is installed first; the tool does not download it.
- `list_llm_models` shows installed Apple Foundation Models and local GGUF models;
  `llm_completion` generates text with one of those models. Cloud LLM providers
  are not supported.
- Timeline/subtitle tools (`get_timeline_state`, `add_timeline_block`,
  `update_subtitle`, `batch_correct_subtitles`) let you go beyond plain
  transcription into actually editing the open project — reach for these when
  the user's ask is about fixing or building out a project, not just getting
  a transcript.
- Pass `auto=false` on subtitle edits when the change is subjective or the
  user hasn't explicitly approved it, so it lands in Scribis's UI review queue
  instead of applying silently.
- Cuts video projects: `cuts_list_projects`, `cuts_get_project`,
  `cuts_list_assets`, `cuts_place_visual`, `cuts_update_visual`,
  `cuts_remove_visual`, `cuts_split_block`, `cuts_merge_blocks` and
  `cuts_set_track_state`. Blocks show their asset from `source_offset`: moving only
  the start edge (same `end`) cuts content instead of delaying it, and split parts
  continue the source. Besides its own video, the
  Cuts timeline editor takes HTML motion graphics (`cuts_place_visual`,
  source-video seconds, `params`; creates a visual track when needed) and music or
  sound effects (`cuts_place_audio` / `cuts_update_audio` / `cuts_remove_audio` on
  audio tracks; see the `scribis-audio` skill). Images and videos go in a scene.
  Find assets with `cuts_search_assets`, import files with `cuts_import_asset`.
  `cuts_add_track` is temporarily unavailable.
- Scenes (`scenes_*` tools) combine Cuts timelines into one video. Track 1 is the
  storyboard: timeline clips only, played in order without overlaps, with
  transitions between adjacent clips (fades, wipes, pushes/covers, shape
  reveals, zooms, `spin`, `whip`; see the `set_transition` type enum) and at the
  free ends, where the scene background stands in for the missing clip. Layer tracks above it hold
  timelines, images, videos and HTML motion graphics in layer order; audio
  tracks below it hold only audio. `original_audio=false` on a timeline clip
  plays only its TTS voices plus the scene audio tracks (`null` follows the
  timeline).
- **Open pages**: `app_open_youtube_browser(url?)` opens the YouTube AI browser
  (and loads a YouTube URL or video ID); `cuts_open_project(project_id)` and
  `scenes_open(scene_id)` open a Cuts project or scene in its editor so review-mode
  edits can be accepted there. The copy button next to **Open** in Scribis
  (Cuts → Recent edits / Scenes) copies `/scribis-edit cuts <id>` or
  `/scribis-edit scene <id>`; that command is handled by the `scribis-edit`
  skill, which opens the editor and routes the request. They refuse while another editor is open; ask the user to save and close it.
- **YouTube**: `youtube_get_captions(url, format="text" | "cues" | "srt")` reads a
  video's captions (saved history videos are free; free accounts get 10 new videos a
  month, shared with the YouTube browser; past it the error code is
  `YOUTUBE_MONTHLY_LIMIT_REACHED`), `youtube_get_quota`, `youtube_list_history`. Details are in
  [references/mcp-tools-spec.md](references/mcp-tools-spec.md) "YouTube"; for an animated
  explainer from a video or report, the **`scribis-explainer`** skill.
- **HTML motion graphics** are scene clips or Cuts visual blocks. For a full
  brief → starter → review workflow use the **`scribis-motion`** skill
  (`../scribis-motion/SKILL.md`). To make one, call
  `scenes_get_motion_guide` (optionally `starter=kinetic_title|stat_chart|explainer|callout|lower_third|hook_title|points_list|takeaway_card|ui_walkthrough|logo_outro`),
  fill or write a self-contained `scribis.motion/1` document,
  create it with `scenes_create_motion_graphic` (look at the returned frames),
  then `scenes_edit` → `add_clip(source="asset", source_id=<asset id>, params)`
  on a layer track (or `cuts_place_visual` on a Cuts timeline). HTML clips take `params` (validated against the manifest;
  `params: null` on `update_clip` resets to the template defaults). Param types are text, color, number,
  boolean, select, `image` (a Cuts image `asset_id`) and `font` (an installed family); the starters are
  also read-only built-in templates in the library (`built_in: true`), browsable by `category`/`aspect`.
- Every motion graphic is a reusable **template** in the user's HTML templates
  library (stable `template_id` across versions). Always pass a searchable
  `description` and `tags` when creating one. When the user refers to a template
  in words ("the one at 11:50", "the blue countdown", or a pasted
  `Scribis HTML template <id>`), resolve it with `scenes_find_motion_templates`
  (`query` and/or `at_time` + optional `scene_id` or `project_id`; without
  either, the open scene is used, else the open Cuts project; hits come back as
  `scene_clips` with `clip_id` or `timeline_blocks` with `block_id`) and use its `latest_asset_id`:
  read it with `scenes_get_motion_graphic` (source, versions, usages), change it
  with `scenes_update_motion_graphic` + small `patches` (new version;
  `retarget="open_scene"` / `"open_project"` proposes switching the open
  scene's clips / Cuts project's blocks, review by default), or make a new template with `scenes_create_motion_graphic` +
  `based_on`. To switch clips yourself use `scenes_edit` `replace_asset`
  (`from_source_id`, `source_id`, `clip_ids?`; params kept). Check for a fitting
  template before writing a new one. For change requests ("make it red", "change
  41 to 45"), follow the `scribis-motion` skill, section 7: map the request to
  manifest params, choose per-placement `params` vs a new version, patch every
  copy of the old value, update the description, and verify.

---

## Editing workflows (MCP tools path)

For anything beyond plain transcription, follow
[references/editing-recipes.md](references/editing-recipes.md). The essentials:

- **AI references.** Items selected in the Cuts or Scene editor show an AI reference the user
  can copy (`audio-1a2b3c4d`, `motion-…`, `subtitle-…`, with `project:<id>` / `scene:<id>`).
  Resolve it with `scribis_resolve_ref`, or pass it directly as `block_id` / `clip_id` / `id`.
- **Find before editing.** `get_all_subtitles` takes `query` (substring) or
  `query` + `regex=true`, and time/index ranges. `get_subtitles_at_time` answers
  "what is said at 11:50" (convert to seconds). Subtitles include word timings
  (`words[].start/end`) when the transcript has them; they describe the original
  recording. For what is heard where TTS replaced speech, use `cuts_get_speech_words`
  (see the `scribis-voice` skill).
- **Fix subtitles in one review.** On the transcript page, collect all corrections
  and send one `batch_correct_subtitles(..., auto=false)`. Use `add_subtitle` /
  `delete_subtitle` to split or merge lines, and the `*_translated_*` tools for
  translations. In the Cuts editor those tools return an error; use
  `update_timeline_block(id=<subBlocks id>, parameters={"text": …})` per line
  (applies immediately as one undo step, so list the changes for the user).
- **Rough cut = deletion blocks.** Filler words, long pauses (default > 0.8 s,
  keep ~0.2–0.3 s), retakes and false starts (keep the last complete take) are
  removed on word boundaries with a little padding. Send them together:
  `delete_segment(segments=[...], summary=...)` defaults to `mode="review"`, so
  the user sees the ranges in Scribis and accepts or rejects them; read the
  decision with `get_timeline_state` → `deletionReview.recent`. Only one proposal
  can wait at a time. `mode="auto"` applies immediately — use it only when the
  user asked you to cut without review. Remove a wrong cut with
  `delete_timeline_block(id)` (never `reset_timeline`, which clears everything).
  Afterwards remove cut words from the subtitle text and check
  `get_project_duration`.
- MCP timeline adds, updates, deletes, splits and resets each create one undo step
  when they change the timeline. `split_media(timestamp_sec)` splits crossing
  subtitles and supported effect blocks; it leaves audio clips unchanged and reports
  subtitles whose text cannot be split safely.
- **Emphasis.** Subtitles carry no loudness, so pick key moments from the text
  (numbers, names, contrasts, lists, calls to action) and time them from the word
  timings. For a quick punch-in use `add_zoom_block`. For HTML motion graphics,
  reuse a template via `scenes_find_motion_templates` or create one, and add it
  to a scene layer track with `scenes_edit` in review mode (see Scenes below).
- **Times are source-video seconds** for subtitles, cuts and effects; deletions
  do not shift them. Scene edits use scene seconds.
- **Verify** with `seek_player` + `render_preview_frame`, and report what changed,
  what waits for review, and what you skipped.

### Scenes

1. `cuts_list_projects` → pick the timelines (`project_id`) to combine.
2. `scenes_create(name, aspect_ratio?)` for a new scene, or `scenes_list` →
   `scenes_get(scene_id)` to reuse one (note its `revision`).
3. One `scenes_edit` with all operations: `add_clip(source="timeline",
   source_id=project_id)` appends to the storyboard; `set_transition(clip_id,
   edge="in"|"out", type, duration, easing?)`; music or other audio via
   `add_clip(source="asset", source_id=<cuts_list_assets id>, track="new_audio")`;
   `update_clip(clip_id, original_audio=false)` to keep only the TTS voices;
   motion graphics via `add_clip(source="asset", source_id=<html asset id>,
   track="new_layer", start, params)`.
4. With the scene open in Scribis, edits default to `mode="review"`: the user
   accepts or rejects them; read the decision with `scenes_get` →
   `review.recent`. A closed scene cannot be reviewed — ask the user to open it,
   or use `mode="auto"` only when they asked for edits without review.

---

## Environment Variables

- `SCRIBIS_MCP_PORT`: Port override for `--mcp` HTTP mode: the port shown in Settings → MCP (default 8890). Without it the CLI uses the port the running app publishes.
- `SCRIBIS_SOCKET_PATH`: Direct Unix domain socket or Windows named pipe override for stdio mode.
- `SCRIBIS_DISCOVERY_PATH` / `SCRIBIS_USER_DATA_PATH`: Override where `discovery.json` is read.
  By default macOS checks Application Support, the Mac App Store app group container
  and the MAS app container.

---

## Reference Documents

For detailed specs, parameters, and advanced usage, refer to:
- [MCP Playbook](references/mcp-playbook.md) — rules, spaces, IDs, errors and recipes for any model. Read first.
- [MCP Tools & Resources Specification](references/mcp-tools-spec.md) — full tool/resource list for the native MCP path.
- [Editing Recipes](references/editing-recipes.md) — subtitle search and fixes, filler/pause/retake removal, emphasis-driven motion graphics and other basic edits.
- [Scribis CLI Usage Manual](references/cli-usage.md) — full flag reference for the CLI path, including `scribis mcp-bridge`.
- [Supported ASR Models Reference](references/supported-models.md) — model families, install state, and how to query them.
- [Scribis Edit skill](../scribis-edit/SKILL.md) — entry point for `/scribis-edit cuts|scene <id>`: opens the editor, reads it and routes the request.
- [Scribis Motion skill](../scribis-motion/SKILL.md) — brief-first motion graphics: starters, the motion kit, review and single-detail edits.
- [Scribis Audio skill](../scribis-audio/SKILL.md) — music and sound effects: library search and import, generated effects, placement and levels.
- [Scribis Voice skill](../scribis-voice/SKILL.md) — TTS voice-overs, speaker voices and cloning, and word timing of what is heard for rhythm.
- [Motion Graphics Contract](references/motion-graphics.md) — `scribis.motion/1` HTML rules, parameters and a working template (also returned by `scenes_get_motion_guide`).
