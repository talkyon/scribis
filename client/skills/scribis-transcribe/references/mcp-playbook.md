# Scribis MCP playbook (read this before editing)

Practical rules for any model driving Scribis through MCP. Follow them literally. When a
step fails, read the error text: Scribis errors name the tool to call next.

## 1. Golden rules

1. **Open before you edit.** Review-mode edits only work in an editor the user has
   open. Open it yourself: `cuts_open_project(project_id)` or `scenes_open(scene_id)`.
   If the result is `"requested"`, read it back with `cuts_get_project` or
   `scenes_get` before editing.
2. **Read before you write.** Get IDs, times and the `revision` from a read tool.
   Never guess an ID, and never reuse an ID from a pending proposal after the
   user accepted it: accepting can assign new IDs.
3. **Review is the default.** Edits wait for the user's Accept/Reject. Use
   `mode="auto"` only when the user said to edit without review. Never use it
   to get around a waiting proposal.
4. **One proposal per editor.** While one waits, the next review-mode edit to that
   editor fails with "Another AI proposal is waiting". Batch scene edits into one
   `scenes_edit`. For Cuts, send the most important edit, tell the user what to
   accept, and continue after the decision.
5. **Place overlays in free space.** Before placing B-roll, images, text or motion
   graphics over footage, call `cuts_get_avoid_regions` and put the visual inside one
   of its `free_areas` (clear of burned-in text and existing overlays). Keeping faces
   clear is optional: when people are on screen and the user has not said, ask once
   before tracking faces (`cuts_detect_faces`), and pass `include_faces=false` when
   they do not want it. A full-frame card may cover faces on purpose.
6. **Check your work.** Cuts: `render_preview_frame(timestamp_sec)`. Scenes:
   see the checks in section 7.
7. **Say what is pending.** End every task by listing what was applied, what
   waits for review and what you could not do.

## 2. Time and coordinate spaces

| Where | Time unit | Box unit |
|:---|:---|:---|
| Cuts / timeline tools (`add_*_block`, `delete_segment`, `cuts_place_visual`, subtitles) | **source-video seconds** (rough cuts do not shift them) | fractions 0–1 |
| Mosaic boxes (`add_mosaic_block`, `mosaicBlocks`) | source seconds | **x, y = top-left** over the **source frame** |
| Cuts visuals (`cuts_place_visual` / `cuts_update_visual` transform) | source seconds | **x, y = top-left** over the **output frame** |
| Text blocks (`add_text_block`) | source seconds | x, y = **center** of the text in the output frame |
| Zoom / camera focal points | source seconds | x, y = focal **center** |
| Scenes (`scenes_edit`, `scenes_get`) | **scene seconds** | x, y = top-left over the **scene canvas** |
| Scene timeline clip `trim_start` / `duration` | seconds of the timeline **output** (after its rough cuts) | — |
| Motion graphics (`scenes_render_motion_graphic`, manifest markers) | the composition's own time `t` (0 = its first frame; equals clip-local seconds only for a clip with `trim_start` 0) | — |
| `scenes_find_motion_templates.at_time` | a ruler string such as `"11:50"` | — |

Conversions:
- `"mm:ss"` → seconds: `minutes * 60 + seconds`.
- Scene time → source time of a timeline clip: `scene_t - clip.start + clip.trim_start`
  gives output time; `cuts_get_avoid_regions(scene_id)` maps rough cuts for you.
- Scene time → source time of any clip with speed: `clip.trim_start + (scene_t - clip.start) × speed`.
  For an HTML clip this is the composition time `t` its script draws; a part made by `split_clip`
  starts at `t = trim_start`, not 0 (the AI reference line and `scribis_resolve_ref` give it as
  `source_start`–`source_end`).
- `cuts_get_avoid_regions` returns every box in the space of the tool you will
  call next: `output_bounds` for Cuts, `scene_bounds` for scenes. Copy them as is.

## 3. Where IDs come from

Not sure a tool exists ("is there a create-scene / list-cuts tool?")? Check
[tool-index.md](tool-index.md) first. How scene tracks, clip placement, edits, template versions
and renders behave: [scene-and-motion-rules.md](scene-and-motion-rules.md).


| You need | Call |
|:---|:---|
| The item behind a pasted **AI reference** (`audio-1a2b3c4d`, `motion-…`, `video-…`, `speech-…`, `subtitle-…`, `zoom-…`, `timeline-…`, or a line `Scribis Cuts … · project:<id>` / `Scribis Scene … · scene:<id>`) | `scribis_resolve_ref(text)` → editor, project/scene, full ID, timing, the tool that edits it |
| `project_id` (Cuts project) | `cuts_list_projects`, or a pasted `/scribis-edit cuts <id>` |
| `scene_id` | `scenes_list`, or a pasted `/scribis-edit scene <id>` |
| YouTube `video_id` | the user's URL, or `youtube_list_history` (saved videos, free to reread) |
| Visual `block_id`, `track_id`, `revision` | `cuts_get_project` |
| Subtitle / zoom / mosaic / text / camera / deletion block IDs | `get_timeline_state` (open editor only) |
| Scene `clip_id`, `track_id`, `revision` | `scenes_get` |
| `asset_id` (images, audio, video, HTML) | `cuts_list_assets` (one entry per template, latest version) |
| Motion template `template_id`, `latest_asset_id` | `scenes_find_motion_templates` (words, pasted `Scribis HTML template <id>`, or `at_time`) |
| Usages of a template (which blocks/clips) | `scenes_get_motion_graphic(asset_id)` → `usages` |

## 4. What must be open

| Tools | Needs |
|:---|:---|
| `get_timeline_state`, `add_*_block`, `update_timeline_block`, `delete_timeline_block`, `split_media`, `delete_segment`, `render_preview_frame`, `cuts_detect_faces` | the Cuts editor (`cuts_open_project`) |
| `cuts_place_visual` / `cuts_update_visual` / `cuts_remove_visual` / `cuts_set_track_state` in review mode | that project open in the Cuts editor |
| `cuts_place_audio` / `cuts_update_audio` / `cuts_remove_audio` / `cuts_duck_audio` in review mode | that project open in the Cuts editor |
| `scenes_edit` and `scenes_duck_audio` in review mode | that scene open (`scenes_open`) |
| `audio_measure`, `cuts_audio_check`, `scenes_audio_check`, `audio_generate_sfx`, `audio_generate_speech`, `cuts_search_assets` | nothing (the checks read the open editor, else pass `project_id` / `scene_id`; `audio_generate_speech` with `speaker` / `clone_speaker` needs the open Cuts project or `project_id`) |
| Subtitle reads (`get_all_subtitles`, …) | any editor with the project (Cuts editor or transcript page) |
| Subtitle writes (`update_subtitle`, `batch_correct_subtitles`, `add_subtitle`, `delete_subtitle`) | the **transcript page**. In the Cuts editor use `update_timeline_block` on `subBlocks` instead |
| `cuts_get_avoid_regions`, `cuts_get_project`, `scenes_get`, template tools | nothing (they read saved data when nothing is open) |

Only one editor can be open. Opening another page is refused while a Cuts or scene editor
is open: ask the user to save and close it.

## 5. Errors and what to do

| Error says | Do |
|:---|:---|
| "No Cuts project is open" / "is not open in the Scribis editor" | `cuts_open_project(project_id)`, then retry |
| "No scene is open" | `scenes_open(scene_id)`, then retry |
| "Another AI proposal is waiting" | Tell the user to Accept/Reject in Scribis, read `review.recent`, then retry |
| "changed since it was read" | Read again (`cuts_get_project` / `scenes_get`), rebuild the edit with the new `revision` |
| "The transcript page is not open" | Use `get_timeline_state` + `update_timeline_block(id, parameters={"text": …})` |
| "No project with subtitles is open" | `cuts_open_project` first |
| "… is open in the scene editor / timeline editor. Ask the user to close it" | Ask the user; do not retry in a loop |
| "track … is locked" | Ask before `cuts_set_track_state(track_id, locked=false)` |
| `cuts_detect_faces` → models not installed | Tell the user to download the face models in Settings → Experimental |
| `reset_timeline` refused | It needs `confirm=true` and an explicit user request; use `delete_timeline_block` for single blocks |
| Review decision `conflict` | The timeline changed; read again and propose again |
| Review decision `expired` | Another project or scene was opened; reopen and propose again |
| `error_code: "YOUTUBE_MONTHLY_LIMIT_REACHED"` | The free account used its 10 new YouTube videos this month. Do not retry. Tell the user: saved videos (`youtube_list_history`) still work; Scribis Pro removes the limit, or wait for next month |
| "could not verify the YouTube quota" | Retry once a moment later; never work around it |
| `error_code: "YOUTUBE_CAPTIONS_PENDING"` | The YouTube browser opened the video but has not saved its captions yet; call `youtube_get_captions` again once after a few seconds (free) |
| "Scribis cannot read …: the Mac App Store build is sandboxed" | Only tools with a base64 argument (`audio_data` / `image_data` on `transcribe_audio` and `create_avatar`, `ref_audio` on `generate_tts`) accept base64 instead of the path. For every other tool (including `cuts_import_asset` and `get_video_frame`) ask the user to open or import the file in Scribis. Do not retry the same path |

## 6. Recipes

### Open what the user pasted
`/scribis-edit cuts <id>` → `cuts_open_project(id)` → `cuts_get_project` (+ `get_timeline_state`
for subtitles). `/scribis-edit scene <id>` → `scenes_open(id)` → `scenes_get`.

### Fix subtitle text in a Cuts project
1. `cuts_open_project` → `get_timeline_state` (or `get_all_subtitles(query=…)`).
2. For each change: `update_timeline_block(id=<subBlocks id>, parameters={"text": "…"})`.
3. On the transcript page instead: one `batch_correct_subtitles(corrections, auto=false)`.

### Rough cut (fillers, pauses, retakes)
`get_timeline_state` → collect `[start, end]` ranges from word timings → one
`delete_segment(segments=[…], summary=…)` (review) → after the decision,
`get_timeline_state.deletionReview.recent`. Remove a wrong cut with `delete_timeline_block(id)`.

### Mark faces, then place B-roll that avoids them
Face-aware placement is optional: do this only when the user asked for it or agreed
when you asked. Otherwise skip to step 3 with `include_faces=false`.
1. `cuts_open_project(project_id)`.
2. `cuts_detect_faces(action="start")`. Then call `cuts_detect_faces(action="status")`
   every 10–20 s until `done`/`none`. Grain `none` only marks faces; the export is
   unchanged. Or the user runs Auto Mosaic → Face → grain "None (mark only)".
3. `cuts_get_avoid_regions(start, end, content_aspect?)` for the B-roll range.
4. Use the first free area whole (or its `fit` box when you passed `content_aspect`);
   areas are ranked in pixels of the real frame (`frame_aspect`).
5. Cuts: `cuts_place_visual(asset_id, start, end, transform={x, y, w, h from output_bounds of the free area})`.
   Scene: `cuts_get_avoid_regions(scene_id, start, end)` → `scenes_edit add_clip(..., x, y, w, h from the free area)`.
6. Verify (Cuts: `render_preview_frame(timestamp_sec)` inside the range).

### Hide faces (pixelate)
Only on request: `cuts_detect_faces(action="start", grain="medium", rescan=true, confirm=true)`
(or `add_mosaic_block(..., grain="medium")` for one box). To turn a marked face into a
mosaic: `update_timeline_block(id, parameters={"size": 15})`.

### Motion graphic / B-roll from a brief
Use the `scribis-motion` skill: brief → `scenes_find_motion_templates` (query,
`category`, `aspect`; built-in templates included) → `scenes_get_motion_guide(starter=…)`
→ `scenes_create_motion_graphic` → check frames → avoid regions → place for review.

### Music and sound effects
Use the `scribis-audio` skill: brief → `cuts_search_assets(kind="audio", tags=["music"|"sfx"])`
→ `cuts_import_asset` (user file) or `audio_generate_sfx` (effects) → `cuts_place_audio`
(Cuts, source seconds) or `scenes_edit add_clip` on a scene audio track (scene seconds) →
levels from `audio_measure` (`volume_for`), music with `fade_in`/`fade_out` (volume keyframes) →
`cuts_duck_audio` / `scenes_duck_audio` →
`cuts_audio_check` / `scenes_audio_check` and apply the listed fixes until `ok` (or only
user-accepted issues remain, or after 3 rounds). Music/effect
`block_id`s come from `cuts_get_project` → `audio_blocks`; TTS speech is not editable with
these tools.

### Voice-over and timing to speech
Use the `scribis-voice` skill: `audio_list_voices` → `audio_generate_speech(text, language,
voice | speaker | clone_speaker | reference_asset_id)` (clone a real person's voice only when
the user asked) → scene audio track. Word times of what is heard: `cuts_get_speech_words`
(source seconds) / `scenes_get_speech_words` (scene seconds) / `audio_get_speech_words` (clip
seconds). Inside TTS blocks they come from ASR of the TTS audio aligned to its text; subtitles
keep the original recording's timing, so do not use them there.

### The user pasted an AI reference
Every item selected in the Cuts or Scene editor shows an **AI reference** with a copy button
(`audio-1a2b3c4d`, `motion-…`, `video-…`, `image-…`, `speech-…` for TTS, `timeline-…`,
`subtitle-…`, `zoom-…`, `mosaic-…`, `text-…`, `note-…`, `camera-…`, `cut-…`, `speed-…`, `mix-…`);
the copied line also says `project:<id>` or `scene:<id>`, and for a scene clip, a Cuts visual block
(not an image) or a music block the source range it shows (`(source 0:05.38–0:26.54)`). Call `scribis_resolve_ref(text)` to
get the item and its editing tool, or pass the reference (or the whole line) directly as
`block_id` (`cuts_update_visual`, `cuts_remove_visual`, `cuts_update_audio`, `cuts_remove_audio`,
`cuts_split_block`; `block_ids` of `cuts_merge_blocks`),
`clip_id` / `clip_ids` (`scenes_edit`) or `id` / `ids` (`update_timeline_block`,
`delete_timeline_block`, `batch_delete_timeline_blocks`). Never guess which item the user means
when a reference was given; a reference that is not found means the item was deleted or lives in
another project or scene: say so.

### Change a template ("make it red")
`scenes_find_motion_templates(query=<template id or words>)` → `latest_asset_id` →
`scenes_get_motion_graphic(…, include_source=true)` → color params → per-placement
params (this video only) **or** `scenes_update_motion_graphic(patches, retarget)` (the
template). See `scribis-motion` section 7.

### Combine timelines in a scene
`cuts_list_projects` → `scenes_create` or `scenes_open` → **one** `scenes_edit` with all
`add_clip(source="timeline")`, `set_transition` and audio `add_clip(track="new_audio")`
operations → user accepts → `scenes_get`.

### Explainer from a YouTube video or a report (no footage)
`youtube_get_quota` (free: 10 new videos/month) → `youtube_get_captions(url, format="text")`
(all pages) → beat plan → `scenes_create` → `scenes_open` → **one** `scenes_edit`: the first beat
`add_clip(source="asset", track="new_layer", start=0, duration, params)`, the next beats with
`track="previous"` (appended after it on the same layer). The storyboard holds only timelines.
Then `scenes_render_frame` per beat and at every cut. See the `scribis-explainer` skill.

## 7. Verify

- **Cuts:** `render_preview_frame(timestamp_sec)` returns the composite at that source
  time; check that faces stay clear and text is readable.
- **Raw footage:** `get_video_frame(timestamp_sec, video_path)`.
- **Motion graphic alone:** `scenes_render_motion_graphic(asset_id, times=<markers>)`.
- **Scenes:** `scenes_render_frame(scene_id, times=[…])` renders the composite (storyboard,
  layers with their params, background) as preview and export show it; up to 6 scene seconds
  per call, or up to 12 in one labelled contact sheet with `return="sheet"`. A review proposal
  appears only after the user accepts it.
- **Many frames at once:** `return="sheet"` on `scenes_render_frame` or
  `scenes_render_motion_graphic` gives one image of up to 12 labelled frames. You need no image
  tools of your own to compare beats or the two sides of a cut.
- **Saved?** Both editors autosave about 1 s after a change. `scenes_get.unsaved_changes`
  that stays `true` means autosave is off: remind the user to save.

## 8. Not available through MCP (tell the user instead)

- Export to MP4 (Cuts or scene). The user exports from the editor.
- Downloading YouTube media. `youtube_get_captions` reads captions only; the YouTube AI browser
  plays the video.
- Undo/redo, save now, renaming a scene, changing the Cuts project aspect ratio.
- Adding speed, annotation or audio-mix blocks, and placing TTS audio on a Cuts timeline
  (use a scene audio track with an asset from `cuts_list_assets`).
- Auto Mosaic for text patterns (emails, keys, phone numbers); `cuts_detect_faces` covers faces only.
- Images and videos on a Cuts timeline. Put them in a scene; Cuts takes HTML motion
  graphics (visual tracks) and music or sound effects (`cuts_place_audio`, audio tracks).
- Review mode for the legacy timeline tools (`add_*_block`, `update_timeline_block`):
  they apply immediately (one undo step each). Tell the user what you changed.

## 9. Known pitfalls (symptom → cause → fix)

Each of these happened in real sessions. Check this list before assuming a tool is broken.

| # | Symptom | Cause | Fix |
|:---|:---|:---|:---|
| 1 | A list "misses" an item you know exists (e.g. a built-in template) | Your own client or shell cut the long JSON result | Narrow it (`query`, `category`, `limit`), page it, or write the result to a file and read it all; never conclude "missing" from a cut-off result |
| 2 | `Tool 'x' not found` for a tool the skill names | Scribis is running an older build | Ask the user to fully quit Scribis (tray → Quit) and start it again; closing the window is not enough |
| 3 | `Unknown parameter "title"` when placing a template | Each template has its own param keys | Read `params` from `scenes_find_motion_templates` first and use exactly those keys |
| 4 | `the storyboard holds only timelines` | HTML, images and audio cannot go on track 1 | Faceless video: put beats on a layer (`track="new_layer"`, then `track="previous"`) and set `set_canvas background_color` |
| 5 | Clips end up on the wrong track, or shifted in time | `add_clip` without a track uses the **first** track of that kind; overlapping clips are moved to the next free spot | Use `track="previous"` after `new_layer`/`new_audio`, or explicit `track_id`s; re-read `scenes_get` |
| 6 | A shortened HTML clip loses its ending (e.g. the takeaway) | A template plays on its own clock; `trim_clip` cuts the end | Give clips the template's `duration`; to make it shorter, make the template faster (timing constants) |
| 7 | A built-in shows an empty frame between its own beats | By design (exit of one beat, entrance of the next) | Check frames at about 70% of a beat, not at its internal boundaries |
| 8 | A visible box/seam around a title over the scene background | The template draws its own backdrop | Turn its backdrop param off (e.g. `backdrop: false`) or match `set_canvas background_color` |
| 9 | `Re-rendering the same time … produced a different frame` | Drawing depends on earlier frames: DOM built once and changed incrementally, layout measured before the style for this frame is applied, timers | Make `seek(t)` set every style from `t` before measuring; rebuild or reset changed elements each frame |
| 10 | `the source is only 0.06s long; scene clips need at least 0.1s` | Default `click`/short `pop` effects are shorter than a scene clip | Generate with `duration >= 0.1` |
| 11 | `sfx_over_words` names `tts-1a2b3c4d` as the "word" | Word times for that voice are unknown; the whole line counts as one word | Judge by density and volume (0.2-0.4); only move effects that mask a word you can name |
| 12 | `youtube_get_captions` opens the YouTube browser | YouTube refused the direct request; the player loads the captions | Expected (`source: "youtube_browser"`). If an editor is open it fails: ask the user to close it, or open the video later |
| 13 | YouTube captions are in the wrong language | The saved `original` track is the one the browser loaded (can be a translation) | Check `text_language`; pass `lang` with one of `saved_languages` |
| 14 | A rendered frame looks like an earlier time (stale) | Older Scribis builds could capture before the new frame painted | Update/restart Scribis; on an old build, render one time per call |
| 15 | `Operation N: …` from `scenes_edit` | N is the 1-based position in your `operations` array; nothing was applied | Fix that one operation and resend the whole edit |
| 16 | `Scribis did not finish rendering within …s` on the first render after Scribis starts | The window was still loading and missed the request | Wait until the Scribis window is fully shown, then retry once (a warm 10-frame sheet takes seconds); if it fails again, use fewer times or a smaller `width` |
| 17 | You want to compare many frames but your client cannot combine images | — | `return="sheet"` on `scenes_render_frame` / `scenes_render_motion_graphic`: up to 12 labelled frames in one image |
| 18 | Probe frames are empty or stop changing after some time, with no warning | The template's script threw (a typo, an undefined element, a param read before `seek`) | Read `logs` in the `scenes_create_motion_graphic` / `scenes_update_motion_graphic` / `scenes_render_motion_graphic` result: `level: "error"` entries carry the 1-based `line` in your HTML; fix it and resend with `patches` |

## 10. Your host, failed calls and skill copies

- **Your host cannot display images.** Request `return="path"` on `scenes_render_frame`,
  `scenes_render_motion_graphic` and `scenes_create_motion_graphic` (`render_preview_frame` and
  `get_video_frame` always return a `frame_path`), give the user the times and paths, and ask
  them to look. Never describe a frame you did not see.
- **A tool call fails.** Read the error (section 5) and the pitfalls (section 9) before retrying;
  do not repeat the same call unchanged. Learn how tools behave only from these skill files
  ([scene-and-motion-rules.md](scene-and-motion-rules.md), [tool-index.md](tool-index.md)), the
  tool descriptions and the error messages. When something is still unclear, run the smallest
  test call on a scene or template you created for the job; if that does not settle it, tell
  the user the skills are missing that rule.
- **Skill copies differ.** If the user gave you a specific copy of these skills (a path or an
  attachment), follow that one; another copy with the same name may be older. Do not silently
  switch, and mention meaningful differences in the hand-off.
- **Say what you did.** In the hand-off, name the MCP tools used for reads, edits, speech and
  renders, and list any other commands (scripts, file reads) separately. Say a frame was checked
  only when a tool returned it and you saw it, or the user looked at it.
