# Editing Recipes (MCP)

Step-by-step recipes for everyday editing with the Scribis MCP tools: finding and
fixing subtitles, rough-cut cleanup (filler words, long pauses, retakes and false
starts), emphasis effects and motion graphics, combining timelines into scenes, and other basic edits. Tool arguments are
listed in [mcp-tools-spec.md](mcp-tools-spec.md).

## 0. Ground rules

- **Editing needs the MCP tools.** The `scribis` CLI transcribes, streams, lists
  models, reads YouTube captions and opens pages (`scribis open …`); it does not edit.
  If the MCP tools are not in your tool list, ask the user to add Scribis as an MCP
  server (`scribis mcp-bridge` or the HTTP URL from Scribis Settings → MCP; config
  snippets in [cli-usage.md](cli-usage.md)).
- **The project must be open.** Subtitle and timeline tools talk to the editor that is
  open in Scribis. If `get_timeline_state` times out or says the Timeline Editor is
  not active, ask the user to open the video in the editor (or open the Cuts project
  with **Cuts → Open editor**) and try again.
- **Times are source-video seconds.** Subtitle `start`/`end`, word timings,
  `delete_segment`, effect blocks and Cuts visual blocks all use the original video's
  clock. Deleting a segment does not shift any of them. `get_project_duration` reports
  the original duration, the effective duration after deletions, and the deleted total.
- **Read before you write.** Call `get_timeline_state` once to learn what is already
  there (existing `DeletionBlocks`, effect blocks, the playhead), and read subtitles in
  pages (`from_index`/`to_index` or `from_time`/`to_time`) instead of all at once on
  long videos.
- **Review vs. direct edits.**
  - Subtitle edits default to `auto=false`: the edit appears as a diff the user accepts
    or rejects in Scribis. Keep that default unless the user asked you to apply
    changes directly.
  - Cuts tools default to `mode="review"`; the user accepts the proposal in the editor.
  - `delete_segment` defaults to `mode="review"`: the ranges appear in the editor for
    **Accept / Reject / Show**, and the tool returns `status: "pending_review"` with a
    `proposal_id`. Read the decision with `get_timeline_state` → `deletionReview`
    (`pending`, `recent[]` with `status` accepted / rejected / conflict / expired and the
    resulting `blockIds`). Only one deletion proposal can wait at a time; opening another
    video or project expires it. `mode="auto"` applies immediately; use it only when the
    user asked for cuts without review. Applied deletions are one undo step per batch.
  - `add_*_block`, `update_timeline_block`, `split_media`, block deletion and
    `reset_timeline` apply immediately. Each successful MCP timeline operation is one
    undo step; `split_media` splits subtitles and supported effect blocks, not audio clips.
- **Removing cuts.** `delete_timeline_block(id)` / `batch_delete_timeline_blocks(ids)`
  also remove deletion blocks (IDs from `get_timeline_state` → `deletionBlocks` or the
  accepted proposal's `blockIds`), restoring those ranges. Each batch deletion is one
  undo/redo step across all requested block types. Never call
  `reset_timeline` to fix a single bad cut; it clears **every** effect and deletion
  block.
- **Verify.** After a batch of edits, check `get_project_duration`, then look at a few
  edit points with `seek_player` + `render_preview_frame` (or ask the user to play
  them).

## 1. Find subtitles

| Need | Call |
|:---|:---|
| Keyword anywhere | `get_all_subtitles(query="price")` (case-insensitive substring) |
| Pattern / several words | `get_all_subtitles(query=<pattern>, regex=true)` (case-insensitive JS regex, example below) |
| A time window | `get_all_subtitles(from_time=600, to_time=660)` (overlapping segments) |
| An index window | `get_all_subtitles(from_index=40, to_index=79)` |
| What is said at a time | `get_subtitles_at_time(timestamp_sec=710)` |
| What is on screen now | `get_current_subtitle()` |
| Search a translation | `get_translated_subtitles(lang="en", query="...")` (omit `lang` for the original) |

Regex example (the pattern string as the tool receives it):

```json
{ "query": "嗯+|呃+|\\b(um+|uh+)\\b", "regex": true }
```

Results return `total_count`, `matched_count` and `subtitles` (`id`, `start`, `end`,
`text`, `language`, `words` when the transcript has word timings, plus fields such as
`speaker` when present).
Each word has `token` (some sources use `word`/`text`), `start`, `end` and optionally
`speaker`.

Search tips:
- CJK text has no spaces: search the bare string (`那個`), not word-boundary patterns.
  For English use `\b` in regex mode to avoid matching inside other words (`\blike\b`).
- Users usually refer to a time on the ruler (`"11:50"`). Convert it to seconds
  (`710`) for `get_subtitles_at_time` / `from_time`.
- If you will edit the results, keep the returned `id`s; indexes shift when subtitles
  are added or deleted.

## 2. Fix subtitles

- **Typos, names, terminology:** collect every fix first, then send them in one
  `batch_correct_subtitles(corrections=[{id, text}], auto=false)` so the user reviews
  one diff. Use `update_subtitle` for a single change.
- **Timing:** pass `start`/`end` with the correction. Keep segments inside their
  neighbours (no overlaps) and at least ~0.3 s long.
- **Split or merge lines:** shorten one segment (`update_subtitle` with new `text` and
  `end`), then `add_subtitle(text, start, end)` for the rest; merge by extending one
  segment and `delete_subtitle` on the other.
- **Language matters for review mode:** `auto=false` edits to the original text need the
  UI on the default language. If the tool says the active language is different, call
  `change_current_language(lang="default")` first (tell the user you switched it), or
  edit translations with `update_translated_subtitle` /
  `batch_update_translated_subtitles(lang=...)`.
- **New translation track:** `create_translation_language(lang)` registers it; fill it
  with `batch_update_translated_subtitles`.
- Don't rewrite meaning. For subjective rewording (style, shortening), propose it with
  `auto=false` and say what you changed.

## 3. Rough-cut cleanup with deletion blocks

All three cleanups follow the same loop:

1. Read subtitles **with word timings** for the range you are cleaning.
2. Build a candidate list: `{start, end, reason, text}` per cut.
3. Snap and pad each range (rules below), merge ranges that touch or overlap, drop
   anything shorter than ~0.15 s.
4. Tell the user what you found (counts per reason, total seconds, a few examples with
   `mm:ss` times) and submit all ranges in one review:
   `delete_segment(segments=[{start, end}, ...], summary="9 filler words, 4 pauses")`.
   Group by reason (one proposal per cleanup type) when the list is long, so the user
   can accept fillers and reject pauses separately; wait for each decision before the
   next proposal. Overlapping or repeated ranges are de-duplicated by Scribis.
5. Read the decision (`get_timeline_state` → `deletionReview.recent[0]`). On `rejected`,
   ask what to change instead of resubmitting the same list. To undo one accepted cut,
   `delete_timeline_block(id)` with its ID from `blockIds`.
6. When a cut removes words from inside a subtitle that stays, remove those words from
   its text with `batch_correct_subtitles`, `auto=false`, so captions match the audio.
7. Verify with `get_project_duration` and spot-check edit points.

**Snapping and padding rules**

- Cut on word boundaries: start at a word's `start`, end at a word's `end`. Never cut
  inside a word.
- Leave breathing room: keep about 0.05–0.1 s before the next kept word and after the
  previous one, so speech does not sound clipped.
- Without word timings, cut only whole subtitle segments or the gaps between them; do
  not guess positions inside a sentence. Word timings come from the project's own
  transcript (`cuts_get_speech_words` on an open Cuts project, or the `words` of
  `get_timeline_state` subtitles); a subtitle file imported from elsewhere has none.
  If the user wants word-level cleanup, ask them to transcribe the video inside Scribis
  (Whisper models produce word timestamps) rather than import an SRT.

### 3a. Filler words

Typical fillers. Ask the user which ones count; some are real words in context.

| Language | Fillers |
|:---|:---|
| Chinese | 嗯, 呃, 啊 (standalone), 那個, 就是 (as a crutch), 然後 (repeated), 對對對 |
| English | um, uh, er, ah, "you know", "I mean", "like" (as a crutch), "sort of" |
| Japanese | えー, えっと, あの, その (hesitation) |

- Find them with a regex search, then confirm each hit against the word list: only cut
  when the filler is its own word(s) in `words`, not part of a longer word or phrase
  (就是說 as "that is to say", "I like it").
- Repeated crutch words ("然後然後", "so so"): keep one and cut the repeats.
- Skip fillers that carry meaning or rhythm the user wants (laughter, emphasis).

### 3b. Long pauses

- A pause is a gap with no speech: between consecutive words (`next.start - prev.end`)
  or, without word timings, between consecutive subtitles.
- Default threshold: gaps longer than **0.8 s** (ask; talks and tutorials often prefer
  0.5–0.6 s, interviews 1.0 s+).
- Don't remove the whole gap: keep about 0.2–0.3 s so the edit sounds natural, i.e.
  cut `[prev.end + 0.15, next.start - 0.15]`.
- Leave pauses alone at deliberate moments the user cares about (before a reveal,
  after a question, during on-screen action). If unsure, look at the frame with
  `get_video_frame` or ask.

### 3c. Retakes and false starts

Speakers often restart a sentence ("今天我們要… 今天我們要來介紹…", "So the main —
so the main reason is…") or redo a whole take.

- Look for: consecutive segments whose text starts the same or is nearly identical;
  segments that stop mid-sentence and are followed by a fuller version; explicit cues
  ("重來", "再一次", "sorry, let me say that again", "cut").
- **Keep the last complete take** and cut the earlier attempts, plus any cue phrase
  between them. Cut from the start of the abandoned attempt's first word to just
  before the kept take's first word.
- When attempts differ in content (not just wording), don't decide alone: show both
  versions and ask which to keep.
- For long recordings, use `llm_completion` with a local model to flag candidate
  restarts from the subtitle text in chunks, then confirm them yourself against the
  timings before proposing cuts.

## 4. Emphasis effects from the subtitles

Subtitles carry text and timing, not loudness or pitch, so "emphasis" is inferred
from the words. Treat it as a suggestion the user approves.

1. **Pick the moments.** Read the subtitles for the range and choose the key points:
   numbers and statistics, named products/people/places, contrasts ("but",
   "不是…而是"), lists ("first / second"), calls to action, and words the speaker
   repeats or stresses with intensifiers ("really", "非常", "一定"). Aim for roughly
   one effect every 20–40 s unless the user wants more. Avoid stacking effects
   closer than ~3 s.
2. **Time them from word timings.** Start ~0.1–0.2 s before the emphasized word's
   `start`; end after the phrase, usually 2–5 s. Where the project plays TTS (dubbing,
   regenerated lines), use `cuts_get_speech_words` instead of subtitle words: the
   subtitles keep the original recording's timing.
3. **Add the effect.** `add_zoom_block(start, end, scale=1.2–1.4, x, y)` for a
   punch-in on the speaker, or `add_text_block` for a plain caption. Keep text out of
   the subtitle area (bottom ~20 %) and inside a 5 % safe margin.
4. **Check** with `render_preview_frame(timestamp_sec)` at the emphasized word.

### HTML motion graphics

Motion graphics go either on the Cuts timeline itself (`cuts_place_visual`, times in
source-video seconds, matching the subtitle times) or on a scene layer track above the
timeline clip (section 5). Scene times are scene seconds: map each emphasized word to
scene time from the timeline clip's position in `scenes_get`. Images and videos go only
in scenes; music and sound effects go on Cuts audio tracks (`cuts_place_audio`) or scene
audio tracks (see the `scribis-audio` skill).

1. **Reuse before writing.** `scenes_find_motion_templates(query="stat count-up")`
   (or the user's own words; `category="chart"` / `aspect="9:16"` to browse). The
   starters are there too as read-only built-in templates. If a template fits, place
   it with per-clip `params` (text, number, color, `image` asset IDs, `font` family
   names); no new HTML needed.
2. **Otherwise create one.** `scenes_get_motion_guide(starter=...)` (`kinetic_title`,
   `stat_chart`, `explainer`, `callout`, `lower_third`, or the explainer beats `hook_title`,
   `points_list`, `takeaway_card`, `ui_walkthrough`, `logo_outro`; see the `scribis-motion` skill)
   → fill the starter with the real content, every changing detail as `params` → `scenes_create_motion_graphic(description, tags)` → check
   the returned frames → iterate with `scenes_update_motion_graphic(patches)`.
3. **Place them** with one `scenes_edit`: `add_clip(source="asset",
   source_id=<asset id>, track="new_layer", start, duration, params, x, y, w, h)` in
   the default review mode, or on the open Cuts project with
   `cuts_place_visual(asset_id, start, end, params, transform?)` (one call each). Keep graphics out of the subtitle area (bottom ~20 %)
   unless they replace the subtitle, and inside a 5 % safe margin.
4. **Revise later.** `scenes_find_motion_templates(at_time="11:50")` returns
   `scene_clips` with `clip_id` (open scene) or `timeline_blocks` with `block_id` (open
   Cuts project, or `project_id`); change one clip's text/colors with
   `update_clip(clip_id, params)` / `cuts_update_visual(block_id, params)`, or the
   template itself with `scenes_update_motion_graphic(patches, retarget="open_scene" |
   "open_project")`, or switch to another version with `replace_asset(from_source_id,
   source_id, clip_ids?)` / `cuts_update_visual(block_id, asset_id)`.
5. **Check** the user's decision with `scenes_get` / `cuts_get_project` → `review.recent`.

## 5. Combining timelines into a scene

1. `cuts_list_projects` → the timelines to combine (`project_id`).
2. `scenes_create(name, aspect_ratio?)`, or `scenes_list` → `scenes_get(scene_id)` to
   reuse one.
3. One `scenes_edit` with all operations: `add_clip(source="timeline",
   source_id=project_id)` appends each timeline to the storyboard (track 1, in order,
   no overlaps); `set_transition(clip_id, edge, type, duration, easing?)` between
   adjacent storyboard clips or at a free end (fades: `dissolve`, `fadeBlack`,
   `fadeWhite`, `blur`; wipes: `wipe`, `wipeRight`, `wipeUp`, `wipeDown`,
   `clockWipe`; pushes: `slide`, `slideRight`, `slideUp`, `slideDown`, `coverLeft`,
   `coverRight`, `whip`; shapes: `circleOpen`, `circleClose`, `irisBox`,
   `splitVertical`, `splitHorizontal`; motion: `zoomIn`, `zoomOut`, `spin`;
   `easing="easeInOut"` suits motion); music via `add_clip(source="asset", source_id=<cuts_list_assets
   id>, track="new_audio")`; `update_clip(clip_id, original_audio=false)` to keep only
   the timeline's TTS voices; images, videos or HTML assets via `add_clip(source="asset",
   track="new_layer", x, y, w, h)` (HTML clips also take `params`).
4. With the scene open in Scribis, edits wait for the user's Accept/Reject
   (`mode="review"`); read the decision with `scenes_get` → `review.recent`. A closed
   scene cannot be reviewed: ask the user to open it, or use `mode="auto"` only when
   they asked for edits without review.

## 6. Other basic edits

| Task | Tools |
|:---|:---|
| Trim the head/tail | `delete_segment(segments=[{start: 0, end: first_word.start - 0.2}, {start: last_word.end + 0.3, end: duration}])` (`get_project_duration` for the duration) |
| Remove an off-topic section | find its first/last subtitle, `delete_segment(start, end, summary)` in review mode |
| Split at a time | `split_media(timestamp_sec)` |
| Punch-in / Ken Burns | `add_zoom_block`, then `configure_zoom_motion` for start/end framing |
| Blur a face, plate or screen | `add_mosaic_block(start, end, x, y, w, h)`; verify with `render_preview_frame` |
| Caption or label | `add_text_block(start, end, content, x, y, color, fontSize)`; style and animate it with `update_timeline_block(id, parameters={fontFamily, fontWeight, strokeWidth, textEffect: {type: "popIn"}, …})` (keys in [mcp-tools-spec.md](mcp-tools-spec.md) → *Text block parameters*) |
| Change or remove an effect | `get_timeline_state` for the ID → `update_timeline_block(id, parameters)` / `delete_timeline_block(id)` |
| Multi-camera layouts | `add_camera_block`, `set_camera_layout`, `switch_camera_source`, `configure_camera_subviews` |
| HTML motion graphics above the video | Cuts timeline: `cuts_place_visual(asset_id, start, end, params)`, or a scene layer track (see [motion-graphics.md](motion-graphics.md)) |
| Images, B-roll above the video | Scene layer track: `scenes_edit` → `add_clip(source="asset", source_id=<asset id>, track="new_layer")` (Cuts visual tracks take HTML motion graphics only) |

## 7. Reporting back

Tell the user what you changed, in their language:
- How many cuts per reason and the total time saved (from `get_project_duration`).
- Which subtitle edits are waiting for review in Scribis.
- Any Cuts or scene proposals waiting for Accept/Reject.
- Anything you skipped and why (no word timings, ambiguous retake, meaningful pause).
