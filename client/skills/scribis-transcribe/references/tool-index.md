# Scribis MCP tool index ("which tool does X?")

Look the task up here before guessing a tool name. Every name written as a call or in the
"Call" column is a real MCP tool, and [All tools (complete list)](#all-tools-complete-list) at the
end lists every registered tool. The `scenes_edit` operation names (`add_clip`, `move_clip`,
`trim_clip`, `split_clip`, `merge_clips`, `remove_clip`, `update_clip`, `replace_asset`, `set_transition`,
`reorder_storyboard`, `add_track`, `remove_track`, `set_track`, `move_track`, `set_canvas`) are
**operations** inside `scenes_edit(operations=[…])`, not tools. If a tool you need is not in your
tool list, the running Scribis is older than these skills: ask the user to fully quit Scribis
(tray icon → Quit, not just closing the window) and start it again.

## Find and list

| I want to… | Call |
|:---|:---|
| List Cuts projects (timelines) | `cuts_list_projects(query?, limit?)` |
| List scenes | `scenes_list(query?, limit?)` |
| List rough cuts (deleted ranges) of a project | `get_timeline_state` → `deletionBlocks` (project open), or `cuts_get_project(project_id)` → `counts.deletions` |
| List the clips of a scene | `scenes_get(scene_id)` → `clips` (sort by `start`), `tracks` |
| List motion-graphic templates | `scenes_find_motion_templates(category=…)` or `(query=…)`; built-ins have `built_in: true` |
| List images / audio / video / HTML in the library | `cuts_list_assets(kind?, query?)`, ranked: `cuts_search_assets(query, kind)` |
| List TTS voices | `audio_list_voices(project_id?)` |
| List sound-effect recipes | `audio_list_sfx_recipes(category?)` |
| List transcription models / LLMs | `list_models`, `list_llm_models` |
| List saved YouTube videos | `youtube_list_history(query?)` |
| Find what a pasted reference (`motion-1a2b3c4d`, …) points to | `scribis_resolve_ref(text)` |

## Create

| I want to… | Call |
|:---|:---|
| **Create a new, empty scene** | `scenes_create(name, aspect_ratio?)` (`16:9` default, `9:16`, `1:1`, `4:3`) → returns `scene_id` |
| Add clips, tracks, transitions to a scene | `scenes_edit(scene_id, operations=[…])` (one atomic edit) |
| Create a motion-graphic template | `scenes_create_motion_graphic(html, description, tags)`; from an existing one: `based_on` + `patches` |
| Import a HyperFrames composition as a template | `scenes_import_motion_graphic(format="hyperframes", html=<index.html>, files={<relative path>: <contents>}, composition?, description, tags?, name?, category?, strip_media?, force?, project_id?, scene_id?, preview_times?, return?)`; `composition` imports one scene (sub-composition path) on its own; `strip_media` removes `<video>`/`<audio>`; the result adds `import` (`format`, `composition`, `warnings`, `media_removed`, `params_created`, `markers`) |
| Create a voice-over line | `audio_generate_speech(text, language, voice? \| speaker? \| clone_speaker? \| reference_asset_id?, project_id?, tags?, with_words?)`: exactly one voice source |
| Create a sound effect | `audio_generate_sfx(recipe, params?, duration?, seed?, name?, description?, tags?, reuse?)` |
| Import a local file into the library | `cuts_import_asset(path, description, tags?, name?)`: an absolute path only (no base64 or URL); `description` is required; HyperFrames HTML (a project index.html or one scene's sub-composition file) becomes a motion template |
| Transcribe a file | `transcribe_audio(path, model?, lang?)` |

There is no MCP tool to create a new Cuts project, delete or rename a scene or project, delete
library assets, undo, or export MP4. Tell the user to do those in Scribis.

## Open (so the user can watch and review)

| I want to… | Call |
|:---|:---|
| Open a Cuts project in the timeline editor | `cuts_open_project(project_id)` |
| Open a scene in the scene editor | `scenes_open(scene_id)` |
| Open a YouTube video in the YouTube AI browser | `app_open_youtube_browser(url)` |

Only one editor can be open; these refuse while another Cuts or scene editor is open.

## Read

| I want to… | Call |
|:---|:---|
| A project's tracks, visual and audio blocks | `cuts_get_project(project_id)` |
| Subtitles of the open project | `get_all_subtitles(query?, from_time?, to_time?)` |
| Words actually heard (incl. TTS) | `cuts_get_speech_words` / `scenes_get_speech_words` / `audio_get_speech_words` |
| A template's HTML, params and where it is used | `scenes_get_motion_graphic(asset_id, include_source=true)` |
| A YouTube video's captions | `youtube_get_captions(url, format="text")`; quota: `youtube_get_quota` |
| Loudness of a file / the whole mix | `audio_measure(asset_id)`; `cuts_audio_check` / `scenes_audio_check` |

## Look at frames

| I want to see… | Call |
|:---|:---|
| A motion graphic alone at local times | `scenes_render_motion_graphic(asset_id, times≤6, width, height)` |
| Why a motion graphic renders empty (its console errors, with lines) | `logs` in the result of `scenes_render_motion_graphic` / `scenes_create_motion_graphic` / `scenes_update_motion_graphic` |
| A scene composite at scene times | `scenes_render_frame(scene_id, times≤6, width?)` |
| Up to 12 frames in one labelled contact sheet | either of the two above with `return="sheet"` (times ≤ 12) |
| The open Cuts timeline composite | `render_preview_frame(timestamp_sec)` |
| A raw video frame | `get_video_frame(timestamp_sec, video_path?)` |

## Change

| I want to… | Call |
|:---|:---|
| Move / trim / remove / restyle a scene clip | `scenes_edit` ops `move_clip`, `trim_clip`, `remove_clip`, `update_clip(params, x/y/w/h/rotation, opacity, volume, original_audio, keyframes (clip-local seconds); timeline/video clips also speed, keep_duration; audio clips also fade_in, fade_out, volume_keyframes)` |
| Swap a scene clip to another template version | `scenes_edit` op `replace_asset(from_source_id, source_id)` |
| Change a template's code (new version) | `scenes_update_motion_graphic(asset_id, patches)` |
| Place / change HTML on a Cuts timeline | `cuts_place_visual`, `cuts_update_visual`, `cuts_remove_visual` |
| Split or merge Cuts visual / music blocks | `cuts_split_block`, `cuts_merge_blocks` |
| Music and effects on a Cuts timeline | `cuts_place_audio`, `cuts_update_audio`, `cuts_duck_audio`, `cuts_remove_audio` |
| Duck scene music under speech | `scenes_duck_audio(scene_id?, clip_ids?, amount_db?, attack?, release?, clear?, mode?)` |
| Rough cut | `delete_segment(segments, summary)` |
| Fix subtitles (Cuts editor) | `update_timeline_block(id, parameters={text})` |

See [mcp-tools-spec.md](mcp-tools-spec.md) for every argument,
[scene-and-motion-rules.md](scene-and-motion-rules.md) for how scenes, templates and renders behave,
and [mcp-playbook.md](mcp-playbook.md) for rules, errors and pitfalls.

## All tools (complete list)

Every tool the Scribis MCP server registers (89), grouped by area. `cuts_add_track` is
temporarily not registered (`cuts_place_visual` creates a visual track when needed).

**Transcription and models**

| Tool | Purpose |
|:---|:---|
| `list_models` | Installed transcription models and the default one |
| `transcribe_audio` | Transcribe a file (`path`) or base64 audio (`audio_data` + `format`) into JSON segments |
| `cancel_transcription` | Cancel the running MCP transcription |
| `list_llm_models` | Local and on-device LLMs (Apple Intelligence, GGUF models) |
| `llm_completion` | Text or chat completion with an on-device or local LLM |

**Speech synthesis and avatar (file-based, outside the Cuts library)**

| Tool | Purpose |
|:---|:---|
| `list_voices` | Voices of one TTS engine |
| `generate_tts` | Speech audio from text (voice ID or reference audio), returned as a file or base64 |
| `create_avatar` | Talking-head MP4 from one photo and one audio file |

**Frames and player (open timeline editor)**

| Tool | Purpose |
|:---|:---|
| `render_preview_frame` | Composite frame of the open Cuts / timeline editor at a time |
| `get_video_frame` | Raw frame of a video file at a time |
| `get_current_frame` | Current player frame |
| `seek_player` | Move the timeline editor playhead |

**Timeline editor (open project; source-video seconds)**

| Tool | Purpose |
|:---|:---|
| `get_timeline_state` | All blocks of the open timeline (subtitles, deletions, zoom, mosaic, text, camera, audio) |
| `get_project_duration` | Original, effective and deleted duration |
| `delete_segment` | Rough cut: remove ranges (review by default) |
| `split_media` | Split subtitles and effect blocks at a time |
| `add_timeline_block` | Generic add (zoom, mosaic, text, camera, subtitle) |
| `add_zoom_block` | Zoom / punch-in block |
| `configure_zoom_motion` | Ken Burns motion of a zoom block |
| `add_mosaic_block` | Mosaic box (or a mark-only box) |
| `add_text_block` | Text overlay block |
| `add_camera_block` | Multi-camera block |
| `switch_camera_source` | Active camera of a camera block |
| `set_camera_layout` | Layout or aspect ratio of a camera block |
| `configure_camera_subviews` | Focal point and zoom per camera view |
| `update_timeline_block` | Change a block's parameters (also subtitle text in the Cuts editor) |
| `delete_timeline_block` | Remove one block (removing a deletion restores the range) |
| `batch_delete_timeline_blocks` | Remove several blocks in one undo step |
| `reset_timeline` | Clear all zoom, mosaic, text, camera and deletion blocks (`confirm=true`, only on request) |

**Subtitles (transcript page for writes)**

| Tool | Purpose |
|:---|:---|
| `get_all_subtitles` | Subtitles of the open editor, with filters |
| `get_subtitles_at_time` | Subtitle segment(s) at a time |
| `get_current_subtitle` | Subtitle at the playhead |
| `update_subtitle` | Correct one subtitle |
| `batch_correct_subtitles` | Correct many subtitles in one review |
| `add_subtitle` | Add a subtitle segment |
| `delete_subtitle` | Delete a subtitle segment |
| `change_current_language` | Language shown in the UI (`default` = original) |
| `get_available_translation_languages` | Translation languages of the project |
| `create_translation_language` | Register a translation language |
| `get_translated_subtitles` | Translated subtitles, with filters |
| `update_translated_subtitle` | Correct one translated subtitle |
| `batch_update_translated_subtitles` | Correct many translated subtitles |

**Open pages**

| Tool | Purpose |
|:---|:---|
| `app_open_youtube_browser` | Open the YouTube AI browser (optionally a video) |
| `cuts_open_project` | Open a Cuts project in the timeline editor |
| `scenes_open` | Open a scene in the scene editor |

**Cuts projects and library (`cuts_*`)**

| Tool | Purpose |
|:---|:---|
| `cuts_list_projects` | List Cuts projects |
| `cuts_get_project` | Tracks, visual and audio blocks, revision and review status |
| `cuts_list_assets` | List library assets |
| `cuts_search_assets` | Ranked library search (words and content) |
| `cuts_import_asset` | Copy a local file (absolute path) into the library |
| `cuts_detect_faces` | Optional face scan that marks faces for face-aware placement |
| `cuts_get_avoid_regions` | Regions to keep clear and `free_areas` for placement |
| `cuts_place_visual` | Place an HTML motion graphic on a Cuts timeline |
| `cuts_update_visual` | Move, retime, reposition or swap a visual block |
| `cuts_remove_visual` | Remove a visual block |
| `cuts_split_block` | Split a visual or music block into two that play on as before |
| `cuts_merge_blocks` | Join two neighbouring parts of the same footage back into one block |
| `cuts_place_audio` | Place music or a sound effect |
| `cuts_update_audio` | Move, trim, re-level or reshape an audio block |
| `cuts_duck_audio` | Duck music under speech |
| `cuts_remove_audio` | Remove an audio block |
| `cuts_set_track_state` | Hide, lock or mute a track |
| `cuts_audio_check` | Check music and effects against speech |
| `cuts_get_speech_words` | Word timing of what is heard on a Cuts timeline |

**Scenes (`scenes_*`, scene editing)**

| Tool | Purpose |
|:---|:---|
| `scenes_list` | List scenes |
| `scenes_get` | Read a scene: canvas, tracks, clips, revision, review status |
| `scenes_create` | Create an empty scene |
| `scenes_edit` | Atomic scene edit (the operations listed at the top of this page) |
| `scenes_duck_audio` | Duck scene music under speech |
| `scenes_render_frame` | Composite scene frames or a contact sheet |
| `scenes_audio_check` | Check scene music and effects against speech |
| `scenes_get_speech_words` | Word timing of speech in a scene |

**Motion-graphic templates (`scenes_*`, used by scenes and Cuts timelines)**

| Tool | Purpose |
|:---|:---|
| `scenes_get_motion_guide` | Contract, starters, built-in templates, vocabulary, installed fonts |
| `scenes_find_motion_templates` | Find templates by words, category, aspect or timeline position |
| `scenes_create_motion_graphic` | Save a new template (or derive one with `based_on`) |
| `scenes_import_motion_graphic` | Import a HyperFrames composition (`format`, `html`, `files`, `composition`, `description`, `tags`, `name`, `category`, `strip_media`, `force`, `project_id`, `scene_id`, `preview_times`, `return`) as a new template; result adds `import` details |
| `scenes_get_motion_graphic` | Template source, params, lineage and usages |
| `scenes_update_motion_graphic` | New version of a template, or metadata update |
| `scenes_render_motion_graphic` | Render template frames or a contact sheet |

**Audio, speech and sound effects (`audio_*`)**

| Tool | Purpose |
|:---|:---|
| `audio_list_voices` | Cuts voice catalog and the project's speakers |
| `audio_generate_speech` | TTS into a Cuts audio asset |
| `audio_get_speech_words` | Word timing inside one audio asset |
| `audio_list_sfx_recipes` | Sound-effect recipes and their params |
| `audio_generate_sfx` | Synthesize a sound effect into the library |
| `audio_measure` | Loudness of one audio asset |

**YouTube (`youtube_*`)**

| Tool | Purpose |
|:---|:---|
| `youtube_get_captions` | Captions of a YouTube video |
| `youtube_get_quota` | Monthly YouTube quota |
| `youtube_list_history` | Saved YouTube videos |

**References**

| Tool | Purpose |
|:---|:---|
| `scribis_resolve_ref` | Resolve a pasted AI reference (`motion-1a2b3c4d`, …) to its item and editing tool |
