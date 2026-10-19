# Scribis MCP Resources & Tools Specification

## Resources

- **`scribis://subtitles/current`**: Complete subtitles array of the current open project in JSON format (contains `id`, `start`, `end`, `text`, `words`, `language`).
- **`scribis://timeline/state`**: Live structure and state of the Scribis timeline (contains SubtitleBlocks, AudioBlocks, ZoomBlocks, MosaicBlocks, TextBlocks, CameraBlocks, DeletionBlocks).
- **`scribis://cuts/motion-guide`** (`text/markdown`): The `scribis.motion/1` HTML motion-graphic contract. Same content as `scenes_get_motion_guide`.
- **`scribis://cuts/motion-template`** (`text/html`): A working lower-third template that satisfies the contract.

Resources are optional for clients: every resource has an equivalent tool, so clients that only support tools (for example Codex) lose nothing.

---

## Tools

### 🎙️ ASR & Transcription Tools
| Tool | Arguments | Description |
|:---|:---|:---|
| `list_models` | None | Lists all installed transcription models (Whisper, SenseVoice, Parakeet, QwenASR) and indicates active default model. |
| `transcribe_audio` | `path? \| audio_data?, format?, model?, lang? (default auto), persist?` | Transcribes an audio/video file given as an absolute `path` or as base64 `audio_data`. `format` is the **file extension of `audio_data`** (e.g. `mp3`, `mp4`, `wav`, `m4a`; default `mp4`; `pcm`/`s16le` = raw 16 kHz mono 16-bit), not an output format. The result is JSON: `success`, `text` (all segment texts, one per line), `subtitles` (segments `{start, end, text}` in seconds of the file, plus `words` with per-word times when the model provides them), `duration` and, with `persist=true`, `script_id`. The tool has no SRT or VTT output: build it from `subtitles`, or use the CLI (`scribis transcribe <file> --output srt`), which converts the same result. `persist=true` also saves the transcript as a Scribis project (Pro only; otherwise nothing is saved and `script_id` is absent). |
| `cancel_transcription` | None | Cancels active MCP transcription task. |

### 🔊 TTS Synthesis Tools
| Tool | Arguments | Description |
|:---|:---|:---|
| `list_voices` | `engine?` | Lists available voices for Kokoro, Apple, Qwen3, MioCodec, Edge TTS or VoxCPM2. VoxCPM2 voices are installed WAV voices. |
| `generate_tts` | `text, voice_id?, ref_audio?, ref_audio_format?, lang?, speed?, engine?, instruct?, return_base64?` | Generates speech audio from text. Use either `voice_id` or Base64 reference audio. MioCodec accepts wav/mp3/m4a/flac/ogg/webm/aac; VoxCPM2 requires WAV. Both are staged in Scribis-managed temp storage and support up to 20 MiB. VoxCPM2 uses `engine="voxcpm2-tts"` and an installed WAV reference voice from `list_voices({engine:"voxcpm2-tts"})` or a WAV `ref_audio`; `instruct?` sets its voice style. Local engines can fail on long sentences, so split long text at sentence-ending punctuation and synthesize each chunk in order. |

### 🧑‍🎤 Avatar Video Tools
| Tool | Arguments | Description |
|:---|:---|:---|
| `create_avatar` | `image_path?`, `image_data?`, `image_format?`, `audio_path?`, `audio_data?`, `audio_format?`, `max_dimension?`, `enable_binary?` | Generates an MP4 from one photo and one audio file. Provide each input as a path or Base64/data URL. `max_dimension` accepts 256 or 512 pixels (default 512). Returns `video_path` in Scribis temp storage by default; `enable_binary=true` returns `video_base64`. If the selected Avatar model is not installed, reports that without downloading it. |

### 🎬 Frames & Vision Preview Tools
| Tool | Arguments | Description |
|:---|:---|:---|
| `render_preview_frame` | `timestamp_sec?, include_wireframe?` | Seeks the open **Cuts / timeline editor** to `timestamp_sec` (default: playhead), waits until that frame is decoded, and returns the composite (video, effects, mosaic, subtitles, Cuts visual and HTML layers) with the rendered `timestamp_sec`. Does not render scenes. |
| `get_video_frame` | `timestamp_sec, video_path?` | Extracts raw video frame at specified timestamp (FFmpeg when installed, otherwise native/Chromium decoding). |
| `get_current_frame` | `include_wireframe?` | Captures current player Canvas frame. |
| `seek_player` | `timestamp_sec` | Moves the timeline editor playhead (no confirmation; prefer `render_preview_frame(timestamp_sec)` to look at a time). |

### ✂️ Timeline Editing Tools
The Timeline Editor (or a Cuts project) must be open in Scribis. Times are source-video seconds. `delete_segment` defaults to user review; the other tools apply immediately. Recipes: [editing-recipes.md](editing-recipes.md).

| Tool | Arguments | Description |
|:---|:---|:---|
| `get_timeline_state` | None | Reads the open timeline editor: `subBlocks` (subtitle IDs for `update_timeline_block`), audio, deletion, zoom, mosaic, text, camera and speed blocks, video path, durations, playhead, and `deletionReview` (`pending` proposal, `recent` decisions). Times are source seconds. Mosaic boxes are top-left x/y/w/h over the source frame; `size: 0` = marked area (not pixelated); `detectedType` (face, email, …) comes from Auto Mosaic. Text x/y is the text center in the output frame. |
| `get_project_duration` | None | Original media duration, effective duration after deletions/splits, and total deleted duration. |
| `delete_segment` | `start, end \| segments: [{start, end}] (≤ 500), mode?, summary?` | Cuts ranges with DeletionBlocks (rough cut). `mode="review"` (default) shows the ranges in the editor for Accept/Reject and returns `status: "pending_review"` + `proposal_id`; one proposal waits at a time and expires when another video/project opens. `mode="auto"` applies immediately and returns `block_ids`, `created`, `reused`. Ranges are clamped to the media; ranges matching or inside an existing deletion are reused. Each applied batch is one undo step. The editor's **Auto-accept AI** toggle applies `review` requests immediately (`status: "applied"`). |
| `split_media` | `timestamp_sec` | Splits each subtitle and supported effect block that strictly crosses the source time. Audio clips are not split; returns skipped subtitle IDs when text cannot be divided safely. One undo step. |
| `add_timeline_block` | `type, start, end, parameters` | Generic add for `zoom`, `mosaic`, `text`, `camera`, `subtitle`. Each successful add is one undo step. Prefer the typed tools below. |
| `add_zoom_block` | `start, end, scale, x?, y?, enable_end_position?, end_scale?, end_x?, end_y?` | Zoom/punch-in on a focal point (0–1 coordinates); optional end position for Pan & Zoom. |
| `configure_zoom_motion` | `id, start_scale, start_x?, start_y?, end_scale, end_x?, end_y?` | Sets Ken Burns motion on an existing zoom block. |
| `add_mosaic_block` | `start, end, x?, y?, w?, h?, grain?, size?` | Mosaic over a box of the source frame: **x, y = top-left**, w, h = size (fractions 0–1; defaults x = y = 0.4, w = h = 0.2 = centered). `grain`: `none` (mark only, no pixelation), `fine` 8 px, `medium` 15 px (default), `coarse` 30 px; or `size` in px (0 = none). |
| `add_text_block` | `start, end, content \| text, x?, y?, color?, fontSize?` | Text overlay; x/y = the text **center** (0–1 of the output frame). Styling and animated **text effects** are set afterwards with `update_timeline_block` (see *Text block parameters* below), or in one call with `add_timeline_block(type="text", parameters={…})`. |
| `add_camera_block` | `start, end, layout?, aspect_ratio?, cameras?` | Multi-camera block (layouts such as `single`, `9_16_top_bottom`, `16_9_grid_4`). |
| `switch_camera_source` | `id, active_camera_id` | Switches the active camera of a camera block. |
| `set_camera_layout` | `id, layout?, aspect_ratio?` | Changes a camera block's layout or aspect ratio. |
| `configure_camera_subviews` | `id, cameras: [{id, x, y, scale}]` | Focal point and zoom per camera view. |
| `update_timeline_block` | `id, parameters` | Merges parameters into a block (IDs from `get_timeline_state`). Each successful update is one undo step. |
| `delete_timeline_block` | `id` | Removes a zoom, mosaic, annotation, text, camera, subtitle or deletion block. Removing a deletion block restores that range. Each successful removal is one undo step. Unknown IDs return an error. |
| `batch_delete_timeline_blocks` | `ids` | Removes several blocks, including deletion blocks; returns `deletedIds` and `notFoundIds`. The full batch is one undo/redo step. |
| `reset_timeline` | `confirm` (must be `true`) | Clears **all** zoom, mosaic, text, camera and deletion blocks in one undo step (annotation, speed and audio-mix blocks stay). Refused without `confirm=true`. Only when the user explicitly asks for a full reset; remove single blocks with `delete_timeline_block`. |

**Text block parameters** (`update_timeline_block(id, parameters)` on a `textBlocks` ID, or `add_timeline_block(type="text", parameters)`; keys are merged into the block, unknown keys are kept, out-of-range numbers are clamped):

| Group | Keys |
|:---|:---|
| Content and position | `content` (or `text`), `x`, `y` (center, 0–1), `start`, `end` |
| Font | `fontFamily` (an installed family name, default `Arial`), `fontSize` (8–300 px), `fontWeight` (`normal`, `bold`, `100`–`900`), `fontStyle` (`normal` \| `italic`), `underline`, `color`, `textOpacity` (0–1), `textAlign` (`left` \| `center` \| `right`), `writingMode` (`ltr` \| `rtl` \| `ttb`), `lineHeight` (0.5–5), `charSpacing` (−20–100 px) |
| Box | `enableBackground`, `backgroundColor`, `backgroundOpacity` (0–1), `borderRadius` (0–100), `paddingX` / `paddingY` (0–200 px) |
| Outline and shadow | `strokeColor`, `strokeWidth` (0–50), `enableShadow`, `shadowColor`, `shadowOpacity` (0–1), `shadowDistance` (0–200), `shadowAngle` (0–360°), `shadowBlur` (0–200) |
| Highlight | `highlightText` (a substring to emphasize), `highlightColor`, `highlightBgColor`, `highlightFontSize`, `highlightFontWeight` |
| Animated effect | `textEffect: { type, speed?, intensity?, cursorColor?, showCursor?, accentColor? }` — `type` is one of the effects below (`none` = static); `speed` is a tempo multiplier 0.2–3 (1 = default), except `typewriter`, `karaoke` and `cycle`, where it is a reveal rate of 1–60 characters per second; `intensity` 1–10 (`float`, `shake`, `swing`); `cursorColor` / `showCursor` for `typewriter`; `accentColor` for `karaoke` and `scramble` |

Text effect `type` values: entrance — `typewriter`, `karaoke`, `animated`, `fadeUp`, `blurIn`, `popIn`, `slideIn`, `dropBounce`, `stomp`, `flipIn`, `wordByWord`, `softWipe`, `trackingIn`, `scramble`; motion — `bounce`, `wave`, `float`, `shake`, `swing`, `rotate`, `cycle`; emphasis — `pulse`, `zoom`, `fade`, `jelly`, `ripple`, `marker`, `shine`; stylistic — `glow`, `flicker`, `rainbow`, `gradientFlow`, `glitch`, `extrude`, `echo`. Entrance effects play once from the block start; the others loop for the block's duration. Check the result with `render_preview_frame` at a time inside the block (entrance effects: 0.3–0.6 s after `start`).

### 📝 Subtitles Tools
Reads (`get_all_subtitles`, `get_subtitles_at_time`, `get_current_subtitle`) come from the **open** editor: the Cuts / timeline editor first, else the transcript page. With nothing open they return an error ("open one with cuts_open_project"); they never guess from other projects.

Writes (`update_subtitle`, `batch_correct_subtitles`, `add_subtitle`, `delete_subtitle`, translated updates) edit the **transcript page** subtitle list and return an error when it is not open. In the Cuts editor, change subtitles with `update_timeline_block(id=<subBlocks id>, parameters={"text": …})`, `add_timeline_block(type="subtitle")` and `delete_timeline_block`.

Edits default to `auto=false` (a diff the user accepts in Scribis). `id` accepts the subtitle ID or its index; prefer IDs, since indexes shift.

| Tool | Arguments | Description |
|:---|:---|:---|
| `get_all_subtitles` | `from_index?, to_index?, from_time?, to_time?, query?, regex?` | Subtitles with `id, start, end, text, language, words` (word `token/start/end`). `query` is a case-insensitive substring, or a case-insensitive regex with `regex=true`. Returns `total_count`, `matched_count`. |
| `get_subtitles_at_time` | `timestamp_sec` | Subtitle segment(s) at a time. |
| `get_current_subtitle` | None | Subtitle at the player's playhead. |
| `update_subtitle` | `id, text, start?, end?, auto?` | Corrects one subtitle (text and/or timing). |
| `batch_correct_subtitles` | `corrections: [{id, text, start?, end?}], auto?` | Corrects many subtitles in one review. |
| `add_subtitle` | `text, start, end` | Adds a subtitle segment. |
| `delete_subtitle` | `id` | Deletes a subtitle segment. |
| `change_current_language` | `lang` | Switches the language shown in the UI (`default` = original). Review-mode edits of the original text need `default`. |
| `get_available_translation_languages` | None | Translation languages of the project. |
| `create_translation_language` | `lang` | Registers a new translation language. |
| `get_translated_subtitles` | `lang?, from_index?, to_index?, from_time?, to_time?, query?, regex?` | Translated subtitles with the same filters (omit `lang` for the original). |
| `update_translated_subtitle` | `lang?, id, text, auto?` | Corrects one translated subtitle. |
| `batch_update_translated_subtitles` | `lang?, corrections: [{id, text}], auto?` | Corrects many translated subtitles. |

### 🧠 LLM Generation & Models Tools
| Tool | Arguments | Description |
|:---|:---|:---|
| `list_llm_models` | `filter?` (`all` \| `installed` \| `apple` \| `local`) | Lists available local and on-device LLM models (Apple Intelligence on ARM64 macOS 26+, Private Cloud Compute on MAS macOS 27+, and all local/custom GGUF models). Cloud LLM models are explicitly excluded. |
| `llm_completion` | `model, messages, system_prompt?, temperature? (0–2; Apple 0–1), max_tokens? (1–32768)` | Generates text/chat completion using Apple Intelligence, Private Cloud Compute, or a local GGUF model. Generation options are applied by the selected engine. |

---

## 🧭 Open pages in Scribis

These tools bring the Scribis window to the front and open a page, so the user can watch and review later edits. They never close an open editor: while a Cuts or scene editor is open (other than the requested one), they return an error asking the user to save and close it first.

| Tool | Arguments | Returns / Behaviour |
|:---|:---|:---|
| `app_open_youtube_browser` | `url?` | Opens the YouTube AI browser; with `url` (youtube.com `watch`/`shorts`/`embed`/`live`, `m.`/`music.` hosts, `youtu.be`, or a bare 11-character video ID) it also loads that video. Other hosts are rejected. Returns `video_id`, the canonical `url` (a `t` start time is kept) and `quota` (`is_pro`, `counts_as_new_video`, `used`, `limit`, `remaining`). Free accounts may load 10 new videos per month (saved history videos are free); past the limit it fails with `error_code: "YOUTUBE_MONTHLY_LIMIT_REACHED"` and nothing opens. A failed quota check refuses too. |
| `cuts_open_project` | `project_id` | Opens a Cuts project in the timeline editor. The ID comes from `cuts_list_projects` or a pasted `/scribis-edit cuts <id>` command (the **copy** button next to **Open editor** in Cuts → Recent edits copies it). Fails when the project or its source video is missing. `status`: `opened` (the editor reports it), `already_open`, or `requested` (still loading; confirm with `cuts_get_project`). |
| `scenes_open` | `scene_id` | Opens a scene in the scene editor. The ID comes from `scenes_list` or a pasted `/scribis-edit scene <id>` command (copy button next to **Open** in Cuts → Scenes). Same `status` values; confirm `requested` with `scenes_get`. |

Use these before review-mode edits when the target is closed, instead of falling back to `mode="auto"`: `cuts_open_project(project_id)` → `cuts_place_visual(..., mode="review")`.

---

## ▶️ YouTube

Captions of YouTube videos for summaries, quotes, translations and explainers. **Quota:** a free account may use 10 new YouTube videos per calendar month, shared with the YouTube AI browser; a video counts once (the first of opening it or fetching its captions), and videos in the YouTube history are free to reopen and re-read. Pro is unlimited. Past the limit the tools fail with `error_code: "YOUTUBE_MONTHLY_LIMIT_REACHED"` and the `quota`; nothing is fetched. Failed fetches charge nothing, and a failed license check refuses instead of fetching unmetered. Before a task that needs several new videos, call `youtube_get_quota`, say how many loads it uses and ask before spending the last ones; past the limit, do not retry or look for a workaround. Auto-generated captions (`auto_generated: true`) lack punctuation and can mishear names: say so when quoting.

| Tool | Arguments | Returns / Behaviour |
|:---|:---|:---|
| `youtube_get_captions` | `url, lang?, format? (text \| cues \| srt; default text), from_time?, to_time?, query?, offset?, limit? (1–2000, default 300), include_words?, open_browser?` | Saved history videos are read from the history (`source: "history"`, free); a new video is fetched from YouTube, charged once and saved to the history (`source: "youtube"`). When YouTube refuses the direct request (common: it now requires the player's token), the tool opens the video in the YouTube AI browser (refused while an editor is open), waits up to about 45 s for the page to save the captions, and returns them (`source: "youtube_browser"`, charged once by the page); `error_code: "YOUTUBE_CAPTIONS_PENDING"` means not saved yet, call again shortly. `text_language` is the language detected in the returned text: the history's `original` track is the track the browser loaded and can be a translation, so pass `lang` (see `saved_languages`). `text` = one `[m:ss] text` line per cue; `cues` = `{id, start, end, text, words?}` in video seconds; `srt` = SubRip. Also `language`, `track_name`, `available_tracks` (`language`, `name`, `auto_generated`), `saved_languages`, `duration_sec`, `cue_count`, `matched`, `returned`, `next_offset` (page with `offset`), `charged`, `quota`. A language missing from the history is fetched (free for saved videos). `open_browser=true` then opens the video in the YouTube AI browser (`browser` holds that result; captions are returned even if it is refused). |
| `youtube_get_quota` | None | `is_pro`, `used`, `limit` and `remaining` (both `null` for Pro), `month`, `message`. Never charges. |
| `youtube_list_history` | `query?, limit? (1–200, default 30)` | `videos` (newest first): `video_id`, `url`, `title`, `channel_name`, `updated_at`, `has_captions`. Free to reopen and re-read. |

---

## 🎞️ Cuts Projects

Cuts projects are saved timeline presets. Besides its own video, the Cuts timeline editor takes HTML motion graphics on visual tracks and music or sound effects on audio tracks; images and videos are placed in [scenes](#-scenes). See the `scribis-audio` skill for music and sound-effect rules.

> **Temporarily unavailable** (not registered): `cuts_add_track` (`cuts_place_visual` creates a visual track when needed). Motion-graphic template tools are the [scene motion-graphic tools](#scene-motion-graphics) (`scenes_get_motion_guide`, `scenes_find_motion_templates`, `scenes_*_motion_graphic`); they serve both scenes and Cuts timelines.

| Term | Meaning |
|:---|:---|
| Project | A Cuts timeline preset (`project_id`). The project open in the Scribis editor is the *live* project; its unsaved state is what tools read and edit. |
| Asset | Immutable file in the Cuts library (`asset_id`): image, video, audio or `html` motion graphic. |
| Revision | Content hash of the project's tracks, visual blocks and music/sound-effect blocks (not TTS speech). Pass it back as `expected_revision` to avoid overwriting edits the user made in between. |

| Tool | Arguments | Returns / Behaviour |
|:---|:---|:---|
| `cuts_list_projects` | `query?, limit?` | Projects (newest first) with `source_name`, `source_available`, `open_in_editor`; plus `editor_open`, `open_project_id`. |
| `cuts_get_project` | `project_id?` | `tracks` (order + hidden/locked/muted), `visual_blocks` (with `source_offset` / `source_end` except images: the part of the asset the block shows), `audio_blocks` (music and sound effects: `block_id`, `track_id`, `asset_id`, start, end, `source_offset`, `source_end`, `speed`, volume, and, when the block has a volume envelope, `volume_keyframes`, `fade_in`, `fade_out`, `duck_db`), `speech_blocks` (count of TTS blocks), `counts`, `duration`, `revision`, `live`, and `review` (`pending` proposal + `recent` decisions). Omit `project_id` to read the open project. |
| `cuts_list_assets` | `kind?, query?, limit?, all_versions?` | Assets with kind, duration, scope (`library` \| `project`), description, tags and, for `html`, a motion summary. HTML templates appear once, as their latest version, with `version_count`, `older_version_ids`, `usage_count` (placements of any version in saved projects and scenes) and `last_used_at` (a `query` matching any version returns the template); `all_versions=true` lists every version. Use the IDs as `source_id` for scene clips. |
| `cuts_search_assets` | `query?, kind? (audio \| image \| video \| html), tags?, min_duration?, max_duration?, scope? (all \| library \| project), limit? (default 20)` | Ranked library search: keyword relevance on name, description, tags (and template params), plus content similarity from the Media Search Index (what is heard in audio, seen in images incl. OCR and video keyframes) when it is built. One result per HTML template (latest version); block copies are excluded. Each result: asset summary with `index_status`, `score`, `match` (`keyword` \| `semantic` \| `filter`), `sfx` for generated effects. Audio and video assets matched by content also have `match_times`: up to 3 `{start, end?, start_label, similarity}` in source seconds, best first (audio is indexed in 30-second windows, so a short clip reports `0`–its end; video points at matching scenes and keyframes). Use a `start` as `scenes_edit add_clip` `trim_start` to begin a clip at the matched moment. An asset indexed before match times existed has `index_status` `stale` and no `match_times` until it is re-indexed (Cuts → Build / update Media Search Index). Also `semantic_search`, `unindexed` and a `hint` when content was not searched. Filters alone (no query) list newest first. |
| `cuts_import_asset` | `path, description, tags?, name?` | Copies a local audio/image/video/HTML file into the Cuts library (the original stays untouched). **Path only**: `path` is an absolute path on the computer running Scribis; there is no base64 or URL alternative. `description` is required (it is how the asset is found later). Supported: audio wav, mp3, m4a, aac, flac, ogg; images png, jpg, jpeg, webp, bmp; video mp4, mov, mkv, webm, m4v; html. HyperFrames HTML is converted to a self-contained motion template on import (as `scenes_import_motion_graphic` does, with `<video>`/`<audio>` removed): a sub-composition file (`compositions/<scene>.html`) is imported as that one scene through the project `index.html` that hosts it (searched up to three folders above it), and is rejected with the reason when no project hosts it and its root has no `data-duration`. In the sandboxed Mac App Store build a file the user has not granted returns an error explaining access; then ask the user to import the file in Scribis (Cuts library) and find it with `cuts_search_assets`. Tags are merged with automatic ones. Returns the asset and where to place it. |
| `cuts_detect_faces` | `action (start \| status), project_id?, grain? (none default), fps? (1, 2, 4), rescan?, confirm?` | Runs the editor's Auto Mosaic **face** scan on the whole video of the open project. Grain `none` only marks faces (no pixelation, export unchanged) so overlays can avoid them. Optional: scan only when the user wants face-aware placement (ask first). `fine`/`medium`/`coarse` pixelate faces without review and need `confirm=true` (only when the user asked). Long-running: `start`, then `status` every 10–20 s until `done` (count), `none`, `stopped` or `error`. `start` returns the existing count instead of scanning again unless `rescan=true`. Needs the face models (Settings → Experimental). |
| `cuts_get_avoid_regions` | `start, end, project_id? \| scene_id?, margin?, include_faces?, content_aspect?` | Areas to keep clear between start and end (tracked faces/mosaics incl. grain-none markers, visuals already placed) and `free_areas`: the largest clear rectangles (grown up to the regions, 4% safe area), ranked by usable size in pixels of the frame (`frame_aspect`), each with `aspect` and `coverage`; `content_aspect` (graphic width/height) ranks by how large that shape fits and adds a `fit` box. `include_faces=false` ignores tracked faces when the user does not want face-aware placement. Cuts: source seconds; boxes as `bounds` (source frame) and `output_bounds` (output frame = `cuts_place_visual` transform space). Scenes: scene seconds; `scene_bounds` (scene canvas = `scenes_edit` x/y/w/h), mapped through the clip rect and rough cuts. All boxes: fractions 0–1, x, y = top-left. |
| `cuts_place_visual` | `asset_id, start, end?, track_id?, transform?, keyframes?, params?, project_id?, expected_revision?, mode?` | Places an **HTML motion graphic** (other kinds are rejected) on a visual track above the original video. Times are source-video seconds; `end` defaults to `start + 5` within the source. `params` are validated against the manifest (only non-default values are stored). Review by default on the open project; closed projects need `mode="auto"`. |
| `cuts_update_visual` | `block_id, start?, end?, transform?, keyframes?, params?, asset_id?, source_offset?, project_id?, expected_revision?, mode?` | Moves (keyframes shift along), retimes or repositions a visual block; `keyframes: null`/`[]` clears, `params: null` resets to defaults; `asset_id` swaps to another HTML motion graphic (e.g. a new version, params kept). A block shows its asset from `source_offset` (video media time, HTML composition time `t`): moving only the start edge (same `end`) **trims** the content and advances `source_offset`; a move, or a move with a new length, keeps it; `source_offset` sets it directly. A video block may end before its source does; `end` is bounded by what is left of the video after `source_offset`. Video cannot start before its first frame; an HTML block back at `t` 0 just starts earlier, and images have no `source_offset` (they just get longer). Swapping to a different asset resets `source_offset` to 0, except a new version of the same HTML composition, which keeps it. `keyframes` need at least one time inside the block; keyframes outside it only shape its edges (split parts keep the ones their neighbour uses). |
| `cuts_remove_visual` | `block_id, project_id?, expected_revision?, mode?` | Removes a visual block; the asset stays in the library. |
| `cuts_split_block` | `block_id, time, project_id?, expected_revision?, mode?` | Splits a visual block or a music/sound-effect block at a source-video `time` (at least 0.1 s inside it) into two blocks that play on exactly as before: the second one's `source_offset` continues where the first ends. Keyframes and volume envelopes keep their times. TTS speech blocks are rejected. Returns `block_ids` (the original and the new one). |
| `cuts_merge_blocks` | `block_ids` (exactly two), `project_id?, expected_revision?, mode?` | Joins two neighbouring parts of the same footage back into the earlier block (which keeps its ID). Both visual or both music/sound-effect blocks on one track, same asset and speed, the later one continuing where the earlier one ends in the source (its `source_offset` = the earlier `source_offset` + length × speed, within half a frame), same placement, params, keyframes or volume envelope. A gap between them is closed (the later part moves earlier). TTS speech is rejected; errors name the reason (e.g. `cannot merge: the blocks use different assets`). |
| `cuts_place_audio` | `asset_id, start, end?, volume? (0–2, default 1), fade_in? (s), fade_out? (s), volume_keyframes?, track_id?, project_id?, expected_revision?, mode?` | Places music or a sound effect (Cuts **audio** asset) on a Cuts audio track: the first audio track with room, or a new one; tracks never hold overlapping clips and the built-in speech track only holds TTS. The block plays the asset from its start; `end` defaults to where the asset or the source video ends (music longer than the video is cut there). Source-video seconds. `volume_keyframes` and the fade presets build the block's volume envelope (see below). Closed projects whose audio was never saved ask you to open the project first. |
| `cuts_update_audio` | `block_id, start?, end?, volume?, volume_keyframes? (array \| null), fade_in?, fade_out?, source_offset?, project_id?, expected_revision?, mode?` | Moves (keeps the length; the envelope moves along), trims (envelope points keep their times), re-levels or reshapes a music/sound-effect block; it can be shortened but never made longer than its audio after `source_offset`. The block plays source time `source_offset + (t - start) × speed`; moving only the start edge (same `end`) trims the audio there and advances `source_offset`. `volume_keyframes` replaces the envelope (`null`/`[]` clears), then `fade_in`/`fade_out` rewrite their edge (`0` removes). Fields not given keep their value. TTS speech blocks are rejected. |
| `cuts_duck_audio` | `block_ids?, amount_db? (1–40, default 12), attack? (0.01–2, default 0.15), release? (0.01–3, default 0.4), clear?, project_id?, expected_revision?, mode?` | Duck preset: computes the speech of the project (audible TTS voices and placed voice-over blocks, i.e. assets tagged `tts`, plus subtitle timings when the original sound plays, deleted parts excluded) and writes `duck` points into each block's envelope (gaps shorter than attack + release stay ducked). Replaces only existing `duck` points; `clear=true` removes them. Default blocks: all music blocks on audible tracks; TTS and voice-over blocks are rejected. Errors when nothing speaks. |
| `cuts_remove_audio` | `block_id, project_id?, expected_revision?, mode?` | Removes a music/sound-effect block; the asset stays in the library. |
| `cuts_set_track_state` | `track_id, hidden?, locked?, muted?, project_id?, mode?` | Works for added tracks and built-in ones (`subtitles`, `text`, `zoom`, `mosaic`, `annotation`, `camera`, `audio`, `audioMix`, `thumbnail` = original video). Locked tracks reject edits until unlocked. |

**Routing and review (`cuts_set_track_state`):**

- **Open project** (no `project_id`, or the ID of the project in the editor): the edit is validated in the editor. `mode="review"` (default) shows an *AI edit proposal* bar above the canvas with **Accept / Reject / Show**; the tool returns `status: "pending_review"` and a `proposal_id`. Read the outcome later with `cuts_get_project` → `review.recent` (`accepted`, `rejected`, `conflict`, `expired`). Accepted proposals are re-validated against the current timeline and applied as one undo step; autosave persists them. `mode="auto"` applies immediately (still undoable). Only one proposal can wait at a time. When the user turns on **Auto-accept AI** in the editor toolbar, `review` requests are applied immediately and return `status: "applied"` like `auto`.
- **Closed project** (`project_id` of a project not open in the editor): only `mode="auto"` is allowed; the change is written to the saved project and appears the next time it is opened. Without `auto` the tool explains how to proceed.
- **Nothing open and no `project_id`**: the tool asks you to list projects and have the user open one.

---

## 🔊 Sound effects

Generated effects are procedural recipes rendered offline (Web Audio in a hidden, sandboxed window), saved as Cuts audio assets tagged `sfx`, the recipe id and its category. They are normalized to -1 dBFS peak; set the level when placing.

| Tool | Arguments | Returns / Behaviour |
|:---|:---|:---|
| `audio_list_sfx_recipes` | `category? (transition \| hit \| ui \| tonal \| texture)` | `recipes` (recipe, title, category, use_for, duration range, params with type/default/min/max/options) and `placement` level guidance. Recipes: `whoosh`, `riser`, `drop`, `impact`, `pop`, `click`, `notify`, `ding`, `sparkle`, `glitch`, `typewriter`. |
| `audio_generate_sfx` | `recipe, params?, duration?, seed? (default 1), name?, description?, tags?, reuse? (default true)` | Renders the effect and returns `asset_id`, name, duration, tags, `sfx` (recipe, revision, params, seed, duration, `peakDb`, `rmsDb`) and `reused`. The same recipe, params, seed and duration reuse the earlier asset; `seed` varies the random parts (noise, sparkle and glitch timing). Renders are reproducible (identical or within 1 LSB). Place with `cuts_place_audio` or a scene audio track. Scene clips need at least 0.1 s: an effect shorter than that (the default `click` is 0.06 s) comes back with a `warning`; generate it with `duration >= 0.1` for scenes. |

## 🔖 AI references

Every item selected in the Cuts or Scene editor shows an **AI reference** (`<kind>-<first 8 letters/digits of its ID>`) with a copy button; the copied line adds the name, time range and `project:<id>` / `scene:<id>`, e.g. `Scribis Cuts audio-1a2b3c4d "Bed.wav" 0:12–0:45 · project:9f8e…`. A scene clip's line also gives the **source range** it shows after its scene time, e.g. `Scribis Scene motion-1a2b3c4d "Title.html" 0:07.09–0:28.25 (source 0:05.38–0:26.54) · scene:…`: for an HTML clip that is the composition's own time `t`, for a video the media time, for a timeline its output time (images have none). Cuts visual blocks (not images) and music/sound-effect blocks show it the same way. Kinds: `motion`, `image`, `video`, `audio` (music/effects/stems), `speech` (TTS), `timeline` (scene timeline clip), `subtitle`, `zoom`, `mosaic`, `text`, `note` (annotation), `camera`, `cut` (deletion), `speed`, `mix` (audio mix).

| Tool | Arguments | Returns / Behaviour |
|:---|:---|:---|
| `scribis_resolve_ref` | `text, project_id?, scene_id?` | For each reference in the text: `status` (`found`, `found_in_both`, `ambiguous`, `missing`) and `matches` with `editor` (`cuts` \| `scene`), `project_id` / `scene_id`, `live`, `kind`, full `id`, `list` (Cuts editor list), name, start/end (`time_space`: source-video or scene seconds) and `edit_with`. Scene clips other than images also return `source_start`, `source_end` and `speed`: the clip shows source time `source_start + (scene_t - start) × speed`. Cuts visual (not image) and music/sound-effect blocks return `source_start`, `source_end` and `speed` too. Searches the open editors, or the project/scene the line names. |

References are also accepted directly as `block_id` by `cuts_update_visual`, `cuts_remove_visual`, `cuts_update_audio`, `cuts_remove_audio`, `cuts_split_block` and in `block_ids` by `cuts_merge_blocks` (a pasted line also sets the project), as `clip_id` / `clip_ids` in `scenes_edit`, and as `id` / `ids` by `update_timeline_block`, `delete_timeline_block` and `batch_delete_timeline_blocks`. A reference of the wrong kind for a tool is rejected with a hint; an ambiguous one asks for the full ID.

## 🗣️ Speech: voices, TTS and word timing

| Tool | Arguments | Returns / Behaviour |
|:---|:---|:---|
| `audio_list_voices` | `project_id?` | `voices` (the Cuts TTS catalog: favorite Kokoro/Edge/OpenAI, Voice Lab MioCodec/Qwen3/VoxCPM2, Chatterbox, Apple; `voice`, `label`, `model`) and, for the open or given Cuts project, `speakers` (`speaker_id`, name, assigned `voice`, `clones_from_video`, `can_clone`). A speaker's `voice` may be the literal value `clone_current`: that speaker is voiced by a clone of their own voice from the project video, and then `clones_from_video` is `true`. `clone_current` is not a catalog voice: pass `speaker=<speaker_id>` (or `clone_speaker`) to `audio_generate_speech`, never `voice="clone_current"`. `can_clone` is `true` when the project's source video is available and the speaker has a subtitle segment to clone from, i.e. `clone_speaker` will work. `voice` is absent when no voice is assigned. |
| `audio_generate_speech` | `text, language, voice? \| speaker? \| clone_speaker? \| reference_asset_id?, project_id?, tags?, with_words?` | Exactly one voice source. `speaker` uses the voice assigned to that project speaker; `clone_speaker` clones it from the project video (its longest subtitle segment, ≤ 10 s, extracted with FFmpeg); `reference_asset_id` clones from the first 10 s of a library recording. Choose any voice from `audio_list_voices`, including VoxCPM2 WAV voices. Produces a Cuts audio asset tagged `tts` (project-owned with a project, else library) exactly like the Cuts TTS panel; `with_words` adds aligned word times (clip seconds). Cloning works in every build: with FFmpeg, or decoded in process (Symphonia) in the sandboxed Mac App Store build; a linked source video needs Scribis to have access to it. |
| `cuts_get_speech_words` | `project_id?, start?, end?, language? (default \| code), limit_blocks? (default 30)` | Words that are **heard** on a Cuts timeline: TTS blocks via ASR of their audio aligned to the block text (`source: "tts"`, `matched`), subtitles elsewhere (`source: "subtitle"`); subtitles a TTS block replaces contribute no words. Source-video seconds plus `output_start` (after rough cuts; `deleted: true` when cut). `tts_blocks` report `confidence` and `cached`; `next_start` continues long ranges. |
| `scenes_get_speech_words` | `scene_id?, start?, end?, language?, limit_blocks?` | The same in scene seconds: timeline clips mapped through rough cuts and trims (original words skipped when a clip plays without its original audio) and TTS clips on scene audio tracks. |
| `audio_get_speech_words` | `asset_id, text?, language?` | Word times inside one audio asset (clip seconds); TTS assets use their own text, other audio needs `text`. |

ASR uses the default transcription model through the same queue as `transcribe_audio`; results are cached per audio file and text, so repeated calls are instant.
**Volume envelope** (`volume_keyframes`, Cuts blocks and scene audio clips): points `{time, gain (0–2), curve? (linear default \| easeIn \| easeOut \| easeInOut \| hold), source? (fadeIn \| fadeOut \| duck)}` in absolute timeline seconds, like visual keyframes (moving the clip moves them, trimming keeps them). The gain multiplies the clip volume, `curve` shapes the segment to the next point, and the value holds before the first and after the last point. Points tagged `duck` form a layer that multiplies the others, so fades and manual points stay correct under ducking and presets replace only their own points. The editor preview (Web Audio ramps), the export (per-sample gain) and scene composition sample the same curve (curved segments every 20 ms), so they sound the same. Users edit it as a volume line on the clip.

## 📏 Levels and mix checks

Loudness is EBU R128, measured with FFmpeg (`ebur128`): integrated LUFS, true peak dBTP, loudness range LU. A volume `v` changes the level by `20·log10(v)` dB. Targets relative to speech: music under speech about -20 LU (warning above -15 LU), sound effects about -9 LU (warning above -3 LU), true peak after volume at most -1 dBTP, at most 8 effects per minute and 4 per 10 s. Builds without FFmpeg (Mac App Store) cannot measure: `audio_measure` returns an error and the checks report timing, fades and density only.

| Tool | Arguments | Returns / Behaviour |
|:---|:---|:---|
| `audio_measure` | `asset_id` | `integrated_lufs`, `true_peak_dbtp`, `loudness_range_lu`, `duration`, `silent`, and `volume_for` (`music_bed_under_speech`, `music_bed_with_12db_duck`, `sound_effect`) for typical -16 LUFS speech. Results are cached per file version. |
| `cuts_audio_check` | `project_id?, speech_lufs?` | Read-only check of a Cuts project's music and sound effects against its speech (live editor state when open, else the saved project; source-video seconds). `speech` (`lufs`, `measured_from`: TTS voice files and/or the original sound, `seconds`, `tts`, `original_sound`); `music[]` (`lufs`, `effective_lufs`, `under_speech_seconds`, `under_speech_lu` with the volume envelope, `ducked`, `duck_db`, `fade_in`, `fade_out`); `effects[]` (`relative_lu`, `words_covered`); `density` (`effects`, `per_minute`, `busiest_window`); `issues[]` (`severity` warning \| info, `code`, `block_id`, `at`, `message`, `fix` = the call to make, `suggested` values); `ok` (no warnings). Codes: `music_too_loud`, `music_barely_audible`, `music_overlap`, `missing_fade_in`, `missing_fade_out`, `sfx_over_words`, `sfx_too_loud`, `sfx_barely_audible`, `clipping_risk`, `sfx_density`, `duck_outdated` (the speech moved after ducking; re-run the duck preset), `not_measured`. `speech_lufs` (-70–0) replaces the measured speech level. Muted and hidden tracks are skipped. |
| `scenes_audio_check` | `scene_id?, speech_lufs?` | The same report for a scene's audio clips (scene seconds) against its speech: audible timeline clips (their TTS voices and, with original sound, subtitle timings, mapped through trims and rough cuts) and voice-over clips (assets tagged `tts`) on its audio tracks, which are speech rather than music. Fixes use `scenes_edit` (`update_clip` volume / fade_in / fade_out / volume_keyframes, `move_clip`, `remove_clip`) and `scenes_duck_audio`. |
| `scenes_duck_audio` | `scene_id?, clip_ids?, amount_db?, attack?, release?, clear?, mode?, expected_revision?` | Duck preset for scene audio clips: writes `duck` points from the scene's speech: audible timeline clips (TTS voices and, with original sound, subtitle timings, mapped through trims and rough cuts) and voice-over clips (assets tagged `tts`) on audible audio tracks. Default clips: all music clips on audible audio tracks; voice-over clips are rejected. Routed like `scenes_edit` (review when open, `mode="auto"` for a closed scene). |

## 🎬 Scenes

A scene combines Cuts timelines into one video.

- **Track 1 is the storyboard**: only timeline clips, played in order without overlaps. Transitions apply between adjacent storyboard clips. At a free end (no neighbour) any type works and the scene background stands in for the missing clip; `dissolve`, `fadeBlack` and `fadeWhite` fade the clip in or out. Layer clips only use `dissolve` (fade) or `none`.
- **Layer tracks** draw above the storyboard in layer order and hold timelines, images, videos and HTML motion graphics. Clips outside the storyboard only fade (`dissolve`) or use `none`.
- **Audio tracks** sit below the storyboard and hold only audio.
- **`original_audio`** on a timeline clip: `false` plays only its TTS voices plus the scene audio tracks; `true` plays the original video sound; `null` follows the timeline.
- **Sources**: timelines come from `cuts_list_projects` (`project_id`), assets from `cuts_list_assets` (asset `id`).

| Tool | Arguments | Returns / Behaviour |
|:---|:---|:---|
| `scenes_list` | `query?, limit? (1–200, default 50)` | Scenes, newest first, marking the one open in the scene editor. |
| `scenes_get` | `scene_id?` | Canvas, tracks (storyboard, layers, audio), clips with timing, placement, transitions and `original_audio`, the `revision`, the editor `playhead` (open scene) and AI `review` status. Uses live (unsaved) editor state when the scene is open. Omit `scene_id` to read the open scene. |
| `scenes_create` | `name, aspect_ratio?` (`16:9` default, `9:16`, `1:1`, `4:3`) | Creates an empty scene with a storyboard track. Add clips with `scenes_edit`. The storyboard holds only timelines; a faceless explainer puts HTML beats on a layer (`track:"new_layer"`, then `track:"previous"`). |
| `scenes_edit` | `scene_id?, operations[], mode? (review \| auto), expected_revision?` | Applies all operations atomically (all or nothing). `expected_revision` (from `scenes_get`) rejects the edit if the scene changed. Clip speed and placement keyframes are `update_clip` fields (see [scene-and-motion-rules.md](scene-and-motion-rules.md#speed-and-keyframes)). |
| `scenes_render_frame` | `scene_id?, timestamp_sec? \| times? (1–6; up to 12 with return="sheet"), width?, height?, return? (image \| path \| none \| sheet)` | Renders composite scene frames exactly as the scene preview and export show them: storyboard clips with transitions, layer tracks (timelines, images, videos, HTML motion graphics with their params) and the scene background. Uses the live (unsaved) editor state when the scene is open, otherwise the saved scene (any page; the scene editor need not be open). Waits for decoded video and prepared HTML layers before capturing. Times are scene seconds (default: the open editor's `playhead`); a time at the scene end renders the last frame. Size defaults to the canvas fitted within 1280 px; pass only `width` or `height` (16–1920) to keep the aspect ratio. Returns `scene_id`, `live`, `unsaved_changes`, `revision`, `width`, `height`, `frames` (`time`, temp `path`) and PNG image content (`return="image"`, default). A clip whose timeline or asset is unavailable fails with its `clip_id` and the reason. A `review` proposal shows only after the user accepts it. |

**Operations** (`op` decides which fields apply; times are scene seconds; `x/y/w/h` are 0..1 of the canvas, `rotation` in degrees):

| `op` | Fields |
|:---|:---|
| `add_clip` | `source` (`timeline` \| `asset`), `source_id` (project_id or asset id), `track_id` or `track` (`storyboard` \| `new_layer` \| `new_audio` \| `previous` = the track of the previous `add_clip` in this edit; default without either: the storyboard for timelines; otherwise the first **unlocked** layer (visual clips) or audio track (audio clips) in track order, which is a pre-existing track when the scene has one, and a new track of that kind when it has none), `start` (storyboard default: its end), `duration` (default: all of the source; 5 s for images/HTML), `trim_start`, `x/y/w/h/rotation`, `volume` (0–2, audio/video), `params` (HTML only) |
| `move_clip` | `clip_id, start, track_id` |
| `trim_clip` | `clip_id, edge` (`start` \| `end`), `time` (new edge time) |
| `split_clip` | `clip_id, time` |
| `merge_clips` | `clip_ids` (exactly two). Joins two neighbouring parts of the same footage on one track back into the earlier clip, which keeps its ID. They must show the same source at the same speed, the later part must continue where the earlier one ends in the source (`trim_start` = earlier `trim_start` + length × speed, within half a frame), and they must share placement, opacity, volume, `original_audio`, `params`, keyframe motion and volume envelope, with no transition between them. A gap between them on the scene is closed (the later part moves to the end of the earlier one). Errors name the reason, e.g. `cannot merge: the clips show different sources`. |
| `remove_clip` | `clip_id` |
| `update_clip` | `clip_id, x/y/w/h/rotation, opacity (0–1), volume (0–2), original_audio (true \| false \| null), params` (HTML only; `null` resets to the template defaults), `volume_keyframes` (audio clips: the volume envelope in scene seconds; `null` clears), `fade_in` / `fade_out` (audio clips: fade presets, 0–30 s, `0` removes), `speed` (timeline and video clips: 0.25–4, `null` = 1; keeps `start` and the source range, so the scene length becomes source range / speed and later storyboard clips move; on a layer it must fit before the next clip), `keep_duration` (with `speed`: keep the scene length and change the source range instead), `keyframes` (visual clips, at most 64: `[{time, x?, y?, w?, h?, rotation?, opacity?, easing?}]` with `time` in **clip-local** seconds, 0 = clip start; replaces all, `null` / `[]` clears; each value eases from the earlier keyframe and holds before the first / after the last; unset values use the clip's own placement and opacity) |
| `replace_asset` | `from_source_id` (the asset the clips use now), `source_id` (the new asset, same kind), `clip_ids?` (default: every clip using `from_source_id`). Switches clips to another asset, e.g. a new motion-graphic version; params are kept. |
| `set_transition` | `clip_id, edge` (`in` \| `out`), `type` (`none`, `dissolve`, `fadeBlack`, `fadeWhite`, `blur`, `wipe`, `wipeRight`, `wipeUp`, `wipeDown`, `clockWipe`, `slide`, `slideRight`, `slideUp`, `slideDown`, `coverLeft`, `coverRight`, `whip`, `circleOpen`, `circleClose`, `irisBox`, `splitVertical`, `splitHorizontal`, `zoomIn`, `zoomOut`, `spin`), `duration`, `easing` (`linear` default, `easeIn`, `easeOut`, `easeInOut`). Directions: `wipe` reveals left→right, `wipeRight` right→left; `slide` pushes the previous clip out to the left, `slideRight` to the right; `coverLeft`/`coverRight` slide the next clip over the previous one. |
| `reorder_storyboard` | `clip_ids` (storyboard clip IDs in the new order) |
| `add_track` | `kind` (`visual` = layer \| `audio`) |
| `remove_track` | `track_id` |
| `set_track` | `track_id, hidden?, muted?, locked?` |
| `move_track` | `track_id, direction` (`up` \| `down`; audio tracks move among audio tracks) |
| `set_canvas` | `aspect_ratio, background_color` (`#RRGGBB`) |

`params` are parameter values by key for HTML motion graphics, validated against the template manifest (see `scenes_find_motion_templates` / `scenes_get_motion_graphic` for the declared params).

**Review:**

- **Scene open in the Scribis scene editor**: edits default to `mode="review"`; the tool returns `status: "pending_review"` and the user accepts or rejects in the scene editor. Read the decision with `scenes_get` → `review.recent`. `mode="auto"` applies directly as one undo step. When the user turns on **Auto-accept AI** in the editor toolbar, `review` requests are applied immediately and return `status: "applied"` like `auto`.
- **Scene not open** (`scene_id` of a closed scene): it cannot be reviewed. Ask the user to open it (Cuts → Scenes), or pass `mode="auto"` to write the saved scene.
- **Saving**: like Cuts timelines, the open scene autosaves about 1 s after a change (accepted proposals included) unless the user switched autosave off in the scene's status menu. `scenes_get` → `unsaved_changes` is `true` only while a save is pending or autosave is off.
- **No scene open and no `scene_id`**: call `scenes_list`, then ask the user to open one or pass `scene_id` with `mode="auto"`.

### Scene motion graphics

HTML motion graphics are Cuts assets of kind `html` that follow the `scribis.motion/1` contract. They are placed as scene clips (`scenes_edit` → `add_clip(source="asset", params)`), usually on a layer track, or as Cuts visual blocks (`cuts_place_visual`).

| Term | Meaning |
|:---|:---|
| Template | Every HTML motion graphic is a reusable template in the user's **HTML templates** library (Cuts → HTML motion graphics). `template_id` (= the first version's `asset_id`) stays the same across versions; `latest_asset_id` is its newest version. Templates carry a searchable `description` and `tags`, and `derived_from` when they were made from another template. The UI shows the short ID (`#1a2b3c4d`) and **Copy ID** copies `Scribis HTML template <template_id> (<name>)` for pasting into an AI chat. |

| Tool | Arguments | Returns / Behaviour |
|:---|:---|:---|
| `scenes_get_motion_guide` | `starter?` (`lower_third` default, `kinetic_title`, `stat_chart`, `explainer`, `callout`, or the explainer beats `hook_title`, `points_list`, `takeaway_card`, `ui_walkthrough`, `logo_outro`) | The contract (`guide`, Markdown), the `starters` catalog (kind, title, use_for), the chosen starter as `template` (HTML), `built_in_templates` (the starters as read-only library templates: `template_id`, `latest_asset_id`, `starter`, `title`, `category`), `vocabulary` (`param_types`, `param_roles`, `categories`, `aspects`) and `installed_fonts`. Starters use the inline *Scribis motion kit* and expose every word, number, color and timing as params. Call before writing or editing a motion graphic. |
| `scenes_find_motion_templates` | `query?, category?, aspect?, at_time?, scene_id? \| project_id?, limit? (1–50, default 10)` | Ranked template search for natural-language references. `query` matches name, manifest title, category, description, tags, notes and parameter labels/roles/defaults (CJK works without spaces; full or 8+ character short IDs match exactly) and, when the Media Search Index is built, semantic similarity. `category` (`lower_third`, `title`, `chart`, `explainer`, `callout`, `caption`, `quote`, `cta`, `logo`, `overlay`, `background`, `transition`, `other`) and `aspect` (`16:9`, `9:16`, `1:1`, `4:3`; templates without one or with `any` always match) filter the results; either alone browses. Built-in templates are included (`built_in: true`) and are read-only. `at_time` is the time shown on the ruler (`"11:50"`, `"1:02:03"`, `"710"`): scene time on the open scene (or `scene_id`), else source-video time on the open Cuts project (or `project_id`); it returns the motion graphics placed there, or the nearest within 5 s. Each result: `template_id`, `latest_asset_id`, name, title, description, tags, `version`, `version_count`, duration, `category`, `aspects`, `built_in`, params (type/label/role/default), `derived_from`, `derived_from_template_id`, `usage_count` (placements of any version in saved Cuts projects and scenes), `last_used_at`, `score`, and `scene_clips` (with `clip_id`) for scene hits or `timeline_blocks` (with `block_id`) for Cuts project hits; `at_time` reports `scene_id` or `project_id`. |
| `scenes_create_motion_graphic` | `description, html? \| based_on + (html \| patches), tags?, name?, notes?, force?, project_id?, scene_id?, preview_times?, return? (image \| path \| none)` | Creates a **new template** in the shared HTML templates library. `description` is required: write what it shows, layout, colors, motion and intended use — it is the search index for the user and later agents. `tags` are normalized. With `based_on` (an asset ID, usually `latest_asset_id`), `patches` apply to that template's source; the result records `derived_from` and leaves the original untouched. Requires `<!DOCTYPE html>` and a valid manifest. Lints the document, renders probe frames (default: 0, markers, middle, end) offscreen exactly like preview/export, and re-renders after other seeks to detect non-determinism. Invalid documents never create assets. **Duplicates are not saved:** a document identical to a library template (after line-ending normalization) returns that template with `status: "existing"`, `existing: true` and `duplicate_of`; a near-duplicate of an existing template (same category and mostly the same words and params, checked only without `based_on`) returns `status: "similar_found"`, `created: false` and `similar[]` (`template_id`, `latest_asset_id`, name, description, category, `params`, `usage_count`, `score`) without saving or rendering, so place the match with params, change it with `scenes_update_motion_graphic`, derive it with `based_on`, or resend with `force: true` when the design is genuinely different. `project_id` / `scene_id` only record where the template was made for (`origin`); it still goes to the shared library. New templates are added to the Media Search Index in the background. Does not place it. `return`: `image` (default: PNG image content plus file paths), `path` (temp file paths only) or `none` (no frames); there is no `sheet` here (use `scenes_render_motion_graphic`). Returns `status: "created"`, the asset, `template_id`, `derived_from`, `derived_from_template_id`, `warnings`, `logs` (the document's console output and uncaught exceptions during the probes: `level`, `message`, 1-based `line` in your HTML), `deterministic`, `preview_frames` (paths) and PNG image content. |
| `scenes_import_motion_graphic` | `format ("hyperframes"), html, description, files?, composition?, tags?, name?, category?, strip_media?, force?, project_id?, scene_id?, preview_times?, return (image \| path \| none)` | Imports a **HyperFrames composition** as a new template. `html` is the entry document (index.html); `files` maps each `data-composition-src` path, relative to the entry, to that file's contents (max 32 files, 4 MB; nested sub-compositions too); local `<script src>` / `<link rel="stylesheet">` files passed there are inlined verbatim (once, before the scenes' scripts). `composition` (a `data-composition-src` path) imports only that sub-composition: its host must be a direct clip of the root, it starts at 0 and the template lasts its `data-duration`; the other root clips (scenes, voiceover audio) are left out and the template is named by its composition id. A sub-composition `<template>` file passed alone as `html` needs `data-duration` on its root. Sub-compositions are inlined (CSS scoped to the instance, colliding ids prefixed with the composition id, `data-variable-values` applied); `data-composition-variables` bound by `data-var-text` / `data-var-src` become params (string → text or color, number, boolean, enum → select, `data-var-src` → image with an empty default; roles guessed from names); the root size, duration, fps and top-level clip starts become the manifest (`title` from `<title>`, `name` or the root id; `category` default `other`). `<video>` / `<audio>` are an error unless `strip_media: true` removes them (listed in `import.media_removed`): put footage on the scene timeline or a Cuts track. The converted document is then saved exactly like `scenes_create_motion_graphic` (validation, probe frames, `logs`, `existing`, `similar_found` unless `force`), with origin kind `import`. Adds `import: { format, composition?, warnings, media_removed, params_created, markers }`; conversion problems return one error naming each. A document that already has a `scribis-motion` manifest is saved unchanged. Read `import.warnings`: a library loaded from a CDN (e.g. GSAP) must be pasted inline, and project images must become data URLs. |
| `scenes_get_motion_graphic` | `asset_id, include_source?, source_offset?, source_limit?` | HTML source (chunked; follow `next_source_offset`), manifest/params, version lineage, and `usages`: scene clips with their params, plus older Cuts project blocks. |
| `scenes_update_motion_graphic` | `asset_id, html? \| patches?, description?, tags?, name?, notes?, retarget? (none \| open_scene \| open_project), mode?, preview_times?, return? (image \| path \| none)` | **Changes the template.** With `html`/`patches`: creates the next version (same `template_id`), re-validated with probe frames (`warnings`, `logs`, `deterministic` as in `scenes_create_motion_graphic`), inheriting description/tags unless given. With only `description`/`tags`/`name`: updates the search metadata of every version in place, no new version. A document that hashes the same as the latest version also makes no new version: the result has `status: "unchanged"`, `unchanged: true`, the latest asset and `retarget.success: false` (nothing to switch), while `description`/`tags`/`name` are still applied. New versions are indexed in the background and record `origin` (`open_project` → `project_id`, `open_scene` → `scene_id`). Prefer `patches: [{find, replace, all?}]` — each `find` must match exactly once unless `all=true`. `retarget="open_scene"` proposes a `replace_asset` edit to the scene open in Scribis (old version → new, params kept), and `retarget="open_project"` proposes a `retarget_asset` edit to the Cuts project open in the timeline editor, review by default via `mode`; the result's `retarget` reports the proposal or why it failed (the new version is kept either way). |
| `scenes_render_motion_graphic` | `asset_id, times (1–6; up to 12 with return="sheet"), width?, height?, params?, return? (image \| path \| none \| sheet)` | Renders frames at local times (0 = clip start) with optional parameter values, exactly as preview/export does, and returns `logs` (console output and exceptions of the document while these frames rendered, with source lines). `return="sheet"` returns one labelled contact sheet image (`sheet_path`; transparency as a checkerboard) plus the frame paths. |

#### The `scribis.motion/1` contract (summary)

1. One self-contained HTML document starting with `<!DOCTYPE html>` (≤ 20 MB). Inline CSS/JS; images as `data:` URLs; fonts from the Scribis font library by family name (`installed_fonts` from `scenes_get_motion_guide`), system fonts, or `data:` @font-face. Network, child frames, Node.js, permissions and navigation are blocked by CSP and request filtering.
2. Deterministic, seekable animation: implement `window.seek(seconds)` (sync or async) that draws the exact frame for any `t` in `[0, duration]`, including backwards. Inline GSAP (`gsap.globalTimeline`), `window.__timelines` and CSS/Web Animations are also paused and sought. Never drive visuals with `Math.random()`, `Date.now()`, `performance.now()`, `setInterval` or `requestAnimationFrame`.
3. Transparent background; layout responsive to the viewport (the renderer viewport is the clip's render size). Keep text inside a 5 % safe area.
4. Manifest (required for MCP-created graphics):

```html
<script type="application/json" id="scribis-motion">
{
  "schema": "scribis.motion/1",
  "title": "Lower third",
  "duration": 5,
  "width": 1920, "height": 1080,
  "params": {
    "title":  { "type": "text",   "label": "Title",  "default": "Jane Doe", "maxLength": 60 },
    "accent": { "type": "color",  "label": "Accent", "default": "#4f7cff" },
    "inSeconds": { "type": "number", "default": 0.6, "min": 0.1, "max": 2 },
    "showLogo": { "type": "boolean", "default": true },
    "style":  { "type": "select", "default": "solid", "options": ["solid", "glass"] }
  },
  "markers": [{ "time": 0.6, "label": "intro-done" }],
  "notes": "Design intent for the next editor (human or AI)."
}
</script>
```

5. Parameters reach the document before its own scripts run: `window.__SCRIBIS_PARAMS__` (defaults merged with the clip's overrides), CSS variables `--scribis-<name>` (text/color/number/select; `url(...)`/`none` for image; the quoted family for font), attribute `data-scribis-<name>` on `<html>` (boolean), automatic text for elements with `data-scribis-param="<name>"`, image `src` for `data-scribis-src="<name>"` (plus `data-scribis-empty` when there is no image), `font-family` for `data-scribis-font="<name>"`, muted footage for `<video data-scribis-video="<name>">`, sought in step with the template (at time t: `data-trim-start + max(0, t - data-video-start)`; `data-scribis-video-mode="playback"`; footage that cannot be decoded and `<img>` elements show the still frame at `data-trim-start`, mode `"poster"`), and a `scribis:params` event. Image params take a Cuts image `asset_id`, a small base64 `data:image` URL or `""`; font params take an installed font family or `""`; video params take a Cuts video `asset_id` or `""` (`"media"` is reserved and rejected) and play muted (sound belongs on a timeline audio track). When a clip or block switches to another template, overrides follow by key, or by param `role` when the keys differ. Read params inside `seek()` so every frame reflects them. Users can edit the same params from the canvas toolbar (**Parameters**) without touching the HTML.

### Recommended agent workflow

```
cuts_list_projects                          # pick the timelines (project_id)
scenes_create(name, aspect_ratio?)          # or scenes_list → scenes_get(scene_id) (note revision)
scenes_edit(operations=[
  {op:"add_clip", source:"timeline", source_id:<project_id>},           # appended to the storyboard
  {op:"add_clip", source:"timeline", source_id:<project_id 2>},
  {op:"set_transition", clip_id:<clip>, edge:"out", type:"dissolve", duration:1},
  {op:"add_clip", source:"asset", source_id:<audio asset id>, track:"new_audio", volume:0.2},
  {op:"update_clip", clip_id:<clip>, original_audio:false}
])                                          # clip IDs come from scenes_get / earlier results
→ user accepts or rejects in Scribis → scenes_get → review.recent
→ scenes_render_frame(times=[a transition, a layer clip])  # check the composite

Motion graphic:
brief: audience, where it plays, length (beats → markers), real content, look
scenes_find_motion_templates(query)         # reuse or adapt an existing template first
scenes_get_motion_guide(starter="stat_chart" | "kinetic_title" | "explainer" | "callout" | "lower_third" | "hook_title" | "points_list" | "takeaway_card" | "ui_walkthrough" | "logo_outro")
  → fill the starter's params and content (do not invent figures)
  → scenes_create_motion_graphic(description, tags)   # inspect warnings + returned frames
  → scenes_render_motion_graphic (markers)  # iterate with scenes_update_motion_graphic + patches
  → scenes_get                              # live scene, revision, free time ranges
  → scenes_edit add_clip(source="asset", source_id=<asset id>, track="new_layer", start, params)  # review
    or cuts_place_visual(asset_id, start, end, params)  # on the open Cuts timeline, review
  → after the user accepts: scenes_render_frame(times=[markers in scene seconds])  # over the footage
    or render_preview_frame(timestamp_sec)  # Cuts timeline
User refers to a template ("the template at 11:50, make it red", "the blue countdown"):
  scenes_find_motion_templates(at_time="11:50" | query="blue countdown")
  → scenes_get_motion_graphic(latest_asset_id)
  → change it:    scenes_update_motion_graphic(asset_id, patches, retarget="open_scene" | "open_project")
  → or a new one: scenes_create_motion_graphic(based_on=latest_asset_id, patches, description, tags)
                  → scenes_edit replace_asset(from_source_id, source_id=new, clip_ids) / add_clip
  per-clip text/colors: scenes_edit update_clip(clip_id, params)
```

### Client compatibility (Claude, Codex, Cursor, others)

- Tool names are lowercase `snake_case` (≤ 64 chars, `^[a-z0-9_]+$`) and input schemas are flat JSON Schema objects (no `$ref`/`oneOf`), which Claude, Codex (OpenAI function schema rules) and Cursor accept. The same definitions are served over the stdio socket bridge (`bridge.js` at the repository root) and the localhost HTTP fallback. The HTTP fallback needs no token (local connections only): `/mcp` takes only `POST` with `Content-Type: application/json` (otherwise HTTP 405/415), and a non-loopback `Host` or a foreign `Origin` returns HTTP 403.
- Results are a JSON text block (always) plus optional PNG `image` content. Clients that cannot display MCP images can pass `return="path"` and open the files under Scribis temp storage.
- Large HTML is read in chunks (`source_limit`, `next_source_offset`) and revised with `patches`, keeping responses under typical client output limits.
- Renders run offscreen with a 15 s per-frame limit; probes are capped at six frames so calls finish well within common 60 s client timeouts.
- The server registers **89 tools**: 42 legacy tools (ASR 3, TTS 2, avatar 1, LLM 2, subtitles 13, timeline 17, frames 4), 19 Cuts tools (`cuts_*`, not counting `cuts_open_project`; `cuts_add_track` is suspended), 15 Scenes tools (8 scene editing: `scenes_list`, `scenes_get`, `scenes_create`, `scenes_edit`, `scenes_duck_audio`, `scenes_render_frame`, `scenes_audio_check`, `scenes_get_speech_words`; 7 motion-graphic: `scenes_get_motion_guide`, `scenes_find_motion_templates`, `scenes_create_motion_graphic`, `scenes_import_motion_graphic`, `scenes_get_motion_graphic`, `scenes_update_motion_graphic`, `scenes_render_motion_graphic`), 6 audio tools (`audio_*`), 3 YouTube tools (`youtube_get_captions`, `youtube_get_quota`, `youtube_list_history`), 3 page-opening tools (`app_open_youtube_browser`, `cuts_open_project`, `scenes_open`) and `scribis_resolve_ref`. The full list is in [tool-index.md](tool-index.md#all-tools-complete-list). Some clients cap or slow down with many active tools (Cursor has historically sent only about 40 to its agent); disable tool groups you do not need for the task (for example avatar, translation or camera tools) in the client's MCP settings when working on Cuts or Scenes.
