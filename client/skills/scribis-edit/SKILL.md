---
name: scribis-edit
description: >
  Use when the user pastes a command copied from Scribis such as "/scribis-edit cuts
  <project_id>" or "/scribis-edit scene <scene_id>" (with or without the leading slash), or
  asks to open a Scribis Cuts project or scene by ID and edit it ("打開這個 cuts 開始剪", "open
  scene <id>"). Opens the editor over MCP, reads it, then carries out or routes the request:
  subtitles, rough cuts, zooms, mosaics, motion graphics, scenes, TTS. Requires the Scribis
  MCP tools.
---

# Scribis Edit Skill

The entry point for editing a specific Scribis project. The user copied the
command from the copy button next to **Open** in Cuts → Recent edits or
Cuts → Scenes, so the ID is exact.

Read [../scribis-transcribe/references/mcp-playbook.md](../scribis-transcribe/references/mcp-playbook.md)
once: it covers the rules, time and coordinate spaces, ID sources and the fix for
each error.

## 1. Parse the arguments

```
/scribis-edit cuts <project_id> [request]
/scribis-edit scene <scene_id> [request]
```

- The leading `/` is how Scribis formats the copied command; the text works with or
  without it, whatever your agent does with slash commands.
- The first word is `cuts` or `scene`. The second is the ID: use it exactly
  (letters, digits, `-`, `_`). Everything after the ID is the user's request (may be
  empty).
- Missing or malformed? Ask for the command again; don't guess an ID. You can list
  candidates with `cuts_list_projects` / `scenes_list`.
- **No Scribis MCP tools in your tool list?** Editing needs them. Tell the user to add
  Scribis as an MCP server (the `scribis mcp-bridge` command, or the HTTP URL shown in
  Scribis Settings → MCP; see
  [../scribis-transcribe/references/cli-usage.md](../scribis-transcribe/references/cli-usage.md))
  and stop. The only CLI step available without MCP is `scribis open cuts <id>` /
  `scribis open scene <id>`, which brings the editor to the front but edits nothing.

## 2. Open the editor

| Kind | Call | Then |
|:---|:---|:---|
| `cuts` | `cuts_open_project(project_id=<id>)` | `cuts_get_project(project_id)` |
| `scene` | `scenes_open(scene_id=<id>)` | `scenes_get(scene_id)` |

- `status: "opened"` or `"already_open"`: continue.
- `status: "requested"`: the editor is loading. Read again after about 2 s, up to 5
  times; if it is still not `live: true`, tell the user the editor did not open and stop.
- When the request mentions a file ("the meeting recording"), confirm it is this
  project's source: `cuts_get_project` reports the source video name and duration.
  A different file means a different project (`cuts_list_projects(query=<name>)`).
- Error "… is open … ask the user to close it": another editor has unsaved work.
  Ask the user to save and close it, then retry. Never retry in a loop.
- Error "not found" / "source video is missing": tell the user; stop.

## 3. Read and summarize

If the message contains an **AI reference** copied from the editor (`audio-1a2b3c4d`,
`motion-…`, `subtitle-…`, or a line `Scribis Cuts … · project:<id>`), resolve it first with
`scribis_resolve_ref(text)`: it names the exact item, its timing and the tool that edits it.
Edit tools also accept the reference itself as `block_id` / `clip_id` / `id`.

**Cuts project**, read:
- `cuts_get_project` → duration, visual blocks, tracks (hidden/locked), review state.
- `get_timeline_state` → subtitle count (`subBlocks`), rough cuts (`deletionBlocks`),
  zoom/mosaic/text blocks, faces (`mosaicBlocks` with `detectedType: "face"`).

**Scene**, read with `scenes_get`: canvas size, duration, storyboard clips
(timelines), layer clips (images, video, HTML), audio, and `unsaved_changes`.

Reply with a short summary (3–5 lines: name, length, what is already there,
anything pending review). With no request, offer what can be done next:

- Cuts: fix subtitles · rough cut (fillers, pauses, retakes) · zoom on key moments ·
  hide or mark faces · B-roll / motion graphics · text.
- Scene: add or reorder timelines · transitions · music/audio · B-roll, titles,
  charts · check the composition.

## 4. Route the request

| The user wants | Follow | First calls |
|:---|:---|:---|
| Fix or search subtitles | `scribis-transcribe` → editing-recipes | `get_timeline_state` (Cuts: `update_timeline_block(id, parameters={"text"})`) |
| Remove fillers, pauses, retakes | `scribis-transcribe` → editing-recipes | `get_timeline_state` → one `delete_segment(segments, summary)` |
| Zoom / punch-in | `scribis-transcribe` | `add_zoom_block` |
| Hide faces (pixelate) | playbook "Hide faces" | `cuts_detect_faces(action="start", grain="medium", confirm=true)` |
| Know where faces are / keep overlays clear (only when the user wants it) | playbook "Mark faces" | `cuts_detect_faces(action="start")` → `cuts_get_avoid_regions` |
| B-roll, animated title, chart, explainer, callout, lower third | `scribis-motion` | brief → `cuts_get_avoid_regions` → template or starter |
| Change an existing motion graphic ("make it red") | `scribis-motion` section 7 | `scenes_find_motion_templates` |
| Combine timelines, transitions | `scribis-transcribe` → Scenes | `scenes_get` → one `scenes_edit` |
| Background music, sound effects, audio levels | `scribis-audio` | `cuts_search_assets(kind="audio")` → `audio_generate_sfx` → `cuts_place_audio` (Cuts) or `scenes_edit add_clip` (scene) |
| Voice-over / TTS, a line in a speaker's (cloned) voice, timing to speech | `scribis-voice` | `audio_list_voices` → `audio_generate_speech` → scene audio track; `cuts_get_speech_words` / `scenes_get_speech_words` |
| A YouTube video's captions, summary or quotes | `scribis-transcribe` → mcp-tools-spec "YouTube" | `youtube_get_quota` → `youtube_get_captions(url)` |
| An animated explainer made of beats (from a report, numbers or a YouTube video) | `scribis-explainer` | beat plan → `scenes_find_motion_templates` → one `scenes_edit` |
| Export the video | — | Not available through MCP: tell the user to export from the editor |

## 5. Rules while editing

- Review is the default: one proposal per editor at a time. Tell the user exactly
  what to Accept, and read the decision before the next proposal (`cuts_get_project` /
  `scenes_get` → `review.recent`; `get_timeline_state.deletionReview` for rough cuts).
- A `pending_review` result is only a proposal; it has not changed the live scene or timeline. Say “proposed” or “waiting for review,” not “changed,” “replaced,” or “done,” until `review.recent.status` is `accepted` and a fresh `scenes_get` / `cuts_get_project` confirms the live clips, assets, and times. Resolve the pending proposal before sending another edit; never switch to `mode="auto"` to bypass it. If the user turned on **Auto-accept AI** in the editor, a `review` request returns `status: "applied"`; treat it as applied and confirm with a fresh read.
- Legacy timeline tools (`add_*_block`, `update_timeline_block`) apply immediately:
  list every change you made.
- Place overlays with `cuts_get_avoid_regions` free areas. Avoiding faces is optional:
  ask before tracking faces, and pass `include_faces=false` when the user does not want it.
- Verify: Cuts with `render_preview_frame(timestamp_sec)`. Scenes with the checks
  in the playbook's Verify section.
- Both editors autosave. If `scenes_get.unsaved_changes` stays `true`, remind the
  user to save.

## 6. Hand-off

Finish with:
- what changed, with times
- what is waiting for review and where to accept it
- what you could not do and why
- the next step you suggest
