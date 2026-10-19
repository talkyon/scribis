---
name: scribis-explainer
description: >
  Short animated explainers, data stories or product announcements built in Scribis from a
  source (report, numbers, notes, transcript, YouTube captions) as a scene of beats (hook,
  points, chart, UI walkthrough, takeaway, logo) placed from built-in templates with params;
  also "the same structure as this video". Trigger on "做一支說明動畫", "把這份報告做成動畫影片",
  "turn these Q3 numbers into a 30-second video". A single overlay on footage is
  scribis-motion. Requires the Scribis MCP tools.
---

# Scribis Explainer Skill

An explainer is a **scene made of beats**: each beat is one clip of a motion-graphic template
(`scribis.motion/1`) on a scene layer track, filled with that beat's `params`. Scribis ships
built-in **explainer beats** (`Hook title`, `Points list`, `Takeaway card`, `UI walkthrough`,
`Logo outro`, plus `Animated bar chart` for numbers), so a 30-second explainer is normally six
clips of built-ins with params and **no new templates**. Changing a word, number, color or
beat length is one `update_clip`, and the user can scrub and edit every beat in the scene editor.

- **Never build the whole explainer as one long HTML document**: every change would rebuild
  and re-render all of it.
- **Never create one new template per beat by habit.** It fills the user's library with
  near-identical one-offs. Create a template only for a beat whose *design* no built-in can
  express (section 3B).

Read first:
- [../scribis-transcribe/references/tool-index.md](../scribis-transcribe/references/tool-index.md) — which tool does what.
- [../scribis-transcribe/references/scene-and-motion-rules.md](../scribis-transcribe/references/scene-and-motion-rules.md) — how tracks, clip placement, edits, template versions and renders behave.
- [../scribis-transcribe/references/mcp-playbook.md](../scribis-transcribe/references/mcp-playbook.md) — rules, errors and **section 9, known pitfalls**.
- [../scribis-motion/references/starters.md](../scribis-motion/references/starters.md) — every built-in's params, timing and markers, and the **beat → built-in table**.
- [references/beat-kit.md](references/beat-kit.md) — only for a custom beat (section 3B).

Two levels. Pick one and say which:

| Level | When | Beats from |
|:---|:---|:---|
| **A. Built-in beats (default)** | Any explainer whose beats are a statement, points, numbers, a UI step, a takeaway or a logo | Built-in templates placed with params (section 3A) |
| **B. Custom beat (exception)** | One beat needs a device no built-in has: maps, UI mockups built in code, camera moves through a layout, custom charts, a reference video's signature motion | One new template for **that** beat only (section 3B); the other beats stay built-in |

A reference video ("make it like this") does not by itself mean B: map its sections to
built-ins first and go custom only for the devices they cannot show.

## 1. Gather the source

| Source | Read it with |
|:---|:---|
| YouTube video | `youtube_get_captions(url, format="text")`, every page (free accounts: 10 new videos a month; see mcp-tools-spec "YouTube") |
| A Cuts project's speech | `cuts_get_speech_words(project_id)` or `get_all_subtitles` |
| A report, notes, CSV | The user's attachment or message |
| Facts about Scribis itself | Real tool results (e.g. count `tools/list`), never guesses |

Only real words, numbers and names go on screen. **Never invent figures.** If the user asks
for an explainer of a report or numbers but did not supply them, stop and ask for the
material before planning; do not fill in placeholder or "typical" figures. If a single number
is missing, ask. Data you compute from the source (e.g. captions per 10 s) is fine; say how.

## 2. Reference video (when the user gives one)

The goal is the same **structure and kinds of motion**, not a copy of its look, brand or text.

1. Look at frames every 2 s. Captions alone do not show the visuals.
   - A local video file: `get_video_frame(timestamp_sec, video_path)` per time. The sandboxed
     Mac App Store build reads only files the user granted it; if the path is refused, ask
     the user to import the video in Scribis or to share screenshots.
   - A video that is already a Cuts project: open it and use `render_preview_frame`.
   - A YouTube link: Scribis does not download YouTube media. Ask the user for screenshots
     every few seconds (or a local copy they may use).
   - If your host cannot show images, ask the user to describe each section instead.
2. Write one line per section: time, what is on screen, the **motion device** (map with
   callouts, window shrink, cards stacking, count-up, line drawing, camera zoom into a card,
   typing, text on a path, radial burst, logo end card…), and how it hands off to the next.
3. Map each device to a beat in your plan: a built-in when one shows it (beat → built-in table
   in `starters.md`), else a custom beat (section 3B; [references/beat-kit.md](references/beat-kit.md)
   → "Motion vocabulary" for how each device is built).

## 3. Beat plan (show it before building)

Show the plan, then wait for the user's OK. When no one is answering in real time (an
unattended run), show the plan in your output and continue unless the user objects.

Settle audience, the one takeaway, aspect ratio, total length and look (palette, fonts). Then a
table, one row per beat:

```
#  time       beat      template (built-in or custom)   content (real)                     hand-off
1  0:00–0:05  hook      Hook title                      "Revenue doubled in 90 days"       background
2  0:05–0:12  why       Points list                     3 reasons from the report          background
3  0:12–0:18  numbers   Animated bar chart              Q1–Q4: 12, 18, 26, 41 (k users)    background
4  …
```

Rules: one idea per beat; 4–7 s per beat, because each explainer beat carries its own reading
or narration time (a single overlay beat in the `scribis-motion` skill runs 2–4 s); at most
~12 words on screen; hook first, takeaway and logo last. Name each beat's template; mark a
custom beat as **custom** with one line on what no built-in can show. Record each beat's
**hand-off state**: the built-ins all meet on the plain background (same `background` param);
a custom beat starts exactly how the previous one ends (same element at the same rect) or from
that background.

## 3A. Built-in beats (default)

1. **Find the built-ins once.** `scenes_get_motion_guide()` → `built_in_templates` lists each
   built-in's `starter`, `title` and `latest_asset_id`; or
   `scenes_find_motion_templates(category=…)` (`title`, `explainer`, `chart`, `callout`, `cta`,
   `logo`) or `query="explainer beat"`, whose hits also list their `params`. Pick each beat's
   template from the beat → built-in table in `starters.md`.
2. **Fill params only.** Use exactly the param keys the template declares (`Unknown parameter`
   otherwise): the real words and numbers, and the same look on every beat (`accent`,
   `textColor`, `background`, `font`; fonts from `installed_fonts`). `Points list` takes
   `points: "a | b | c"`; `UI walkthrough` takes a Cuts image `asset_id` as `screenshot` and
   `x`/`y` in percent of that screenshot.
3. **Beat length.** Each explainer beat has a `length` param (3–8 s): set it to the beat's
   time in the plan (4–7 s) and give the clip **the same `duration`**. The beat plays its outro
   just before `length`. `Animated bar chart` has no `length`: its clip duration is the
   template duration (6 s).
4. **Place every beat in ONE `scenes_edit`** (section 4): `add_clip(source="asset",
   source_id=<latest_asset_id>, params={…}, duration=<length>)`, the first with
   `track:"new_layer"`, the rest `track:"previous"`.
5. **Check with a sheet** (section 5) and fix by changing params (`update_clip`), not
   templates.

Nothing is created in the library on this path; built-ins are read-only and stay up to date.

## 3B. Custom beat (exception)

Only for a beat in the plan marked **custom**. Everything else in the explainer stays built-in.

1. **Derive when a built-in is close.** If the beat is a built-in with a different design
   (another layout, an extra element), create it with
   `scenes_create_motion_graphic(based_on=<built-in latest_asset_id>, html, description, tags,
   return="none")` and keep the built-in's param keys and roles, so the beat still fills like
   the others.
2. **Otherwise start from the beat kit.** [references/beat-kit.md](references/beat-kit.md):
   the beat kit `K` (1920×1080 stage scaled to the box, easing, pop/slide/typing helpers) plus
   the beat's own markup and `draw(t)`. Manifest: `"aspects": ["16:9"]`, a `category`, every
   text/number/color as a param with a `role`, `markers` at the moments to check, and the
   hand-off rect in `notes`.
   - The beat kit (`K.install`, `K.pop`, …) is **not** the motion kit inside the built-ins
     (`kit.play`, `kit.span`, …; `scribis-motion`). A beat uses one or the other, never both.
   - Fixed stage vs fluid layout (a documented exception to `scribis-motion`'s fluid rule):
     full-frame 16:9 custom beats may use the kit's fixed 1920×1080 stage scaled to the box,
     with `"aspects": ["16:9"]`. For a 9:16 or 1:1 scene, either set the kit stage to
     1080×1920 / 1080×1080 (see beat-kit "Other stage sizes") with `"aspects": ["9:16"]` /
     `["1:1"]`, or lay the beat out fluidly as `scribis-motion` describes.
   - Match the built-in beats' look: same palette, fonts, corner radius and `background`.
3. **Create it once**, with `return="none"` (`return` takes `image`, `path` or `none`; you
   check with a sheet next).
   - **`html` is the full document as a string in the call**; there is no file-path argument
     and Scribis does not read your local files. Only if you call tools through a shell script,
     keep the JSON arguments in a file that the script reads (command lines are limited); the
     HTML still travels inside `html`.
   - **`description` says what this design does that the built-ins do not** (e.g. "isometric
     city map with three pinned callouts and a clock"), not only "beat 2".
   - `status: "similar_found"`: a template that already says much the same is in the library.
     Place it with `params` (the usual case: a repeated custom beat type is one template with
     different params, never one template per use). Resend with `force: true` only when the
     user wants a genuinely different design for this beat, with a description that states
     what is different; never use `force` to get past the check by habit.
     `status: "existing"`: this exact document is in the library; place `duplicate_of`.
   - Read `warnings`. `Re-rendering the same time … produced a different frame` means drawing
     depends on earlier frames (playbook pitfall 9): set every style from `t`, set styles
     before measuring layout, rebuild changed elements each frame.
4. Check the beat alone: `scenes_render_motion_graphic(asset_id, times=[up to 12], width=960,
   height=540, return="sheet")` — the start, each marker, ~70% of the beat and the last frame.
   Fix layout, overflow and contrast now; it is cheaper than after placing.
5. Change it with `scenes_update_motion_graphic(asset_id, html | patches)` → a new version
   (new `asset_id`); switch the scene to it with `scenes_edit replace_asset`.

Text checks for every beat, built-in or custom:
- Time 0 is usually empty (everything enters after it); judge the entrance at 0.3–0.6 s.
- Chinese/Japanese text: name a CJK font (`font` param from `installed_fonts`, or
  `"Microsoft JhengHei"` / `"PingFang TC"` / `"Noto Sans TC"` in a custom beat before the
  generic family), keep `font-weight` ≤ 700 in custom beats and no text stroke. Dense
  characters (圖, 體) can render as dark blocks in a 960×540 sheet or at heavy weights; render
  one frame at 1920×1080 to read them.

## 4. Assemble the scene

```
scenes_create(name, aspect_ratio)                       # a new, empty scene → scene_id
scenes_edit(scene_id, mode, operations=[
  {op:"set_canvas", background_color:"#10131c"},        # same as the beats' background param
  {op:"add_clip", source:"asset", source_id:<Hook title>, track:"new_layer", start:0, duration:5,
   params:{headline:"Revenue doubled in 90 days", emphasis:"doubled", kicker:"Q3 report", length:5}},
  {op:"add_clip", source:"asset", source_id:<Points list>, track:"previous", duration:7,
   params:{title:"Why it grew", points:"New pricing | Two new markets | Fewer refunds", length:7}},
  {op:"add_clip", source:"asset", source_id:<Animated bar chart>, track:"previous", duration:6,
   params:{title:"Monthly active users", labels:"Q1, Q2, Q3, Q4", values:"12, 18, 26, 41"}},
  …
])
```

- **The storyboard holds only Cuts timelines**; beats go on a layer. `track:"previous"` puts a
  clip on the same track as the previous `add_clip` and, without `start`, right after the last
  clip there (no gaps, no start math). Without any track, clips go to the **first** layer.
- Review: open the scene (`scenes_open`) and let the user Accept, or, for a scene you just
  created for this job and the user agreed, `mode="auto"` on the closed scene. Say which.
  A result with `status: "applied"` (instead of `pending_review`) means **Auto-accept AI** is on
  in the scene editor: the beats are already placed and the clip IDs are final, so check frames
  right away and tell the user it was applied.
- Built-in beats keep their background opaque for the whole clip and fade only their content,
  so beats with the same `background` cut cleanly; no transition is needed. Layer clips take
  only `dissolve` or `none` transitions; matched hand-offs usually look better than dissolves.

## 5. Check the whole scene

1. Beats: `scenes_render_frame(scene_id, times=[…], return="sheet")` at ~35% and ~75% of each
   beat (12 times per sheet).
2. **Boundaries:** for every cut at time T render `T-0.05` and `T+0.02` next to each other in one
   sheet (6 cuts per sheet). They should
   look the same (matched hand-off) or both be near-plain background. Fix pops (an element that
   appears or vanishes at the cut) by fading it in the first 0.3–0.6 s of the next beat.
   - A clip covers `start ≤ t < start + duration`, so a frame **exactly at T** is the next beat at
     its own time 0, which is usually empty. A blank frame at T (e.g. `6.0` between a 0–6 s and a
     6–12 s beat) is expected, not a gap; judge the cut by `T-0.05` and `T+0.02`. If the next beat
     should not start empty, draw the previous beat's end state at its time 0.
   - A blank frame anywhere else is a real gap: check `scenes_get` for clips that do not touch,
     a clip shorter than its template, or a built-in beat whose clip runs past its `length`
     param (only the background shows after the outro).

## 6. Voice-over and sound

- **Narration is optional.** Add it when the user asked for a voice-over or narration, or the
  source is a script or transcript meant to be spoken. Beats without narration keep the
  4–7 s reading pace.
- To fit a beat to its line, set the beat's `length` (and clip `duration`) to the line plus
  ~0.8 s, and time reveals from the line's word times (`Points list`: `firstAt`, `gap`;
  `UI walkthrough`: `clickAt`; clip-local seconds = word time − clip start).
- **One voice line per beat**, so a beat and its line move together:
  `audio_generate_speech(text, language, voice)` per line (keep each shorter than its beat),
  then place them on **one** voice track: first `track:"new_audio"`, the rest `track:"previous"`,
  each at beat start + the moment its visual lands.
- **Effects on their own track** (second `new_audio` run, or `add_track` + `track_id`): one family
  (pop, click, whoosh, sparkle), on visual events only, 0–40 ms early, volume 0.2–0.4, at most
  8 per minute. Generate effects with `audio_generate_sfx` (recipe names from
  `audio_list_sfx_recipes`). Scene clips need ≥ 0.1 s: `audio_generate_sfx(recipe="click",
  duration=0.12)`.
- `scenes_audio_check(scene_id)` → fix `sfx_too_loud` / `sfx_density`. If `sfx_over_words` names
  a whole TTS clip (`tts-…`) as the word, see the `scribis-audio` skill.
- Music bed (optional): `scribis-audio`, then `scenes_duck_audio` under the voice track.

## 7. Iterate one beat at a time

| The user says | Do (one small edit) |
|:---|:---|
| "Change 41 to 45" / new wording | `update_clip(clip_id, params={…})` |
| "Make it red" (all beats) | `update_clip` on each beat with the same `accent` |
| "Beat 2 is too long" | Built-in beat: one `scenes_edit`: `update_clip(clip_id, params={length:<new>})` (and a faster `gap`/`stagger` if needed), `trim_clip(clip_id, edge="end", time=<clip start + new length>)`, then `move_clip(clip_id, start)` for each later beat (`track_id` is optional and keeps the track). Custom beat: make the template faster → new version → `replace_asset` + the same trim and moves; trimming alone cuts the ending of the animation |
| "Swap beats 2 and 3" | `move_clip` both (compute the new starts); check both hand-offs |
| "Redo the chart beat" | Built-in: new `params`. Custom: new version of that one template → `replace_asset`; nothing else re-renders |
| "Make the hook look different" | Built-in params first (`align`, colors, `font`); a genuinely new design is a custom beat (3B) derived with `based_on` |
| Line and beat drift apart | `move_clip` the voice line, or re-time with `scenes_get_speech_words` |

Never rebuild the whole scene for a one-beat change.

## 8. Hand-off

Report the scene (name, ID), the beat table with times, template names (built-in or custom) and
asset IDs, any template you created and why no built-in fit, the voice lines, what waits for
review, the params the user can tweak (canvas toolbar → **Parameters**), anything you could not
do, and that the user exports the MP4 from the scene editor.

## Example: built-in beats (the default)

"Turn these Q3 numbers into a 30-second video" (the user attached the report).

1. Brief: audience = team, takeaway = "revenue doubled", 16:9, ~33 s, brand accent from the
   user. Plan: hook (5 s) → why (7 s) → numbers (6 s) → product step (6 s) → takeaway (5 s)
   → logo (4 s), all built-in.
2. `scenes_get_motion_guide()` → `latest_asset_id` of `hook_title`, `points_list`,
   `stat_chart`, `ui_walkthrough`, `takeaway_card`, `logo_outro`.
3. `scenes_create` → one `scenes_edit`: `set_canvas` + six `add_clip` with `params`
   (`new_layer`, then `previous` ×5; each `duration` = its `length`).
4. One sheet at ~35% / ~75% of each beat + the five cut boundaries → param fixes with
   `update_clip` (a shorter headline, `gap` 1.0). No template was created.

## Example: one reference video, a few custom beats

"Make something with the structure and motion of this product launch video" (the user linked it).

1. Frames every 2 s of the reference → 10 devices: city map + clock → window shrink → fact
   cards → title card with mini charts → tool grid → dashboard build → zoom + comment → text on
   a path → dot-map push-in → export burst → text edit + logo.
2. Map them: title card, fact cards, export click and logo → built-ins with params
   (`Hook title`, `Points list`, `UI walkthrough` with `chips`, `Logo outro`); the city map,
   window shrink, dashboard build and text on a path → custom beats from the kit, each created
   once with a description of what it shows that the built-ins cannot.
3. Source facts: `youtube_get_captions` (cue count and length; captions per 10 s computed from
   the cue times) and real Scribis numbers (MCP tool count, languages, free videos/month).
4. `scenes_create` → one `scenes_edit` (`new_layer` + `previous`) → boundary frames at all
   cuts → pops fixed with fade-ins (custom beats) or params (built-ins).
5. One `audio_generate_speech` line per beat on one voice track, effects on a second track,
   `scenes_audio_check`.
