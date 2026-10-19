# Scribis motion starters

> **No code on this page.** The starter HTML and the inline motion kit code come only from
> `scenes_get_motion_guide(starter=<kind>)` at run time. This page documents each starter's
> params, timing and markers, and the kit's members; do not look for the code here.

`scenes_get_motion_guide(starter=<kind>)` returns `template` (the starter HTML),
`starters` (the catalog) and `guide` (the full `scribis.motion/1` contract).

Every starter is a valid, lint-clean `scribis.motion/1` document. Fill it by
changing the manifest `params` defaults (and `title`, `notes`, `markers`,
`duration`); change markup or script only when the design needs it.

Each starter is also in the user's library as a read-only built-in template
(`built_in: true` in `scenes_find_motion_templates`, listed in
`scenes_get_motion_guide` → `built_in_templates`). Place it as is with `params`, or
derive your own with `scenes_create_motion_graphic(based_on=latest_asset_id)`.
Every starter declares `aspects: ["any"]` (fluid layout) and a `category`; the
Role column below is each param's `role`, which carries values over when a
block switches templates.

## Built-in templates and their starters

The built-in library templates are these starters under their library names. Place one with
`params` only (no HTML) after finding it with `scenes_find_motion_templates`.

| Library name | Starter | Category | Use for |
|:---|:---|:---|:---|
| `Kinetic title` | `kinetic_title` | `title` | Section titles, hooks and key phrases revealed word by word |
| `Animated bar chart` | `stat_chart` | `chart` | Numbers from reports or the transcript: growth, comparisons, before/after |
| `Three-point explainer` | `explainer` | `explainer` | Short explainers, agendas, steps and summaries in timed beats |
| `Walkthrough callout` | `callout` | `callout` | Product walkthroughs and tutorials: point at a UI element with a label |
| `Lower third` | `lower_third` | `lower_third` | Name/role cards and speaker introductions over footage |
| `Hook title` | `hook_title` | `title` | Explainer opening beat: big statement with accent words, kicker, subline |
| `Points list` | `points_list` | `explainer` | Explainer beat: up to five numbered points, one per narration beat |
| `Takeaway card` | `takeaway_card` | `cta` | Explainer closing beat: one takeaway sentence, optional logo |
| `UI walkthrough` | `ui_walkthrough` | `callout` | Explainer beat on a screenshot: cursor click, ripple, zoom, label card with chips |
| `Logo outro` | `logo_outro` | `logo` | Explainer end card: logo or monogram, wordmark, tagline, call to action |

### Explainer beat → built-in

The `scribis-explainer` skill builds an explainer as one scene clip per beat. Pick the beat's
built-in here and place it with `params`; create a template only for a beat none of them can
express.

| Beat | Built-in (starter) | Key params |
|:---|:---|:---|
| Hook / opening statement | `Hook title` (`hook_title`) | `headline`, `emphasis`, `kicker`, `subline` |
| Chapter or section title | `Hook title` (`hook_title`) with `subline: ""` | `kicker`, `headline` |
| Steps, reasons, features | `Points list` (`points_list`) | `title`, `points` (`a \| b \| c`), `firstAt`, `gap` |
| A number or comparison (before/after) | `Animated bar chart` (`stat_chart`) | `labels: "Before, After"`, `values`, `suffix` |
| Product / UI step | `UI walkthrough` (`ui_walkthrough`) | `screenshot`, `x`, `y`, `label`, `detail`, `chips`, `clickAt` |
| Takeaway | `Takeaway card` (`takeaway_card`) | `takeaway`, `emphasis`, `logo` |
| Logo end card | `Logo outro` (`logo_outro`) | `logo`, `name`, `tagline`, `cta` |

`stat_chart` already covers before/after comparisons (two labels, two values, last bar
highlighted), so there is no separate comparison beat. It is an overlay panel without the beat
look: on a beat scene set the scene canvas (`set_canvas background_color`) to the beats'
`background` so it sits on the same color.

## Starters

### `kinetic_title` (4 s, category `title`)
Kicker slides in, headline words rise one by one, an accent rule draws underneath.

| Param | Type | Role | Default |
|:---|:---|:---|:---|
| `kicker` | text | `label` | `Chapter 2` |
| `headline` | text | `title` | `Ship small, learn fast` |
| `accent` | color | `accent_color` | `#ff6b4a` |
| `textColor` | color | `text_color` | `#ffffff` |
| `font` | font (installed family, `""` = template font) | `heading_font` | `""` |
| `align` | select `left` \| `center` | — | `center` |
| `stagger` | number (s, 0–0.5) | `timing` | `0.12` |
| `backdrop` | boolean (dim the video behind) | — | `true` |

Timing constants: `IN` (headline start), `OUT` (outro length). Markers: `headline-in`, `outro-start`.

### `stat_chart` (6 s, category `chart`)
Panel with a title, one bar per label, values counted up, last bar highlighted.

| Param | Type | Role | Default |
|:---|:---|:---|:---|
| `title` | text | `title` | `Monthly active users` |
| `labels` | text, comma-separated | `data_labels` | `Q1, Q2, Q3, Q4` |
| `values` | text, comma-separated numbers | `data_values` | `12, 18, 26, 41` |
| `prefix` / `suffix` | text | — | `` / `k` |
| `decimals` | number 0–3 | — | `0` |
| `source` | text | `source_note` | `Source: internal dashboard` |
| `accent` / `barColor` | color | `accent_color` / — | `#4f7cff` / `#9aa7c7` |
| `highlightLast` | boolean | — | `true` |

Bars = min(labels, values) count; negative values draw empty bars. Timing:
`START`, `GROW`, `STAGGER`. Markers: `bars-start`, `values-final`, `outro-start`.
Only use numbers the user supplied or that appear in their files/transcript.

### `explainer` (10 s, category `explainer`)
Three beats: title → three numbered points revealed one by one → takeaway.

| Param | Type | Role | Default |
|:---|:---|:---|:---|
| `title` | text | `title` | `How the new workflow works` |
| `point1` / `point2` / `point3` | text | — | `Record once` / `Let AI cut the pauses` / `Review and export` |
| `takeaway` | text | `body` | `Ten minutes instead of an hour` |
| `accent` | color | `accent_color` | `#2fbf71` |
| `panel` | boolean (panel behind text) | — | `true` |

Timing: `BEATS = { title: [0, 2.5], points: [2.5, 7], takeaway: [7, 10] }`,
`POINT_GAP`. Keep `markers` in sync with `BEATS`. To fit narration, set each
beat start to the first word's `start` (clip-local seconds = word time − clip start).

### `callout` (4 s, category `callout`)
Pulsing ring at a target point, leader line, label card on the side with more room.

| Param | Type | Role | Default |
|:---|:---|:---|:---|
| `label` / `detail` | text | `label` / `body` | `Export button` / `Renders the final MP4` |
| `x` / `y` | number 0–100 (% of the frame) | — | `70` / `30` |
| `accent` | color | `accent_color` | `#ffcc00` |
| `pulse` | boolean | — | `true` |

Measure `x`/`y` from `render_preview_frame` (pixel ÷ frame size × 100). The card
is kept inside the 5% safe area automatically. Timing: `LINE` (leader length in vmin).

### `lower_third` (5 s, category `lower_third`)
The reference template: optional logo + accent bar + title/subtitle, bottom-left.

| Param | Type | Role | Default |
|:---|:---|:---|:---|
| `title` / `subtitle` | text | `name` / `job_title` | `Jane Doe` / `Product Designer` |
| `accent` | color | `accent_color` | `#4f7cff` |
| `logo` | image (Cuts image `asset_id`, small `data:image` URL, `""` = hidden) | `logo` | `""` |
| `font` | font (installed family, `""` = template font) | `heading_font` | `""` |
| `inSeconds` | number 0.1–2 | `timing` | `0.6` |

The logo is `<img data-scribis-src="logo">`, hidden through `[data-scribis-empty]`
when no image is set; the font reaches the card through `var(--scribis-font, system-ui)`.

### Explainer beats (`hook_title`, `points_list`, `takeaway_card`, `ui_walkthrough`, `logo_outro`)

Full-frame beats for the `scribis-explainer` skill. They share one look and one clock:

| Param | Type | Role | Default |
|:---|:---|:---|:---|
| `accent` | color | `accent_color` | `#ff7a45` |
| `textColor` | color | `text_color` | `#f5f3ee` |
| `background` | color (`transparent` shows the scene canvas) | `background_color` | `#10131c` |
| `font` | font (installed family, `""` = template font) | `heading_font` | `""` |
| `length` | number 3–8 (s) | `timing` | per beat, below |

- **Clip duration = `length`.** The manifest `duration` is 8 s (the longest beat); the beat
  plays its outro in the last ~0.45 s before `length`, so give the clip the same duration as
  `length`. A clip longer than `length` shows only the background after the outro.
- The background is opaque for the whole clip and the content fades over it, so two beats with
  the same `background` cut cleanly. Give every beat of one explainer the same look params.
- Text reveals split words (CJK: characters); `emphasis` takes `|`-separated phrases from the
  text to color with the accent.
- Every text param marked `"" = none` hides its element when empty.

**`hook_title`** (category `title`, `length` 5): kicker, statement words rising one by one, accent rule, subline.

| Param | Type | Role | Default |
|:---|:---|:---|:---|
| `kicker` | text | `label` | `Q3 in one minute` |
| `headline` | text (≤ 90) | `title` | `Revenue doubled in 90 days` |
| `emphasis` | text, `\|`-separated | `emphasis` | `doubled` |
| `subline` | text | `subtitle` | `What changed, and what comes next` |
| `align` | select `left` \| `center` | — | `center` |
| `stagger` | number (s, 0–0.4) | `timing` | `0.09` |

Markers: `headline-in`, `subline-in`, `outro-start`.

**`points_list`** (category `explainer`, `length` 7): title + accent rule, then 1–5 points.

| Param | Type | Role | Default |
|:---|:---|:---|:---|
| `title` | text | `title` | `Three things changed` |
| `points` | text, `\|`-separated (1–5) | `list_items` | `Record once \| Let AI cut the pauses \| Review and export` |
| `numbered` | boolean (off = dots) | — | `true` |
| `focus` | boolean (dim earlier points while the next enters) | — | `true` |
| `firstAt` | number (s) | `timing` | `0.9` |
| `gap` | number (s between points) | `timing` | `1.2` |

Point *n* enters at `firstAt + (n-1) × gap`; to follow narration, set them from the words'
clip-local times. The gap shrinks automatically so the last point lands at least 1.6 s before
`length`. Markers: `title-in`, `point-1`…`point-3`, `outro-start`.

**`takeaway_card`** (category `cta`, `length` 5): one sentence on a soft card.

| Param | Type | Role | Default |
|:---|:---|:---|:---|
| `kicker` | text | `label` | `The takeaway` |
| `takeaway` | text (≤ 140) | `body` | `Ten minutes instead of an hour` |
| `emphasis` | text, `\|`-separated | `emphasis` | `Ten minutes` |
| `logo` | image (`""` = none) | `logo` | `""` |
| `card` | boolean (card behind the text) | — | `true` |

Markers: `kicker-in`, `sentence-in`, `logo-in`, `outro-start`.

**`ui_walkthrough`** (category `callout`, `length` 6): screenshot, cursor click, ripples, zoom, label card.

| Param | Type | Role | Default |
|:---|:---|:---|:---|
| `screenshot` | image (`""` = placeholder window) | `image` | `""` |
| `x` / `y` | number 0–100 (% **of the screenshot**) | `target_x` / `target_y` | `64` / `40` |
| `label` / `detail` | text | `label` / `body` | `Click Export` / `Pick a format and the video renders` |
| `chips` | text, comma-separated (`""` = none) | `data_labels` | `MP4, 9:16, SRT` |
| `clickAt` | number (s, 1–5) | `timing` | `1.8` |
| `zoom` | number 1–2 | `zoom` | `1.15` |

The screenshot keeps its aspect ratio inside the frame; measure `x`/`y` on the screenshot
image itself (pixel ÷ image size × 100). The cursor arrives ~1.2 s before `clickAt`; the card
goes beside the target on the side with more room (above or below it when the side has no
room). Markers: `window-in`, `cursor-move`, `click`, `label-in`, `outro-start`.

**`logo_outro`** (category `logo`, `length` 4): accent disc + halo, logo or monogram, wordmark, tagline, call to action.

| Param | Type | Role | Default |
|:---|:---|:---|:---|
| `logo` | image (`""` = monogram of `name`) | `logo` | `""` |
| `name` | text | `name` | `Your brand` |
| `tagline` | text | `subtitle` | `Made for curious minds` |
| `cta` | text (`""` = none) | `cta` | `""` |

Markers: `mark-in`, `name-in`, `tagline-in`, `outro-start`.

## Scribis motion kit

Starters (except `lower_third`) include this inline helper as `const kit`. Its code is in
the starter HTML from `scenes_get_motion_guide(starter=…)`; copy it from there to paste it
into new graphics (it has no dependencies and passes lint). It is not the explainer beat kit
(`K.install`, `K.pop`, …); a graphic uses one kit or the other, never both.

| Member | Purpose |
|:---|:---|
| `kit.play((t, p) => …)` | Installs `window.seek`; calls your draw function with the seek time `t` and merged params `p`; redraws on `scribis:params`. |
| `kit.span(t, start, length, curve?)` | Eased 0..1 progress through `[start, start + length]`. |
| `kit.life(t, start, end, fadeIn?, fadeOut?)` | 0..1 visibility: in at `start`, out before `end`. |
| `kit.ease.linear / out / inOut / back` | Easing curves (`back` overshoots slightly). |
| `kit.mix(from, to, progress)` | Linear interpolation. |
| `kit.number(value, decimals)` | Deterministic `en-US` number formatting. |
| `kit.list(text)` | Comma-separated param → trimmed array. |
| `kit.text(element, value)` | Sets text only when it changed. |
| `kit.words(element, text)` | Word spans for staggered reveals (rebuilt only when text changes). |
| `kit.manifest`, `kit.params()`, `kit.clamp` | Parsed manifest, merged params, clamp helper. |

Rules: set every animated property inside the draw function from `t` alone, so
seeking backwards renders the same frame; never use timers, `requestAnimationFrame`,
`Math.random()` or wall-clock time.
