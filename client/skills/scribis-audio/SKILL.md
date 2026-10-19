---
name: scribis-audio
description: >
  Background music and sound effects in a Scribis video: find music or effects in the
  library, import audio, generate effects (whoosh, riser, impact, pop, click, ding, glitch,
  typewriter), place them on a Cuts timeline or scene, fade music, duck it under speech,
  measure and fix levels (LUFS, "the music is too loud", "音樂太大聲了", "說話時把音樂壓低", "add a pop
  when each bullet appears"). Trigger even without the word Scribis. Requires the Scribis
  MCP tools.
---

# Scribis Audio Skill (music and sound effects)

> New to Scribis MCP? Read
> [../scribis-transcribe/references/mcp-playbook.md](../scribis-transcribe/references/mcp-playbook.md)
> first (time spaces, IDs, what must be open). Motion graphics are the
> [`scribis-motion`](../scribis-motion/SKILL.md) skill; its markers are where
> sound effects belong.

Sound serves the content: speech must stay clear, music sets the mood without
competing, and each sound effect marks something the viewer sees. When in doubt,
use less.

## 1. Brief first

Settle these before placing anything; ask only for what is missing.

| Question | Default when the user does not say |
|:---|:---|
| Music at all? Mood (calm, upbeat, cinematic, corporate) | No music for tutorials and interviews unless asked; never lyrics under speech. |
| Where: one Cuts project (its own video) or a scene | The editor that is open. |
| Effects: which moments | Only visible events: motion-graphic markers, cuts, transitions, text or items appearing. |
| Style | One family per video (e.g. soft UI pops, or cinematic whooshes and hits). |

## 2. Find, import or generate

1. **Search the library first**: `cuts_search_assets(query, kind="audio", tags?, min_duration?, max_duration?)`.
   Music: `tags=["music"]`, `min_duration` at least the section length.
   Effects: `tags=["sfx"]`. Results say whether content search was used
   (`semantic_search`, `hint`); without the Media Search Index only names,
   descriptions and tags are matched. Content matches list `match_times`
   (source seconds, best first): where the sound you described is heard. In a
   scene, pass that `start` as `add_clip` `trim_start` to begin there.
2. **The user has a file**: `cuts_import_asset(path, description, tags)`, with a
   description of mood/instrumentation (music) or the sound (effects) and tags
   such as `["music", "calm"]` or `["sfx", "whoosh"]` (`path` and `description`
   are required). It takes a file path only; there is no base64 route for audio
   imports. When Scribis cannot read the path (the sandboxed Mac App Store build
   reads only files the user granted it), ask the user to import the file in
   Scribis themselves, then find it with `cuts_search_assets`.
3. **No suitable effect**: `audio_list_sfx_recipes` → `audio_generate_sfx(recipe,
   params, duration, seed)`. Identical input reuses the earlier file. Pick the
   recipe by purpose:

| Moment | Recipe | Notes |
|:---|:---|:---|
| Transition, slide, card flying in/out | `whoosh` | `direction` in/pass/out; duration ≈ the motion. |
| Build-up into a reveal | `riser` | Ends at its peak: end it on the reveal frame. |
| Exit, ending, power down | `drop` | |
| Title or number landing, logo slam | `impact` | Use sparingly (1–2 per minute). |
| Items, icons, bullets appearing | `pop` | Short; vary `seed` per item. |
| Cursor or button in a walkthrough | `click` | |
| Alerts, success, messages | `notify` | `style` up = success, down = error. |
| Correct answer, key point | `ding` | |
| Reveal of a product or badge | `sparkle` | |
| Tech or error look | `glitch` | |
| Text typed on screen | `typewriter` | Duration = the typing animation. |

Music cannot be generated; it must come from the library or the user.

## 3. Place

- **Cuts project** (the project's own video, source-video seconds):
  `cuts_place_audio(asset_id, start, end?, volume, fade_in?, fade_out?, volume_keyframes?)`;
  it uses the first audio track with room or adds one. Move/trim/level later
  with `cuts_update_audio(block_id, …)` (fields not given keep their value),
  remove with `cuts_remove_audio(block_id)`; `audio_blocks` in `cuts_get_project`
  lists them with `source_offset`, `source_end`, `speed`, `volume_keyframes`,
  `fade_in`, `fade_out` and `duck_db` (TTS speech is separate and never editable
  here). Music longer than the video is cut at its end.
- A block plays its audio from `source_offset`: moving only `start` with the same
  `end` cuts the beginning of the music (to start it later instead, move `start`
  and `end` together). `cuts_split_block(block_id, time)` cuts a block in two that
  play on as before, `cuts_merge_blocks(block_ids)` joins neighbouring parts again;
  blocks on one audio track never overlap.
- **Scene** (scene seconds): `scenes_edit` → `add_clip(source="asset",
  source_id=<audio asset>, track_id=<existing audio track> or track="new_audio",
  start, duration, volume)`; change the level later with
  `update_clip(clip_id, volume, fade_in, fade_out, volume_keyframes)` (only audio
  clips have an envelope).
- Review mode is the default: the user accepts in Scribis. Use `mode="auto"` only
  when the user asked for edits without review.

### What must be open, and review sequencing

- **Cuts.** `cuts_place_audio`, `cuts_update_audio`, `cuts_remove_audio` and
  `cuts_duck_audio` in review mode need that project open in the Cuts editor
  (`cuts_open_project`). Each call is its own proposal, and while one waits the next
  fails ("Another AI proposal is waiting"): send one, tell the user what to accept,
  read the decision with `cuts_get_project` → `review.recent`, then send the next. On a
  closed project only `mode="auto"` (with `project_id`) works, and only when the user
  agreed to edits without review.
- **Scene.** All placements go into **one** atomic `scenes_edit` proposal (the scene
  open with `scenes_open`; closed scenes take only `mode="auto"`, same rule). Accepting
  can assign new IDs, so after Accept read `scenes_get` again for the final `clip_id`s
  before `update_clip` fades or `scenes_duck_audio`. `add_clip` has no fade fields;
  fades are `update_clip(fade_in, fade_out)`.
- `audio_measure`, `cuts_audio_check`, `scenes_audio_check`, `audio_generate_sfx`,
  `audio_generate_speech` and `cuts_search_assets` need no open editor (the checks
  read the open editor's live state, else the saved project or scene: pass
  `project_id` / `scene_id` when nothing is open).

Scene voice-over + music + whoosh, in order:

1. `scenes_open(scene_id)` → `scenes_get` (tracks, `revision`).
2. One `scenes_edit`: `add_clip` the voice-over (`track="new_audio"`), the music
   (`track="new_audio"`, a second track) and the whoosh (`track="new_audio"`, a third
   track), each with `start`, `duration` and `volume`.
3. The user accepts → `scenes_get` → the final `clip_id`s.
4. `scenes_edit` → `update_clip(<music clip>, fade_in, fade_out)` → the user accepts.
5. `scenes_duck_audio(clip_ids=[<music clip>])` → the user accepts.
6. `scenes_audio_check(scene_id)` → apply fixes (section 4).

A result with `status: "applied"` instead of `pending_review` means the edit is already
in (Auto-accept AI is on in the editor, or `mode="auto"`): continue without waiting.

**Scene placement traps (each one happened in testing):**

1. **Which track?** `add_clip` without `track_id`/`track` goes to the **first** audio
   track, even if you created another one earlier in the same edit. To fill a new
   track, start with `track="new_audio"` and give every following clip
   `track="previous"` (same track as the previous `add_clip`). Voice-over and effects
   belong on separate tracks: one `new_audio` + `previous` run per track, or
   `add_track` first and pass the returned `track_id`s.
2. **Too short.** Scene clips must be at least 0.1 s. The default `click` (0.06 s) and
   very short `pop`s are refused ("the source is only 0.06s long"). Generate scene
   effects with `duration` of at least 0.1 (e.g. `click` with `duration=0.12`). An
   `audio_generate_sfx` result with a `warning` field means exactly this.
3. **Overlaps move clips.** Clips on one track never overlap; a clip placed where
   another already plays is moved to the next free spot. Read `scenes_get` after a big
   edit and check that each clip starts where you wanted.

## 4. Levels (measure, do not guess)

Levels are EBU R128: integrated loudness in LUFS, true peak in dBTP. A block's
volume `v` changes its level by `20·log10(v)` dB (0.5 ≈ -6 dB, 0.25 ≈ -12 dB,
0.1 = -20 dB); its volume envelope multiplies on top.

1. **Measure the asset**: `audio_measure(asset_id)` → `integrated_lufs`,
   `true_peak_dbtp`, `loudness_range_lu`, `duration`, and `volume_for`
   (`music_bed_under_speech`, `music_bed_with_12db_duck`, `sound_effect`) for
   typical -16 LUFS speech. Use those volumes instead of round numbers. If
   `audio_measure` returns an error, follow "When levels cannot be measured" below.
2. **Place** with that volume, fade music, and duck it under talking (section 5).
3. **Check the mix**: `cuts_audio_check(project_id?)` or
   `scenes_audio_check(scene_id?)`. They measure the speech (TTS voices, and the
   original video sound when it plays) and every placed file, then report:
   - `music[].under_speech_lu`: the bed's level under speech relative to it
     (volume envelope included), `duck_db`, `fade_in`, `fade_out`;
   - `effects[].relative_lu` and `words_covered` (spoken words an effect plays over);
   - `density`: effects per minute and the busiest 10 s window;
   - `issues[]`, each with `fix` (the exact call) and `suggested` values.
   Apply the fixes you agree with, then run the check again. Stop when it reports
   `ok: true` (no warnings), or when every remaining issue is one the user accepted
   (e.g. an intentional `sfx_over_words`, below), or after 3 rounds; then report what
   remains. Pass `speech_lufs` if the speech level is known but cannot be measured.
   When the result's `note` says loudness was not measured, only timing, fades and
   density were checked.

**When levels cannot be measured** (`audio_measure` returns an error, e.g. "needs
FFmpeg", which some builds do not include): do not invent LUFS numbers. Place music at a
conservative **starting point**, volume 0.2 under speech and 0.5 where nobody speaks, and
sound effects at 0.3; rely on the `cuts_duck_audio` / `scenes_duck_audio` defaults (12 dB,
0.15 s attack, 0.4 s release); still run the check for timing, fades and density; and tell
the user the levels were not measured, so they should listen before exporting.

| Target (relative to speech) | Value |
|:---|:---|
| Music bed under speech | about -20 LU, never louder than -15 LU (`music_too_loud`) |
| Music bed with no speech around | may come up to about -10 LU (duck rather than a low volume everywhere) |
| Sound effect | about -9 LU (6-12 dB under speech), never above -3 LU (`sfx_too_loud`) |
| True peak after volume and envelope | at most -1 dBTP (`clipping_risk`) |
| Effect density over talking | at most 8 per minute and 4 per 10 s (`sfx_density`) |
| Never over a key word | check the words actually heard (`cuts_get_speech_words` / `scenes_get_speech_words`, see `scribis-voice`); `sfx_over_words` suggests a start between words; keep it only if the hit is meant to land on the word |
| Sync | start the effect 0-40 ms before the visual event (motion-graphic `markers`, `scenes_render_frame` to check) |
| Music edits | start and end at section boundaries; one track per section |

Generated effects are normalized to -1 dBFS peak (`sfx.peakDb`, RMS in `sfx.rmsDb`).

When `sfx_over_words` names the **whole TTS clip** as the word (`"over the word tts-1a2b3c4d"`)
instead of a real word, word timings for that voice are not known yet, so every effect under
that line is flagged. Then keep effects at 0.2-0.4 volume on the strongest visual hits, follow
the density limit, and only move an effect if it masks a word you can name (check with
`scenes_get_speech_words`).

## 5. Volume envelope: fades and ducking

Every music/effect clip can carry `volume_keyframes`: points `{time, gain,
curve?}` in absolute timeline seconds (like visual keyframes: moving the clip
moves them, trimming keeps them). `gain` 0-2 multiplies the clip volume; `curve`
(`linear` default, `easeIn`, `easeOut`, `easeInOut`, `hold`) shapes the segment
to the next point. Preview, export and scenes render the same curve. The user
edits it as a volume line on the clip (drag points, double-click to add/remove)
or in the inspector's Volume keyframes list (add at playhead, volume %, curve).
Fades and ducking are presets that write tagged points into that list:

| Preset | Call | Use |
|:---|:---|:---|
| Fade in | `fade_in` (s) on `cuts_place_audio` / `cuts_update_audio` / `update_clip` | Music that starts after 0: 0.5-2 s. Not needed at 0 s. Effects: none. Writes points tagged `fadeIn`; `0` removes them. |
| Fade out | `fade_out` (s) | Every music bed: 1-3 s, also when it ends with the video. A bed cut mid-video without a fade is a warning. `fade_in + fade_out` must fit in the block. Tagged `fadeOut`. |
| Duck under speech | `cuts_duck_audio(block_ids?, amount_db?, attack?, release?)` / `scenes_duck_audio(clip_ids?, …)` | Music under talking: lowers it while speech plays (TTS voices; voice-over clips, i.e. assets tagged `tts` such as `audio_generate_speech` output, placed on an audio track; subtitle timings when the original sound is on; in scenes, also the speech of the timeline clips). A voice-over is speech, never music: it is not ducked and the checks do not judge it as music. Defaults 12 dB, 0.15 s attack, 0.4 s release; gaps shorter than attack + release stay ducked. 6-12 dB for a light bed, 15-24 dB to nearly vanish. Default targets: all music clips. |
| Re-duck | the same call again | The duck points are computed once: after speech or clips move, run it again (`duck_outdated` in the check). It replaces only the `duck` points. |
| Remove ducking | `clear: true` on the duck tool | Manual and fade points stay. |
| Custom shape | `volume_keyframes` on `cuts_update_audio` / `update_clip` | E.g. swell the music at a reveal: `[{time: 12, gain: 1}, {time: 13, gain: 1.6, curve: "easeOut"}, {time: 16, gain: 1}]`. It replaces the whole list (read the current points from `cuts_get_project` / `scenes_get` first and keep the tagged ones); `null` clears it. |
| Crossfade between beds | overlap the blocks by 1-3 s | `fade_out` on the first and `fade_in` on the second, each the length of the overlap. |

Duck points multiply the other points, so fades and manual shapes keep working
under ducking. Sound effects normally get neither fades nor ducking; lower their
`volume` or move them into a pause instead.

## 6. Report

Say what you placed (asset name, recipe and params for generated effects, start
times, volume, fades, ducking), the measured levels from the last check (music
under speech in LU, warnings left), and that it waits for the user's review in
Scribis. Offer one concrete adjustment ("say if the whoosh should be softer or
shorter").

## Example

"Add a whoosh when each card slides in, and calm music under the intro" (Cuts
project open; each card is a motion-graphic block with a `card-in` marker):

1. `cuts_get_project` → the card blocks start at 2.0 s and 6.6 s (source seconds);
   `scenes_get_motion_graphic` → `card-in` at 1.2 s. Markers are clip-local (0 = block
   start), so add the block start: the cards land at 2.0 + 1.2 = 3.2 s and
   6.6 + 1.2 = 7.8 s.
2. `cuts_search_assets(query="whoosh", tags=["sfx"])` → none fits →
   `audio_generate_sfx(recipe="whoosh", params={direction:"in", brightness:0.5}, duration=0.6, seed=1)`.
3. `audio_measure(asset_id)` → `volume_for.sound_effect` 0.42 →
   `cuts_place_audio(asset_id, start=3.17, volume=0.42)`; second card with
   `seed=2` at 7.77 s.
4. `cuts_search_assets(query="calm intro music", kind="audio", tags=["music"], min_duration=15)` →
   `audio_measure` → `volume_for.music_bed_with_12db_duck` 0.35 →
   `cuts_place_audio(asset_id, start=0, end=15, volume=0.35, fade_out=2)` →
   `cuts_duck_audio(block_ids=[<music block>])` (12 dB).
5. `cuts_audio_check()` → music -19 LU under speech; the second whoosh covers
   "today" (`sfx_over_words`). Its `fix` would move it between words (7.62 s), 180 ms
   before the card, outside the 0-40 ms sync rule: the hit is meant to land with the
   card, so keep it, tell the user, and count that issue as accepted.
6. Report: two whooshes at 3.17 s and 7.77 s, music 0-15 s at 0.35 with a 2 s
   fade-out and 12 dB ducking (-19 LU under speech), waiting for review.
