<!-- Summary of the motion-graphic contract; scenes_get_motion_guide returns the live version. -->
# Scribis motion graphics (scribis.motion/1)

A motion graphic is ONE self-contained HTML document stored as a Cuts "html" asset and placed on a
scene layer track (above the storyboard) or on a Cuts project's visual track (above the original
video). Scribis renders it offscreen, frame by frame, at the exact
local time of the clip (0 = clip start), in preview and in export.

## Start from a brief
Settle a short brief before writing HTML; ask the user only for what is missing and keep the
answers in the manifest `notes`:
- Audience and goal: who watches and the one thing they should remember.
- Where it plays: scene layer over footage, Cuts overlay, or a full-frame card; take the aspect
  ratio from the scene or project (scenes_get / cuts_get_project). Over footage, pick the box with
  cuts_get_avoid_regions (pass content_aspect) and preview at that box size. Keeping clear of faces
  is optional: ask the user before tracking faces (cuts_detect_faces) if they have not said.
- Length: total seconds, split into beats of about 2-4 s for overlays (explainer beats built with the scribis-explainer beat kit run 4-7 s because they carry reading or narration time); put each beat in `markers`. Over speech,
  time beats from the words actually heard: cuts_get_speech_words / scenes_get_speech_words
  (TTS lines have their own timing; subtitles keep the original recording's).
- Content: the user's real words, numbers, names and images (transcript, attached reports, data);
  never invent figures. Images go in as data: URLs.
- Look: brand colors and fonts if given (fonts from installed_fonts), otherwise the starter's
  defaults.

## Built-in templates and starters
Every starter is also in the user's library as a read-only built-in template (built_in_templates in
the scenes_get_motion_guide result, built_in: true in search results). When one fits, place it as is
with params; to change its design, derive your own with scenes_create_motion_graphic(based_on).
Instead of a blank page, call scenes_get_motion_guide with `starter` and fill the returned HTML:
- `lower_third`: name/role cards over footage (the reference template below).
- `kinetic_title`: section titles and hooks revealed word by word.
- `stat_chart`: animated bar chart with counted-up values from comma-separated params.
- `explainer`: title, three numbered points and a takeaway in timed beats.
- `callout`: walkthrough ring + label pointing at a UI element (x/y in percent of the frame; place it full-frame).
Explainer beats (full-frame cards on a shared background/text/accent/font look; one clip per beat,
clip duration = the `length` param, up to 8 s):
- `hook_title`: opening statement with accent words, kicker and subline.
- `points_list`: title and up to five numbered points ("|"-separated), one per narration beat.
- `takeaway_card`: one takeaway sentence on a card, optional logo.
- `ui_walkthrough`: screenshot with cursor click, ripple, zoom and a label card with chips (x/y in percent of the screenshot).
- `logo_outro`: logo or monogram, wordmark, tagline and an optional call to action.
Starters other than lower_third share the inline "Scribis motion kit" (`kit.play(draw)` installs window.seek; `span`,
`life`, `ease`, `mix`, `number`, `list`, `text`, `words`). Keep every word, number, color
and timing the user may change in `params` (timing constants at the top of the script), so a
later request ("change 41 to 45", "slow the second beat") is one params override or one small patch
and the rest of the graphic stays the same.

## Hard requirements
1. Self-contained: inline <style>/<script>; images as data: URLs. Network, child frames,
   Node.js, permissions and navigation are blocked (CSP: default-src 'none'), so CDN `<script src>`,
   Google Fonts `<link>`/`@import` and `import ... from "https://..."` do not load.
   Fonts: use the user's Scribis font library by family name (`font-family: "Noto Sans TC"`);
   scenes_get_motion_guide lists them in installed_fonts and Scribis loads every listed family a
   document mentions (also through a text/select param value). Fonts installed on the computer work
   by name too; anything else must be an inline @font-face with a data: URL. Always end the stack
   with a generic family (sans-serif / serif). To use GSAP, Three.js or Lottie, paste the
   minified build inline in its own <script>, keeping its license banner (`/*! ... */`) first so
   validation skips the library's internals. Max 20 MB.
2. Deterministic and seekable: implement `window.seek(seconds)` (sync or async) that renders the
   exact frame for any t in [0, duration], including seeking backwards. Alternatives that Scribis also
   seeks: classic (non-module) GSAP, whose global timeline is paused on load and keeps completed
   tweens; `window.__timelines[id]` paused timelines; CSS/Web Animations (paused and set to
   t*1000 ms). Three.js/canvas: draw the frame for t inside window.seek, never in an animation loop.
   Never use Math.random(), Date.now(), performance.now(), setInterval, requestAnimationFrame or
   setAnimationLoop to drive visuals.
   HyperFrames compositions (hyperframes/1): import a project with scenes_import_motion_graphic
   (format "hyperframes", the entry index.html as html, every data-composition-src file and local
   script/stylesheet in files; composition=<sub-composition path> imports one scene on its own).
   It inlines local scripts and sub-compositions (scoping their CSS, prefixing colliding ids, applying
   data-variable-values), turns data-composition-variables bound by data-var-text/data-var-src into
   params, and builds the manifest from the root size, duration and clip starts. At render time a
   root `[data-composition-id]` with data-width/data-height is scaled to fit the viewport
   (letterboxed when the box has another shape, so prefer a fluid layout), `[data-start]` clips
   are shown only while start <= t < start + data-duration (or data-end; clip-id references such as
   "intro + 2" are allowed; times are relative to an enclosing timed composition),
   data-track-index is only a timeline-track hint (clips on one track do not overlap) and stacking
   follows the document's own CSS (z-index, source order), [data-hidden] elements stay hidden, and `window.__timelines[id]` is sought at that composition's local time.
   Not supported: <video>/<audio> (every one is rejected, or removed with strip_media: put footage on
   the scene timeline or a Cuts track; to show a library video inside the graphic, add a video
   param to the imported template, see Parameters), data-chart and data-color-grading, and libraries or assets loaded
   from a URL (paste GSAP inline; embed images as data URLs).
3. Transparent background (html/body are transparent); the original video shows through.
4. Responsive: the viewport IS the placement box, in pixels: a full-frame clip gets the whole
   16:9 or 9:16 frame, a box from cuts_get_avoid_regions free_areas gets that box's own shape
   (e.g. a 0.92 x 0.42 band of a 9:16 frame is about 994 x 806 px). Lay out fluidly so the graphic
   fills whatever box it gets: size text and spacing in vmin (or clamp() with vmin), positions in
   %, and let text wrap within the width; avoid fixed 1920x1080 / 1080x1920 canvases (one documented exception: full-frame 16:9 explainer beats may use a fixed 1920x1080 stage scaled to the box, with aspects ["16:9"]). Keep text
   inside a 5% safe area.
5. Start with <!DOCTYPE html> and include a manifest so the graphic stays editable later:

```html
<script type="application/json" id="scribis-motion">
{ "schema": "scribis.motion/1", "title": "Lower third", "duration": 5,
  "params": { "title": { "type": "text", "default": "Jane Doe" },
              "accent": { "type": "color", "default": "#4f7cff" } },
  "markers": [{ "time": 0.6, "label": "intro-done" }],
  "notes": "Design intent for the next editor (human or AI)." }
</script>
```

## Parameters (reusable templates)
Param types: text | color | number (min/max/step) | boolean | select (options) | image | font | video. Each
scene clip or Cuts visual block may override params without changing the HTML. Before your scripts
run Scribis provides:
- `window.__SCRIBIS_PARAMS__` — merged defaults + clip/block overrides (read it inside seek()).
- CSS variables `--scribis-<name>` for text/color/number/select params; boolean params toggle the
  attribute `data-scribis-<name>` on <html>.
- Elements with `data-scribis-param="<name>"` get their textContent replaced.
- image params: the value is a Cuts image asset_id (cuts_list_assets kind "image"), a small base64
  data:image URL, or "" for none. The page receives a loadable URL: `<img data-scribis-src="<name>">`
  gets its src (and the attribute `data-scribis-empty` when there is no image, so
  `[data-scribis-empty]{display:none}` hides it), and `--scribis-<name>` is `url(...)` or `none`
  for CSS backgrounds. Default to "" so the template also works without an image.
- font params: an installed font family (installed_fonts) or "" for the template's own font.
  `--scribis-<name>` is the quoted family when set (write `font-family: var(--scribis-font,
  system-ui), sans-serif`), and `data-scribis-font="<name>"` elements get it as font-family.
- video params: the value is a Cuts video asset_id (cuts_list_assets kind "video") or "" for none
  ("media", the footage under the template, is reserved and rejected for now). Bind it to an
  element with `data-scribis-video="<name>"`: a `<video>` (preferred) or `<img>`. A `<video>`
  plays the footage, muted, in step with the template: at time t it shows the footage at
  `data-trim-start + max(0, t - data-video-start)` seconds (both default 0; before
  data-video-start it shows the trim frame, after the footage ends it holds the last frame).
  Scribis seeks it for every rendered frame, so never set src or currentTime, autoplay, loop or
  call play(), and do not put timing on it with data-start. Footage that cannot be decoded, and
  `<img>` elements, show ONE still frame (the frame at data-trim-start). Animate the element or a
  wrapper like any picture (transform, clip-path, mask, filter, border-radius) and size it with
  object-fit. Sound never comes from the template: put the clip's audio on a timeline audio track.
  The element gets `data-scribis-video-mode` ("playback", or "poster" for a still frame; the page
  mode is `window.__scribis.videoMode`), and
  `data-scribis-empty` when there is no video. `--scribis-<name>` is `url(<first frame>)` or
  `none`; use it from a <style> or a style attribute (the frame is loaded before capture only
  then). Default to "".
- A `scribis:params` DOM event when values change.
Give every param a `role` saying what it means (title, subtitle, name, job_title, body, label,
value, data_labels, data_values, accent_color, text_color, background_color, logo, image, video,
heading_font, timing, ...): users and agents fill templates by meaning, and when a block switches to
another template, values move to the param with the same role. Set the manifest `category`
(lower_third, title, chart, explainer, callout, caption, quote, cta, logo, overlay, background,
transition, other) and `aspects` (["any"] for fluid layouts, else e.g. ["9:16"]) so the template
can be browsed and filtered.

## Other renderers
Canvas, WebGL, Three.js or Lottie scenes register a frame source instead of an animation loop:
`window.__scribis.registerFrameSource({ render: (t) => drawFrame(t) })`. Scribis calls render(t)
after window.seek for every frame (it may return a Promise; the frame is captured after it resolves).

## Templates (find and reuse)
Every motion graphic you create is saved to the user's HTML templates library (Cuts → HTML motion
graphics) with a stable template_id that survives edits. Always pass a `description` (what it shows,
style, colors, motion, intended use) and a few `tags`; they are the search index the user and future
agents rely on. Users refer to templates in natural language, for example "the template at 11:50",
"the blue countdown". Resolve those with scenes_find_motion_templates (query and/or at_time) and use the
returned latest_asset_id:
- change that template → scenes_update_motion_graphic (new version, same template_id);
- make another graphic based on it → scenes_create_motion_graphic with based_on (new template_id).
Identical or near-duplicate templates are not saved twice: scenes_create_motion_graphic returns the
existing template (status "existing") for a document already in the library, and status
"similar_found" with the matching templates for a near-duplicate (same category, mostly the same
words and params). Reuse the match with params, change it, or derive it with based_on; pass
force: true only when the design is genuinely different. Search results show usage_count, so a
template placed in several videos ranks above a one-off.

## Recommended agent workflow
1. Brief (audience, placement, length, real content, look) → scenes_find_motion_templates (query,
   category, aspect) to reuse a built-in or existing template, or adapt one with based_on.
2. Otherwise scenes_get_motion_guide with the closest `starter` → fill its params and content.
3. scenes_create_motion_graphic (with description and tags; the document goes in the `html` string
   argument, never as a file path) → read validation `warnings`, the `logs` (the document's
   console output and uncaught exceptions, with source lines) and the probe frames.
4. scenes_render_motion_graphic at key times (markers), with width/height = the placement box in
   pixels → inspect, iterate with scenes_update_motion_graphic
   (prefer small `patches` over resending the whole file).
5. Place it (review mode by default; the user accepts in Scribis). Use the free area whole as the
   box; do not shrink it further to dodge regions (choose another area instead): in a scene with scenes_edit
   add_clip (source "asset", params) on a layer track, or on a Cuts timeline with cuts_place_visual
   (asset_id, start, end, params; source-video seconds). Once accepted, check it over the footage
   with scenes_render_frame (scene seconds) or render_preview_frame (Cuts timeline).
6. Later sessions: scenes_find_motion_templates / scenes_get / cuts_get_project →
   scenes_get_motion_graphic (source + manifest + usages) → scenes_update_motion_graphic (creates a
   new immutable version; retarget "open_scene" or "open_project" switches the open scene's clips or
   the open Cuts project's blocks to it).

## Reference template

```html
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<script type="application/json" id="scribis-motion">
{
  "schema": "scribis.motion/1",
  "title": "Lower third",
  "duration": 5,
  "width": 1920,
  "height": 1080,
  "category": "lower_third",
  "aspects": ["any"],
  "params": {
    "title": { "type": "text", "label": "Title", "default": "Jane Doe", "maxLength": 60, "role": "name" },
    "subtitle": { "type": "text", "label": "Subtitle", "default": "Product Designer", "maxLength": 80, "role": "job_title" },
    "accent": { "type": "color", "label": "Accent", "default": "#4f7cff", "role": "accent_color" },
    "logo": { "type": "image", "label": "Logo", "default": "", "role": "logo" },
    "font": { "type": "font", "label": "Font", "default": "", "role": "heading_font" },
    "inSeconds": { "type": "number", "label": "Intro length", "default": 0.6, "min": 0.1, "max": 2, "role": "timing" }
  },
  "markers": [{ "time": 0.6, "label": "intro-done" }, { "time": 4.4, "label": "outro-start" }],
  "notes": "Name card anchored bottom-left. Keep text inside the 5% title-safe area."
}
</script>
<style>
  :root { --scribis-accent: #4f7cff; }
  .stage { position: absolute; inset: 0; font-family: var(--scribis-font, system-ui), -apple-system, "Segoe UI", "Noto Sans TC", sans-serif; }
  .card { position: absolute; left: 6%; right: 6%; bottom: 9%; display: flex; gap: 2vmin; align-items: stretch; }
  .logo { flex: none; align-self: center; max-height: 12vmin; max-width: 20vmin; object-fit: contain; }
  .logo[data-scribis-empty] { display: none; }
  .bar { flex: none; width: 1vmin; background: var(--scribis-accent); border-radius: .5vmin; transform-origin: bottom; }
  .text { display: flex; flex-direction: column; justify-content: center; overflow: hidden; }
  .title { color: #fff; font-size: 7vmin; font-weight: 700; line-height: 1.15; text-shadow: 0 .5vmin 2vmin rgba(0,0,0,.45); }
  .subtitle { color: rgba(255,255,255,.85); font-size: 4.4vmin; margin-top: .7vmin; }
</style>
</head>
<body>
<div class="stage">
  <div class="card">
    <img class="logo" id="logo" data-scribis-src="logo" data-scribis-empty alt="">
    <div class="bar" id="bar"></div>
    <div class="text">
      <div class="title" id="title" data-scribis-param="title">Jane Doe</div>
      <div class="subtitle" id="subtitle" data-scribis-param="subtitle">Product Designer</div>
    </div>
  </div>
</div>
<script>
  const manifest = JSON.parse(document.getElementById('scribis-motion').textContent);
  const params = () => Object.assign(
    Object.fromEntries(Object.entries(manifest.params).map(([key, spec]) => [key, spec.default])),
    window.__SCRIBIS_PARAMS__ || {}
  );
  const clamp = (value) => Math.min(1, Math.max(0, value));
  const easeOut = (value) => 1 - Math.pow(1 - value, 3);
  // Every visual property is a pure function of t, so seeking forwards or backwards is exact.
  window.seek = (t) => {
    const p = params();
    const intro = easeOut(clamp(t / p.inSeconds));
    const outro = easeOut(clamp((t - (manifest.duration - p.inSeconds)) / p.inSeconds));
    const visible = intro * (1 - outro);
    document.getElementById('bar').style.transform = 'scaleY(' + visible + ')';
    document.getElementById('logo').style.opacity = String(visible);
    for (const [id, delay] of [['title', 0], ['subtitle', 0.12]]) {
      const local = easeOut(clamp((t - delay) / p.inSeconds)) * (1 - outro);
      const element = document.getElementById(id);
      element.style.opacity = String(local);
      element.style.transform = 'translateX(' + (1 - local) * -5 + 'vmin)';
    }
  };
  window.seek(0);
</script>
</body>
</html>
```
