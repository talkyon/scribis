---
name: scribis-voice
description: >
  Speech in a Scribis video, or animation timed to speech: voice-over and narration (TTS),
  re-voicing a line in a speaker's own or cloned voice, choosing voices, and syncing motion
  graphics, captions or effects to the spoken words ("make the title land on 'launch'",
  "幫我用他的聲音念這句", "加一段旁白", "動畫要跟著說話的節奏", "time the chart to the voice-over"). Trigger even
  without the word Scribis. Requires the Scribis MCP tools.
---

# Scribis Voice Skill (TTS, voice cloning and word timing)

> New to Scribis MCP? Read
> [../scribis-transcribe/references/mcp-playbook.md](../scribis-transcribe/references/mcp-playbook.md)
> first. Motion graphics are the [`scribis-motion`](../scribis-motion/SKILL.md)
> skill, music and sound effects the [`scribis-audio`](../scribis-audio/SKILL.md)
> skill; both use the word times this skill produces.

## 0. What must be open, and where IDs come from

| Call | Needs |
|:---|:---|
| `audio_list_voices`, `audio_generate_speech`, `audio_get_speech_words` | nothing open; `speaker` / `clone_speaker` need a Cuts project (the open one, or `project_id`) |
| `cuts_get_speech_words` / `scenes_get_speech_words` | nothing open when you pass `project_id` / `scene_id` |
| Placing speech: `scenes_edit add_clip` in review mode | the scene open (`scenes_open`); a closed scene takes only `mode="auto"`, and only when the user agreed to edits without review |

IDs: `project_id` from `cuts_list_projects` (or a timeline clip's `source_id` in
`scenes_get`); `speaker_id`s from `audio_list_voices(project_id)`; scene `clip_id`,
`track_id` and `revision` from `scenes_get`; Cuts block and track IDs from
`cuts_get_project`. Only one AI proposal can wait per editor: put all placements in one
`scenes_edit` and re-read `scenes_get` after the user accepts (playbook section 1, rule 4,
and section 4).

## 1. Choose a voice

`audio_list_voices(project_id?)` lists the TTS voice catalog and, for a Cuts
project, its speakers with the voice assigned to each (`clone_current` = the
speaker is cloned from the video) and whether they can be cloned.

| The user wants | Pass to `audio_generate_speech` |
|:---|:---|
| A line in an existing speaker's usual voice | `speaker=<speaker_id>` (the voice the project already uses) |
| That speaker's own voice, cloned from the video | `clone_speaker=<speaker_id>` (longest segment, ≤ 10 s, is the reference) |
| A reference recording as a voice | `reference_asset_id` (import it with `cuts_import_asset(path, description, tags)` first; 5–10 s of clean speech) |
| A stock or Voice Lab voice, including VoxCPM2 | `voice=<value from audio_list_voices>` |

Speakers, `speaker` and `clone_speaker` exist only for a **Cuts project**
(`audio_list_voices(project_id)` lists them). A scene-only job has no speaker route:
pass the `project_id` of the Cuts project the scene uses (a timeline clip's
`source_id`), clone from a user recording with `reference_asset_id`, or pick a catalog
`voice`. Voice cloning works in every Scribis build, including the Mac App Store build,
as long as Scribis can read the source video or recording.

Voices listed by Scribis are available to use directly. For VoxCPM2, choose a
`voxcpm2-tts:` voice from `audio_list_voices`; VoxCPM2 needs its model installed
and a WAV reference voice.

### Audition before full narration

- If the voice is unspecified, the user is changing it, or sound quality matters, generate a representative 5–10 second sample before the full narration. Include difficult names or numbers when pronunciation matters, then let the user audition or choose.
- A successful synthesis only proves that an audio file was produced; it does not prove that the voice sounds good or pronounces names correctly. If the assistant cannot play or hear the sample, say so instead of claiming to have auditioned it.
- Confirmation that a reference voice belongs to the user settles permission; it does not establish that they like the result. Do not ask them to confirm ownership again once they have clearly done so.

## 2. Generate

`audio_generate_speech(text, language, <one voice source>, project_id?, with_words?)`
returns a Cuts audio asset tagged `tts` (its description is the text):

- Write the text as it should be spoken: numbers and abbreviations spelled the
  way they are said, one idea per sentence, punctuation for pauses.
- `language` is the spoken language (`en`, `zh`, `ja`, …).
- `with_words=true` also returns word times inside the clip (seconds from 0).
- Local TTS models may fail on long sentences. Split long passages at sentence-ending punctuation (`.`, `。`, `!`, `！`, `?`, `？`) and synthesize each short sentence in order, keeping the punctuation. Keep each returned audio asset in the same order when placing the sentences in a scene.
- Scenes: place it with `scenes_edit add_clip(source="asset", source_id, track_id=<existing audio track> or track="new_audio", start, volume?)`.
  Placing generated speech on a Cuts timeline as an editable speech block is not
  available over MCP yet; use a scene, or ask the user to add it from the Cuts
  audio panel.

When the user points at a line by its AI reference (`speech-…` for TTS, `audio-…` for a
recording, `subtitle-…`), `scribis_resolve_ref(text)` gives its time range; read the words
there with the tools below.

### Align generated speech segments

- Track each generated segment's text, asset ID, actual duration, and word-timing status. Place clips in script order using measured durations plus intentional pauses; do not estimate starts from character counts or reuse timings from the previous voice track.
- Convert each clip's word times to scene times by adding its cumulative clip start. Recalculate graphic markers and SFX positions only after the final speech segments and pauses are set.

## 3. Word timing (rhythm)

Subtitles carry the timing of the ORIGINAL recording. Once a line is replaced
by TTS (dubbing, a translated voice, a regenerated line), its words are spoken
at different times, so never time animation from subtitles inside TTS blocks.

| Where | Tool | Times |
|:---|:---|:---|
| A Cuts project | `cuts_get_speech_words(project_id?, start?, end?, language?)` | source-video seconds (+ `output_start`; `deleted` words are cut) |
| A scene | `scenes_get_speech_words(scene_id?, start?, end?, language?)` | scene seconds |
| One clip before placing | `audio_get_speech_words(asset_id)` | clip seconds from 0 |

Each word has `source`: `tts` (ASR of the TTS audio aligned to its known text)
or `subtitle` (original recording). The text decides the words, so recognition
mistakes never change them; `matched=false` words have interpolated times and
`confidence` per block tells how much was heard. Results are cached until Scribis quits; long
projects return `next_start` (call again from there). `language` selects a
translation's TTS track (`default` = original).

## 4. Sync rules

- Put each beat or reveal on the `start` of the word it illustrates (the key
  noun, number or verb), not on the sentence start.
- Word-by-word text: drive each word's reveal from its `start`; keep it on screen
  at least until its `end`.
- Motion graphics: set `markers` (and beat constants) from word starts relative
  to the clip start; a block placed at T with a marker at m lands on word time T+m.
- Sound effects: on the visual event, 0–40 ms early, in a gap between words or
  well under the voice (see `scribis-audio`).
- Low `confidence` (< 0.6) or many `matched=false` words: check the frames
  around those words with `render_preview_frame` / `scenes_render_frame`, or ask
  the user to review timing. If your host cannot show images, request
  `scenes_render_frame(..., return="path")` (`render_preview_frame` always returns a
  `frame_path`), give the user the times and paths, and ask them to look.

## Example

"Re-voice the intro line in Grace's voice and make the title land on 'launch'"
(Grace = `SPEAKER_01` of the Cuts project the scene uses; the title is a motion graphic in
the scene):

1. `audio_list_voices(project_id)` → Grace's assigned voice is `clone_current` (cloned from the video).
2. `audio_generate_speech(text="Today we launch Scribis 2", language="en", speaker="SPEAKER_01", project_id, with_words=true)` generates the line.
3. Words: "launch" starts at 0.62 s in the clip. Placed in the scene at 12.0 s, it is
   heard at 12.0 + 0.62 = 12.62 s (scene seconds). Markers are clip-local (0 = the
   graphic's start): the title clip starts at 11.5 s, so its `intro-done` marker belongs
   at 12.62 − 11.5 = 1.12 s.
4. Later, with the clip placed, `scenes_get_speech_words(start=11, end=16)`
   confirms the timing in scene seconds.
