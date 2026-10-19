---
name: scribis-motion
description: >
  Short animations and HTML motion graphics inside the Scribis desktop app: animated titles
  or hooks, charts of the user's numbers, explainers, walkthrough callouts, lower thirds,
  placed on a Cuts timeline or in a scene, and later single-detail changes ("make the 41 a
  45", "the blue title at 0:12, make it red", a pasted "Scribis HTML template <id>"
  reference). Trigger without the word Scribis: "幫這段加一個動態標題", "把這些數字做成動畫長條圖", "add a kinetic
  title at 0:12". Requires the Scribis MCP tools.
---

# Scribis Motion Skill

> New to Scribis MCP? Read
> [../scribis-transcribe/references/mcp-playbook.md](../scribis-transcribe/references/mcp-playbook.md)
> first. It covers time and coordinate spaces, where IDs come from, what must be
> open, and the fix for each error.

Opening a project or scene by ID (`/scribis-edit cuts|scene <id>`, copied from
Scribis) is handled by the `scribis-edit` skill; it hands motion-graphic requests to
this skill with the editor already open. Sound for a graphic (a whoosh on a slide-in,
a pop per bullet, a riser into a reveal) follows the
[`scribis-audio`](../scribis-audio/SKILL.md) skill: place each effect on the
graphic's `markers` (clip start + marker time), 0–40 ms early, under speech.

Scribis motion graphics are code, not generated video: one self-contained HTML
document (`scribis.motion/1`) that Scribis renders frame by frame over the video.
Because it is code, any single word, number, color or timing can change later
while the rest stays exactly the same. This skill follows a brief-first
workflow: settle what the animation is for, build it from a starter with the
user's real content, check the frames, place it for review, then iterate on
single details.

If the Scribis MCP tools (`scenes_get_motion_guide`, `scenes_create_motion_graphic`,
…) are not in your tool list, this skill cannot run: the `scribis` CLI cannot
create, change or place motion graphics; it can only open a page
(`scribis open cuts <id>` / `scribis open scene <id>`). Ask the user to start
Scribis, enable MCP (Settings → MCP) and connect the Scribis MCP server to this
agent, then continue.

## 1. Brief first

Before writing anything, settle these five points. Ask only for what you cannot
infer from the request, the project or attached files; one short question is
better than a wrong animation.

| Point | Why it matters | Where to look |
|:---|:---|:---|
| **Audience and goal** | Sets tone, density and the one takeaway. | The request; the video's transcript. |
| **Where it plays** | Overlay on footage (transparent, keep the speaker visible) vs. a full-frame card in a scene; aspect ratio. | `cuts_get_project` / `scenes_get` (canvas size). |
| **Length** | Total seconds and beats of about 2–4 s each. Over speech, align beats to words. | `cuts_get_speech_words` / `scenes_get_speech_words` (what is heard, incl. TTS lines; see the `scribis-voice` skill). |
| **Content** | The user's real words, numbers, names, images. **Never invent figures.** | Transcript, attached reports/CSV, `cuts_list_assets` images. |
| **Look** | Brand colors/fonts if given, otherwise the starter defaults. | The request; existing templates. |

Record the brief in the manifest `notes` so the next editor (human or AI)
knows the intent.

## 2. Open the target so the user can review

Edits default to review mode, which needs the editor open:

- Cuts timeline → `cuts_open_project(project_id)`; scene → `scenes_open(scene_id)`.
  IDs come from `cuts_list_projects` / `scenes_list`, or from a pasted
  `/scribis-edit cuts|scene <id>` command (the `scribis-edit` skill opens it).
- `status: "requested"` means it is still loading: confirm with
  `cuts_get_project` / `scenes_get` before proposing edits.
- If the tool reports another editor is open, ask the user to save and close it.
  Never switch to `mode="auto"` just to avoid opening the editor.

(When the source material is a YouTube video, read its words with
`youtube_get_captions(url)` and open it with `app_open_youtube_browser(url)`; free accounts
get 10 new videos a month. A multi-beat explainer — title,
points, chart, takeaway as separate clips in a scene — follows the
[`scribis-explainer`](../scribis-explainer/SKILL.md) skill.)

## 3. Reuse, or start from a starter

1. `scenes_find_motion_templates(query, category?, aspect?)` — reuse or adapt an
   existing template when one fits ("the blue countdown", or `at_time="0:12"` for
   "the one at 0:12"). `category` alone (e.g. `"lower_third"`) browses a category.
   Every starter is also a read-only **built-in** template (`built_in: true`): place
   it as is with params, or derive your own with `scenes_create_motion_graphic(based_on)`;
   `scenes_update_motion_graphic` refuses to change built-in HTML.
2. Otherwise `scenes_get_motion_guide(starter=…)` and fill the returned HTML:

| Starter | Use for |
|:---|:---|
| `kinetic_title` | Section titles, hooks, key phrases (word-by-word reveal). |
| `stat_chart` | Numbers: growth, comparisons, before/after (bars + counted-up values). |
| `explainer` | Agendas, steps, summaries: title → three points → takeaway. |
| `callout` | Walkthroughs: ring + label pointing at a UI element. |
| `lower_third` | Names and roles over footage (default). |
| `hook_title`, `points_list`, `takeaway_card`, `ui_walkthrough`, `logo_outro` | Full-frame explainer beats (fluid, `length` param sets the beat duration); place the built-ins with params, see [`scribis-explainer`](../scribis-explainer/SKILL.md). |

3. **Importing a HyperFrames composition.** When the user hands over a HyperFrames
   project, or you authored one with the HyperFrames skills, import it instead of
   rewriting it: `scenes_import_motion_graphic(format="hyperframes", html=<index.html
   contents>, files={"compositions/intro.html": <contents>, …}, description, tags)`.
   Pass every file a `data-composition-src` points at (also ones referenced by other
   sub-compositions), keyed by its path relative to the entry; a missing one is an
   error that names it. Also pass local `<script src>` / stylesheet files (for example
   `vendor/gsap.min.js` or a shared kit script): they are inlined. Its declared
   variables become params. A sub-composition file (a `<template>`) has no timing of
   its own: to import one scene of a multi-scene project, still pass the project
   index.html as `html` and add `composition="compositions/<scene>.html"`; only that
   host is kept, starting at 0 for its `data-duration`, and the other scenes and the
   voiceover are left out. Footage does not go in
   the template: `<video>`/`<audio>` are rejected, so put them on the scene timeline
   (or a Cuts track) and pass `strip_media: true` to drop them from the composition.
   Read `status` as in §5, then `import.warnings`: a library loaded from a CDN (GSAP)
   must be pasted inline (fix it with `scenes_update_motion_graphic` patches) and
   project images must become data URLs or image params. Then check frames (§5.2).

Which built-in library template is which starter is in the table
[Built-in templates and their starters](references/starters.md#built-in-templates-and-their-starters).
Starter params, timing constants and the inline *Scribis motion kit* are in
[references/starters.md](references/starters.md). The motion kit (`kit.play`,
`kit.span`, …) is the helper inside the starter HTML that
`scenes_get_motion_guide(starter=…)` returns; it is a different kit from the
explainer beat kit (`K.install`, `K.pop`, …) of the
[`scribis-explainer`](../scribis-explainer/SKILL.md) skill, and a graphic uses one or
the other, never both. The full contract is in
[../scribis-transcribe/references/motion-graphics.md](../scribis-transcribe/references/motion-graphics.md)
(`scenes_get_motion_guide` returns the live version).

## 4. Build rules (keep it editable)

- **Everything the user may change is a param**: text, numbers (as text lists for
  charts), colors, booleans for optional parts, `image` for logos/photos (a Cuts
  image `asset_id`, a small `data:image` URL, or `""`; bind with
  `<img data-scribis-src="logo">` and hide `[data-scribis-empty]`), `font` for
  typefaces (an `installed_fonts` family or `""`; use
  `font-family: var(--scribis-font, system-ui), sans-serif`), and `video` for
  footage (a Cuts video `asset_id` or `""`; bind with
  `<video data-scribis-video="clip" data-trim-start="2" data-video-start="0.5">`,
  never set `src`/`currentTime` or call `play()`). The video plays muted in step
  with the template (from `data-trim-start` once t reaches `data-video-start`);
  animate the element like a picture, and put the clip's sound on a timeline audio
  track. Give each param a
  `role` (`title`, `name`, `accent_color`, `logo`, …) and the manifest a `category`
  and `aspects` (`["any"]` for fluid layouts) so templates can be browsed, filled
  by meaning, and swapped while keeping values. Timing lives in named constants
  at the top of the script (`IN`, `BEATS`, `GROW`). Then "change 41 to 45" is one
  params override and "slow the second beat" is a one-line patch.
- **Deterministic**: draw everything from `t` inside `kit.play((t, p) => …)`;
  no `Math.random`, `Date.now`, timers or `requestAnimationFrame`. Canvas, WebGL,
  Three.js or Lottie scenes register
  `window.__scribis.registerFrameSource({ render: (t) => draw(t) })` instead of a loop.
- **Self-contained, transparent, responsive**: inline CSS/JS, images as `data:`
  URLs. Google Fonts/CDN links never load; use fonts from the user's Scribis font
  library by family name (`scenes_get_motion_guide` → `installed_fonts`), system
  fonts, or an inline `data:` @font-face, and end with `sans-serif`/`serif`.
- **Fluid layout**: the viewport is the placement box, not the whole frame. A band
  of a 9:16 video is a wide box, so size text/spacing with `vmin` (or `clamp()`),
  position with `%`, let text wrap, and never hard-code a 1920x1080 or 1080x1920
  canvas for an overlay on footage. Keep text inside the 5% safe area.
  The one exception: full-frame explainer beats built with the beat kit of the
  [`scribis-explainer`](../scribis-explainer/SKILL.md) skill use its fixed
  1920×1080 stage scaled to the box, with manifest `"aspects": ["16:9"]`.
  Overlays on footage stay fluid.
- **One idea per beat**; 2–4 s per beat for an overlay; explainer beats are 4–7 s
  because they carry reading or narration time (see
  [`scribis-explainer`](../scribis-explainer/SKILL.md)). At most ~12 words on
  screen at once.
- Put each beat start in `markers` — they are the frames you will check.

## 5. Create, check, iterate

1. `scenes_create_motion_graphic(html, description, tags)` — **`html` is the
   whole document as a string inside the call.** There is no file-path or URL
   argument, and Scribis does not read files you saved locally. Write the HTML
   straight into the `html` argument; if your client or script keeps it in a
   file, read the file and pass its contents. To change it afterwards, send
   `patches`, not the whole document again. The description is the search index:
   what it shows, style, colors, motion, intended use. Read the `warnings`, the
   `logs` (the document's console output and uncaught exceptions with the line in
   your HTML; an `error` there explains an empty frame) and look at the returned
   probe frames. Fix every `error` in `logs` before judging the design.
   **Read `status` first.** `existing` means the same document is already in the
   library (`duplicate_of`): place that asset instead. `similar_found` means nothing
   was saved because a template with the same category and mostly the same words and
   params exists: `similar[]` lists them with their params and `usage_count`. Reuse
   the best match with params, change it (7.3 B) or derive it with `based_on`; resend
   with `force: true` only when the user wants a genuinely different design and say so.
2. `scenes_render_motion_graphic(asset_id, times=[markers…], params?)` — check
   each beat (`return="sheet"` shows up to 12 times in one labelled image), with the real params and at the placement box size in pixels
   (`width`/`height` = box w × frame width, box h × frame height). Fix overflow,
   overlaps and unreadable contrast. If your host cannot show images, pass
   `return="path"` and open the PNG files, or ask the user to look at them (or at
   the preview in Scribis) and describe what they see. Two things that look like bugs:
   - **Time 0 and beat starts are often empty**: elements fade or slide in from
     there. Judge each entrance 0.3–0.6 s after the beat starts, not exactly at it.
   - **CJK text**: dense characters (圖, 體, 讀) at heavy weights or small sizes
     can turn into solid dark blocks, and a font without the glyphs falls back to
     another one. Name a CJK family before the generic one (an `installed_fonts`
     family, or a system font such as `"Microsoft JhengHei"`, `"PingFang TC"`,
     `"Noto Sans TC"`), keep `font-weight` at 700 or less, skip
     `-webkit-text-stroke` and heavy text shadows on it, and render one frame at
     the real box size (not only a sheet thumbnail) to read the characters.
3. Iterate with `scenes_update_motion_graphic(asset_id, patches=[{find, replace}])`
   — small exact patches, not whole-file rewrites.

Only if the user asks for an independent rating (skip otherwise): render first.
If your host actually has the reviewer they name (a review tool or another agent
you can call), send it the brief and representative frames and place the graphic
only once it passes (no number given: 8/10, and say so). If there is no such
reviewer in this host, tell the user so and ask how to proceed; never invent a
score or present self-review as one.

## 6. Place for review

**Find the box first.** No footage under the graphic (a full-frame card, a scene
on a plain background, explainer beats)? Skip steps 1–3 and use the whole frame
(`x=0, y=0, w=1, h=1`) or the box from the brief. Over footage:
1. `cuts_get_avoid_regions(start, end, content_aspect?)`, or with `scene_id` for a
   scene. `content_aspect` = the graphic's width / height when it has a fixed
   shape (an image, a 16:9 card); omit it for fluid layouts.
2. Faces (only when people are on screen): keeping them clear is **optional**.
   No `face` regions and the user has not said? Ask whether overlays should avoid faces. Only if yes, run
   `cuts_detect_faces(action="start")`, poll `action="status"` until `done`, and
   call `cuts_get_avoid_regions` again (grain `none` only marks faces; the export
   is unchanged). If the user does not want it, pass `include_faces=false`.
3. Use the first `free_areas` entry whole (`x, y, w, h`, or its `fit` box with
   `content_aspect`). Areas grow right up to the regions and are ranked in
   pixels of the real frame, so in 9:16 a full-width band above or below a face
   usually wins. Do not shrink a graphic further to dodge a region; pick the next
   area instead. Never cover a tracked face unless the user said not to avoid faces.

- Cuts timeline: `cuts_place_visual(asset_id, start, end, transform={x, y, w, h}, params)`
  (source-video seconds; x, y = top-left over the output frame).
- Scene: `scenes_edit` → `add_clip(source="asset", source_id=<asset id>,
  track="new_layer", start, duration, x, y, w, h, params)` (scene seconds; x, y =
  top-left over the scene canvas).
- A full-frame card (an agenda or chart that replaces the shot) may cover faces on
  purpose; say so in the brief.
- Both default to `mode="review"`: tell the user what to accept in Scribis, then
  read the decision (`cuts_get_project` / `scenes_get` → `review.recent`).
- **Read `status` in the result.** `pending_review` = waiting for Accept (the rest
  of this section applies). `applied` = the user turned on **Auto-accept AI** in
  that editor's toolbar, so the edit is already live: there is nothing to accept,
  the returned IDs are final, the one-proposal limit does not apply, and you
  verify the frames right away. Tell the user it was applied, not proposed.

### One proposal at a time

- Each editor holds **one** pending AI proposal. While it waits, any other
  review-mode edit to that editor fails with "Another AI proposal is waiting for
  the user in Scribis". The user never gets a list of competing proposals.
- The Cuts editor can show two bars at once, because they are separate queues:
  the rough-cut deletion review (`delete_segment`) and the AI edit proposal
  (`cuts_*` edits, `retarget="open_project"`). Each bar has **Accept** /
  **Reject**, plus **Show**, which jumps to the edit.
- **Batch what belongs together.** In a scene, put every operation in one
  `scenes_edit(operations=[…])`: it is atomic and gets one Accept. In Cuts, each
  `cuts_*` call is its own proposal. Send the most important one first, tell
  the user what to accept, and send the next only after the decision.
- `scenes_update_motion_graphic(retarget=…)` while another proposal waits still
  creates the new version, but its `retarget` result reports the busy editor.
  Switch the placement later with `cuts_update_visual(block_id, asset_id=<new>)`
  or `scenes_edit` → `replace_asset`.
- Read the decision with `cuts_get_project` / `scenes_get` → `review.recent`.
  Ask the user, or check once they say they are done; don't poll in a loop.
  - `accepted`: done.
  - `rejected`: don't resend unless the user asks.
  - `conflict`: the timeline changed under the proposal; re-read and propose again.
  - `expired`: another project or scene was opened; reopen it and propose again.
- Never switch to `mode="auto"` to get around a waiting proposal.
- IDs in a `pending_review` result (`clip_id`, `track_id`, `block_id`) are
  provisional: accepting re-applies the edit and can assign new ones. Re-read
  `scenes_get` / `cuts_get_project` before a follow-up edit.
- Accepted edits are saved by the editor's autosave; `unsaved_changes: true`
  after a few seconds means autosave is off. Remind the user to save before
  closing.

- Verify in context:
  - **Cuts timeline**: `render_preview_frame(timestamp_sec)` returns the composite
    (video + subtitles + visual layers) of the open Cuts editor.
  - **Scene**: `scenes_render_frame(times=[…])` returns the composite (storyboard
    footage and transitions, layer tracks with the HTML graphic and its params,
    scene background) exactly as the scene preview and export show it. Pass the
    graphic's markers as scene seconds (clip start + marker, from `scenes_get`),
    up to 6 per call. It renders the open editor's live state (or the saved
    scene), so a review proposal appears only after the user accepts it. Check
    placement, overlap with faces or burned-in text, and contrast over the
    footage; fix with `scenes_edit` `update_clip` (`x/y/w/h`, `params`).

## 7. Change an existing graphic later

Users point at a graphic in four ways: an AI reference of the placed block copied
from the editor (`motion-1a2b3c4d`, or a line `Scribis Cuts motion-… · project:<id>`;
resolve it with `scribis_resolve_ref`, then read its asset), a pasted reference copied
from the HTML templates library (`Scribis HTML template <template_id> (<name>)`), words
("the blue countdown"), or a position ("the one at 4:10"). The request is usually one
detail: "make it red", "change 41 to 45", "slow the second beat".

### 7.1 Resolve and read

1. `scenes_find_motion_templates(query=<template_id or the user's words>)`, or
   `at_time="4:10"` (+ `project_id` / `scene_id`) for a position. Take
   `template_id`, **`latest_asset_id`**, `version` and `params` from the hit.
   The ID in a pasted reference is the template ID (its first version); always
   read and edit `latest_asset_id`, never an older version.
2. `scenes_get_motion_graphic(latest_asset_id, include_source=true)` →
   manifest `params`, `usages` (Cuts `project_id` + `block_id`, scene `scene_id` +
   `clip_id`, with any per-placement `params` overrides) and the HTML source.
3. A scene clip may be one part of a split template: its reference line and
   `scribis_resolve_ref` give the composition time it shows (`(source 0:05.38–0:26.54)`,
   `source_start`–`source_end`). "Slow the second beat" or "change what this part shows"
   means the template around those `t` values; other parts using the same asset show other
   `t` ranges. To change only this part, use per-placement `params` (A) or switch only its
   clip to the new version (`scenes_edit replace_asset` with `clip_ids`).

### 7.2 Map the request to params first

- Colors → the `type: "color"` params; the `label` tells the role (Accent,
  Ink, Background…). "Make it red" means the accent/brand color unless the
  user says text or background. Pick a concrete value (red ≈ `#e53935`),
  say which param and value you chose, and keep text readable on it.
- Words and numbers → `text`/`number` params; on/off parts → `boolean` params;
  speed → timing constants at the top of the script (or a timing param).
- "Use our logo / this photo" → an `image` param: find the image with
  `cuts_list_assets(kind="image", query=…)` and pass its `asset_id` (`""` removes
  it). "Use font X" → a `font` param with a family from `installed_fonts`.
  "Put this clip in the graphic" → a `video` param: find it with
  `cuts_list_assets(kind="video", query=…)` and pass its `asset_id`; it plays muted,
  so add the clip's audio on a timeline audio track when the user wants its sound.
  The param `role` (`logo`, `heading_font`, `accent_color`, …) tells which one.
- "Use another design for this" → switch the placement to another template
  (`cuts_update_visual(block_id, asset_id)` / `scenes_edit replace_asset`);
  overrides follow by key, or by `role` when the keys differ.
- No param for it → it is a code change (7.3 B with patches). On a built-in
  template (`built_in: true`) code changes go to a derived copy
  (`scenes_create_motion_graphic(based_on=…)`), never the built-in itself.

### 7.3 Decide the scope

Versions are history, not copies: a new version keeps the same `template_id`,
and both the Scribis library (one card with a version history) and the search
tools (`scenes_find_motion_templates`, `cuts_list_assets`) show the template
once, as its latest version. Older versions stay for rollback and for placements
that still use them. Never create a new template (C) just to change a color or a
word, because that one does add another entry to the library.

Prefer the lightest change that meets the request:
1. **Params on the placements** (A): no new version at all. Best when the user
   means this video or these placements, or wants to try a look first.
2. **New version** (B): when the template itself should change (a pasted
   template reference, "everywhere", "from now on").
3. **New template** (C): only when the user asks for a separate variant.

| The user said | Do |
|:---|:---|
| **A. This placement** ("this one", "at 4:10", "only in the intro") | Override params on that placement only — no new version: `cuts_update_visual(block_id, params={accent: "#e53935"})` or `scenes_edit` → `update_clip(clip_id, params={…})`. `params: null` resets to the template defaults. |
| **B. The template** (a pasted template reference, "the template", "everywhere", "from now on") | New version with `scenes_update_motion_graphic(asset_id=latest_asset_id, patches, description, retarget)` (see below). |
| **C. A variant**, keep the original | `scenes_create_motion_graphic(based_on=latest_asset_id, patches, description, tags)` → new template ID. |
| Unclear | A pasted template reference means B. A position or "this" means A. Otherwise ask one short question; offer A when the user only wants it in this video. |

For **B**:

- **Patch every place the old value lives**, not only the manifest default:
  the param's `"default": "<old>"`, CSS fallbacks such as
  `--scribis-accent: <old>`, and any hard-coded copy of the value in styles or
  script. Search the source you read in 7.1 for the old value (case-insensitive).
  Each patch `find` must match exactly once, so include the surrounding
  text, or set `all=true` deliberately.
- **Keep the search index true**: pass an updated `description` (and `tags`)
  when the look changes ("mint" → "red").
- **Switch the placements to the new version**: for each Cuts usage, open its
  project (`cuts_open_project(project_id)`) and pass `retarget="open_project"`;
  for scene usages, `scenes_open(scene_id)` + `retarget="open_scene"`. The
  retarget is a review proposal: tell the user to accept it in Scribis. Usages in
  other projects keep the old version until retargeted (or `scenes_edit`
  `replace_asset` / `cuts_update_visual(asset_id=new)` for each).
- A placement whose `params` override the changed param keeps its override. Clear
  it with `params: null` (or set the new value) when the user wants the new look
  there too.

### 7.4 Verify and report

- `scenes_render_motion_graphic(new_asset_id, times=<markers>)` for the graphic
  alone, then after the user accepts, `render_preview_frame(timestamp_sec=<a
  marker inside the placement>)` for the composite over a Cuts timeline, or
  `scenes_render_frame(times=<scene seconds inside the clip>)` in a scene.
- Report the param and value used, the new version number and asset ID, which
  placements switched or wait for review, and anything you left unchanged.

### Other single-detail edits

| Request | Do |
|:---|:---|
| Longer/shorter on the timeline | `cuts_update_visual(block_id, start, end)` / `scenes_edit` `trim_clip`. Moving only the start edge cuts the intro (`source_offset` advances); to show it later instead, move `start` and `end` together. Cut or join parts: `cuts_split_block` / `cuts_merge_blocks`, `scenes_edit` `split_clip` / `merge_clips` |
| Faster/slower motion | Patch the timing constant (`IN`, `BEATS`, `GROW`) or set the timing param (e.g. `stagger`) |
| New wording or numbers everywhere | Patch the param `default` (7.3 B), or override params per placement (7.3 A) |

### Example: "Scribis HTML template <template-id> (Sales growth chart) 改成紅色"

1. `scenes_find_motion_templates(query="<template-id>")` → `latest_asset_id`
   `<asset-id>`, version 2; color params `accent` (`#2ee6b6`, the mint bars,
   tag and card shadow) and `ink` (`#111111`, text and borders).
2. `scenes_get_motion_graphic("<asset-id>", include_source=true)` → usage: Cuts
   project `<project-id>`, block `<block-id>` (12.0–20.0 s); the source holds
   `#2ee6b6` twice (manifest default, `:root { --scribis-accent: … }`).
3. A pasted template reference → scope B; red = `accent` → `#e53935`; `ink`
   stays black for contrast.
4. `cuts_open_project("<project-id>")`, then
   `scenes_update_motion_graphic(asset_id="<asset-id>", patches=[
   {find: "\"default\": \"#2ee6b6\"", replace: "\"default\": \"#e53935\""},
   {find: "--scribis-accent: #2ee6b6", replace: "--scribis-accent: #e53935"}],
   description=<same text with "red" instead of "mint">, retarget="open_project")`
   → version 3, retarget proposal waiting for review.
5. Check frames at the markers, ask the user to accept, then
   `render_preview_frame(timestamp_sec=16)` to see it over the video.

## 8. Hand-off

Report what you made (template name and ID), where it is placed, what waits for
review, and the params the user can tweak in Scribis (canvas toolbar →
**Parameters**). The user exports the finished video (MP4) from the Scribis Cuts
or scene editor.

## Example

> "Make a 6-second animated chart of our Q1–Q4 users (12k, 18k, 26k, 41k) for the
> all-hands, over the intro of scene 7f3…"

1. Brief: all-hands audience, takeaway "growth accelerated in Q4", 6 s over
   footage in a 16:9 scene, numbers given by the user, default colors.
2. `scenes_open("7f3…")` → `scenes_get` (canvas 1920×1080, intro clip times).
3. `scenes_find_motion_templates(query="bar chart users", category="chart")` →
   the built-in **Animated bar chart** (`built_in: true`, starter `stat_chart`,
   6 s). It fits, so no new template: take its `latest_asset_id`.
4. Fill it with params only: `labels="Q1, Q2, Q3, Q4"`, `values="12, 18, 26, 41"`,
   `suffix="k"`, `title="Q1–Q4 users"`. Only when the design itself must change
   (layout, a second series) derive a copy with
   `scenes_create_motion_graphic(based_on=<latest_asset_id>, patches, description, tags)`.
5. `scenes_render_motion_graphic(<latest_asset_id>, times=[0.6, 3.2, 5.5],
   params={…}, width=…, height=…)` → check the beats with the real values.
6. `scenes_edit add_clip(source="asset", source_id=<latest_asset_id>,
   track="new_layer", start=1, duration=6, params={labels, values, suffix, title})`
   → user accepts in Scribis → `scenes_render_frame(times=[1.6, 4.2, 6.5])` to
   see the chart over the intro footage.
7. Later "Q4 was actually 45k" → `scenes_edit update_clip(clip_id,
   params={values: "12, 18, 26, 45"})`.
