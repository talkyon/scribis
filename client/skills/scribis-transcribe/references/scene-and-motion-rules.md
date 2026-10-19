# How scenes and motion graphics behave

Everything here was verified against the running app. Learn how something works from this
file, the tool descriptions and the tools' error messages. If something is still unclear, try the smallest tool call that answers it (for
example one `scenes_edit` on a scene you created for the job) and read the result. If that
still does not answer it, tell the user what is missing from the skills instead of guessing.

## Scenes

### Tracks

| Track | Holds | Order | Transitions |
|:---|:---|:---|:---|
| Track 1, the **storyboard** | Cuts timelines only | Played one after another, no overlaps | All types (`dissolve`, `wipe`, `slide`, `zoomIn`, …) between adjacent clips |
| **Layer** tracks | Timelines, images, videos, HTML motion graphics | Drawn above the storyboard; a later layer is drawn above an earlier one | Only `dissolve` or `none` |
| **Audio** tracks | Audio only (music, effects, voice-over) | Mixed together | Fades and volume envelopes instead |

- A scene has at most **8 tracks** and **500 clips**; one `scenes_edit` takes at most **100
  operations**.
- The scene background (`set_canvas background_color`) shows wherever no clip covers the frame.
- `x, y, w, h` are fractions (0–1) of the scene canvas; `x, y` is the top-left corner.

### Placing clips (`add_clip`)

- **Which track:** `track_id` wins. Otherwise `track`: `storyboard`, `new_layer` (creates a
  layer), `new_audio` (creates an audio track), or `previous` (the track of the previous
  `add_clip` in the same edit). With neither, timelines go to the storyboard; visual clips go to
  the first **unlocked** layer and audio clips to the first unlocked audio track, in track order.
  New tracks are added at the end, so that is the scene's existing track when it has one (not a
  track you just created with `new_layer` / `new_audio`); only when the scene has no unlocked
  track of that kind is a new one created. Use `track="previous"` or `track_id` to target a
  track you just created.
- **When:** without `start` the clip is appended right after the last clip on that track. With
  `start`, if it would overlap another clip on that track, it is **moved to the next free time**
  without an error. Re-read `scenes_get` when exact times matter.
- **How long:** default all of the source; images and HTML default to 5 s. Every clip must be
  at least **0.1 s** (very short sound effects are refused).
- `trim_start` skips into the source (timelines, video, audio).
- An HTML clip plays its template on the template's own clock (clip start = template time 0).
  A clip shorter than the template cuts the end of the animation; keep clip `duration` equal to
  the template `duration` unless you checked the frames. The built-in explainer beats
  (`hook_title`, `points_list`, `takeaway_card`, `ui_walkthrough`, `logo_outro`) have a `length`
  param instead: set the clip `duration` equal to `length` (3–8 s, at most the template duration).

### Edits

- One `scenes_edit` is **atomic**: if any operation is invalid nothing changes, and the error
  says `Operation N: …` (N counts from 1 in your `operations` array).
- The result lists `results[]` in the same order: `clip_id` and `track_id` for `add_clip`,
  `track_id` for `add_track`. Use them for the next edit.
- **Review mode** (scene open, default): the edit is only a proposal until the user accepts; the
  IDs it returns may change on accept, so read `scenes_get` again afterwards. If the user turned
  on **Auto-accept AI** in the editor toolbar, a review request is applied at once and returns
  `status: "applied"` (not `pending_review`): nothing waits for Accept and the IDs are final. **Auto mode**
  (`mode="auto"`) writes the saved scene directly, open or not (an open editor reloads it): use it only when the user agreed
  (or for a scene you created for this job, and say so).
- `expected_revision` (from `scenes_get`) makes the edit fail if the scene changed meanwhile.

### Split parts, source time and merging

- A clip shows source time `trim_start + (t - start) × speed` at scene time `t` (HTML clips and
  images have speed 1). `split_clip` keeps the source running across the cut: the second part's
  `trim_start` is the first part's `trim_start` + its length × speed. Moving a part on its layer
  does not change which source time it shows.
- For an HTML clip the source time is the composition's own time `t`. Two parts of one template,
  for example `0:00–0:05.38` and `0:07.09–0:28.25`, show `t` 0–5.38 and 5.38–26.54. To change
  what one part shows, edit the template around those `t` values (`source_start`–`source_end`
  from `scribis_resolve_ref`, or `trim_start` and the length from `scenes_get`), not around the
  scene times or clip-local times.
- Both parts use the same asset. A new template version applies to the parts you switch with
  `replace_asset` (`clip_ids` limits it to some parts); parts on different versions can no longer
  be merged. Per-part `params` overrides also block a merge until they match again.
- `merge_clips(clip_ids=[a, b])` reverses a split: the parts must be neighbours on one track with
  the same source and speed, continue in the source (no source time trimmed away or repeated
  between them), share placement, opacity, volume, params, keyframe motion and volume envelope,
  and have no transition between them. A gap between them on the scene is closed by moving the
  later part to the end of the earlier one; the earlier clip keeps its ID and the later one is
  removed. Two placements of the same template that each start at `t` 0 are repeats, not parts,
  and are not merged. The scene editor offers the same as **Merge previous / Merge next** on the
  selected clip.
- Cuts timelines follow the same rules for visual blocks and music/sound-effect blocks, with
  `source_offset` in place of `trim_start` (`cuts_split_block`, `cuts_merge_blocks`; the Cuts
  editor's **Clip actions**). Dragging the start edge of a Cuts block trims its content. TTS
  speech blocks are never split or merged.

### Speed and keyframes

A Cuts timeline is the sub-timeline of one video; motion across clips belongs in the scene, with
`update_clip` `speed` and `keyframes`. `scenes_get` returns both (`speed` on timeline and video
clips, `keyframes` on visual clips, in the same flat form you write).

- **Speed** (timeline and video clips only, `0.25`–`4`, default `1`; `null` resets to 1): source
  seconds played per scene second. The clip's `start`/`end` stay scene seconds; at scene time `t`
  the clip shows source time `trim_start + (t - start) × speed`.
  - By default the clip keeps its `start` and the **source range** it shows, so its scene length
    becomes `source range / speed` and its keyframe times scale with it. On the storyboard the
    clips after it move with its end. On a layer the new length must fit before the next clip on
    that track, otherwise the operation fails (move that clip first).
  - `keep_duration: true` keeps the scene length and plays more or less of the source instead;
    it fails when the source would run out.
  - How far a clip can be trimmed or extended, and the "longer than its sub-timeline" warning, use
    `source length / speed`.
  - Sound plays at the new speed with its pitch kept. Preview and export render the same frames
    and sound.
- **Keyframes** (visual clips; at most 64): `keyframes: [{time, x?, y?, w?, h?, rotation?,
  opacity?, easing?}]` replaces all of them; `null` or `[]` clears them.
  - `time` is **clip-local** seconds: `0` is the clip's start on the scene, not a scene time and
    not a source time. At least one keyframe must lie inside the clip (0–its length), so passing
    scene times by mistake fails with the keyframe index.
  - Each keyframe sets any of `x/y/w/h/rotation` (same units as `update_clip`) and `opacity`
    (0–1). Each value is interpolated between the keyframes that set it, with the **earlier**
    keyframe's `easing` (`linear` default, `easeIn`, `easeOut`, `easeInOut`), and held before the
    first and after the last. A value no keyframe sets comes from the clip's own `x/y/w/h/rotation`
    / `opacity`, which plain `update_clip` fields change. Without keyframes nothing changes.
  - Transitions and fades apply on top of the keyframed placement and opacity.
  - Keyframes move with their clip. Trimming the start shifts them (they stay on the same
    picture); a split gives each part its own keyframes, so the motion continues across the cut.
    Keyframes left outside a clip by a trim or split are kept and only shape the motion at its
    edge; send them back unchanged when you rewrite the list.
  - In the editor, while the playhead is on a keyframe, dragging the clip or changing its opacity
    edits that keyframe; elsewhere it edits the clip's own placement.
- Errors name the operation and the keyframe: `Operation 2: keyframes[1].opacity must be a
  number between 0 and 1`.

## Motion-graphic templates

### Creating and versions

- `scenes_create_motion_graphic` takes the document only as the `html` string argument (no
  file path or URL; Scribis does not read your local files), or `based_on` + `patches`.
- It validates the HTML, then renders **probe frames** at 0 s, every
  `markers` time, the middle and the last frame (at most 6), and re-renders the middle probe
  after the others to check that drawing depends only on time. Put your important moments in
  `markers` so the probes show them.
- Every change (`scenes_update_motion_graphic`) makes a **new version with a new `asset_id`**.
  Clips keep using the version they were placed with until you switch them
  (`scenes_edit replace_asset`, or `retarget` on the update). A document identical to the
  latest version makes no version: the result says `status: "unchanged"` (metadata changes
  still apply).
- **Identical or similar templates are not saved twice.** `scenes_create_motion_graphic`
  returns the existing template (`status: "existing"`, `duplicate_of`) for a document that is
  already in the library, and `status: "similar_found"` with `similar[]` for a near-duplicate
  (same category, mostly the same words and params). Nothing is written in either case: place
  the match with `params`, change it with `scenes_update_motion_graphic`, derive it with
  `based_on`, or resend with `force: true` only when the design is genuinely different.
- `scenes_import_motion_graphic(format="hyperframes", html, files, description)` imports a
  HyperFrames composition as a new template: `html` is the entry document (index.html) as text
  and `files` maps every `data-composition-src` path (relative to the entry, nested ones too) to
  its contents (local scripts/stylesheets passed there are inlined too). Sub-compositions are
  inlined and declared variables become params. `composition="compositions/<scene>.html"` imports
  one scene of a multi-scene project: it starts at 0, lasts its host's `data-duration`, and the
  other scenes and the voiceover are left out. `<video>` /
  `<audio>` make the import fail unless `strip_media: true` removes them (footage belongs on the
  scene timeline or a Cuts track). The result is saved like `scenes_create_motion_graphic`
  (`existing`, `similar_found` unless `force`, probes, `logs`) and adds `import.warnings`: a
  library loaded from a CDN (e.g. GSAP) must be pasted inline and project images must become
  `data:` URLs or image params before the template renders correctly.
- Search results carry `usage_count` (placements of any version in saved projects and scenes)
  and `derived_from_template_id`; ties rank the more-used template first. New templates and
  versions are added to the Media Search Index in the background.
- Param values are checked against the manifest: unknown keys and wrong types are rejected.
- `scenes_create_motion_graphic`, `scenes_update_motion_graphic` and `scenes_render_motion_graphic`
  return `logs`: the document's console output (`console.log/warn/error`) and uncaught exceptions
  while the probes rendered, each with `level`, `message` and the 1-based `line` of your HTML
  when it came from the document (no `line` for messages from the Scribis runtime). A failed
  `window.seek` adds `Seeking to <t> s failed`. Repeated lines are listed once, at most 50
  entries. Empty or partly empty frames with an `error` in `logs` are a bug in the template, not a
  render problem: fix the line it names and resend.
- `warnings` are static checks of the HTML (English text, stable wording). What each one means:

| Warning starts with | Cause | Fix |
|:---|:---|:---|
| `External src/href found` | `<script src>`, `<link href>` or `<img src>` to `http(s)://` | Inline the code or embed the file as a `data:` URL |
| `External module import found` | `import … from "https://…"` | Paste the library build inline in its own `<script>` |
| `External CSS url() found` / `External @import found` | Web fonts or images loaded by CSS | `data:` URLs, or an `installed_fonts` family by name |
| `Network APIs are blocked` | `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`, `sendBeacon` | Put the data in the document (params or inline JSON) |
| `Math.random() makes frames non-deterministic` | Random values per frame | A seeded generator, or precomputed values keyed by `t` |
| `Wall-clock time makes frames non-deterministic` | `Date.now`, `performance.now`, `new Date()` | Derive every value from the seek time `t` |
| `Timer/rAF-driven animation will not follow seeking` | `setInterval`, `requestAnimationFrame`, `setAnimationLoop` | Draw inside `window.seek(t)` (or `registerFrameSource`) |
| `Child frames and plugins are blocked` | `<iframe>`, `<webview>`, `<object>`, `<embed>` | Inline the content |
| `No seekable animation found` | No `window.seek`, GSAP, `window.__timelines`, `data-start` clips, `@keyframes` or Web Animations | Implement `window.seek(t)` |
| `Re-rendering the same time … produced a different frame` | Drawing depends on earlier frames | Set every style from `t` before measuring; rebuild changed elements each frame |
| `All probe frames are identical` | `seek(t)` ignores `t`, or the markers all fall in a static beat | Animate from `t`; put beat starts in `markers` |

  A library pasted inline keeps its license banner (`/*! … */`) first so these checks skip its
  internals (minified GSAP/Three.js mention `requestAnimationFrame` and `Date.now`).
  Defaults come from the manifest; placements override them with `params`.

### The page

- The viewport is the clip's box in pixels (a full-frame clip in a 16:9 scene renders at the
  canvas size). A fixed 1920×1080 stage scaled with `transform: scale()` is fine for full-frame
  16:9 beats (manifest `"aspects": ["16:9"]`); overlays on footage should be fluid.
- `window.seek(t)` is called for every frame, in **any order** and repeatedly (renders, probes,
  scrubbing). Draw everything from `t` alone: set every changing style each frame, set styles
  before measuring layout, no timers / `Math.random` / `Date.now` / animation loops.
- Params arrive before your scripts run as `window.__SCRIBIS_PARAMS__`, as CSS variables
  `--scribis-<key>`, as text of `data-scribis-param="<key>"` elements, and later changes fire a
  `scribis:params` event.
- No network: CDN scripts, web fonts and remote images never load. Use system fonts or the
  `installed_fonts` from `scenes_get_motion_guide`, and `data:` URLs or image params for images.
- Each frame has 15 s to render; heavy pages slow every render and export.

### Looking at frames

| Tool | Times | Notes |
|:---|:---|:---|
| `scenes_render_motion_graphic` | template seconds, 0–duration | The template alone (transparent areas transparent) |
| `scenes_render_frame` | scene seconds, 0–scene length (the end renders the last frame) | The composite as preview/export show it; a review proposal appears only after it is accepted |

Both take 1–6 times per call, or **up to 12 with `return="sheet"`**: one labelled contact sheet
image (`sheet_path`, transparent areas as a checkerboard) instead of separate images. Use it to
check a whole beat, every beat of a scene, or both sides of every cut in one look.

- Clips are active for `start ≤ t < start + duration`. A scene frame exactly at a cut shows the
  next clip at its time 0, often still empty before its entrance; check `T-0.05` / `T+0.02`.
- Sheet thumbnails are small: dense CJK characters at heavy weights can look like solid blocks.
  Use a CJK font family (not only `sans-serif`), weight ≤ 700, and render one full-size frame to
  read the text.
`return="path"` gives only file paths (for clients that cannot show images).

## Tool results

- Results are JSON text. Long lists and HTML sources can be longer than your client shows: narrow
  them (`query`, `limit`, `category`), page them (`offset`/`next_offset`, `source_offset`), or
  save the whole result before reading it. A cut-off result is not proof that an item is missing.
- If you call tools from a shell or script, let the script read large arguments (HTML, long
  operation lists) from a file and send them as the argument values; command lines have length
  limits. The tools themselves never take a file path for HTML.
