# Scribis MCP Resources & Tools Specification

## Resources

- **`scribis://subtitles/current`**: Complete subtitles array of the current open project in JSON format (contains `id`, `start`, `end`, `text`, `words`, `language`). Supports resource update notifications.
- **`scribis://timeline/state`**: Live structure and state of the Scribis timeline (contains SubtitleBlocks, AudioBlocks, ZoomBlocks, MosaicBlocks, TextBlocks, CameraBlocks, DeletionBlocks).

---

## Tools

### 🎙️ ASR & Transcription Tools
| Tool | Arguments | Description |
|:---|:---|:---|
| `list_models` | None | Lists all installed transcription models (Whisper, SenseVoice, Parakeet, QwenASR) and indicates active default model. |
| `transcribe_audio` | `path?, audio_data?, format?, model?, lang?, persist?` | Transcribes audio/video. Accepts absolute file path or base64 string. Optional `persist=true` saves transcript to Scribis DB. |
| `cancel_transcription` | None | Cancels active MCP transcription task. |

### 🔊 TTS Synthesis Tools
| Tool | Arguments | Description |
|:---|:---|:---|
| `list_voices` | `engine?` | Lists available TTS voices (`kokoro` \| `native`). |
| `generate_tts` | `text, voice_id, lang?, speed?, engine?, return_base64?` | Generates speech WAV file or base64 string from text. |

### 🎬 Frames & Vision Preview Tools
| Tool | Arguments | Description |
|:---|:---|:---|
| `render_preview_frame` | `timestamp_sec?, include_wireframe?` | Renders fully synthesized frame including timeline effects, mosaic, and subtitles. |
| `get_video_frame` | `timestamp_sec, video_path?` | Extracts raw video frame at specified timestamp using FFmpeg. |
| `get_current_frame` | `include_wireframe?` | Captures current player Canvas frame. |
| `seek_player` | `timestamp_sec` | Seeks player to timestamp. |

### ✂️ Timeline Editing Tools
| Tool | Arguments | Description |
|:---|:---|:---|
| `get_timeline_state` | None | Reads complete timeline state. |
| `add_timeline_block` | `type, start, end, parameters` | Adds timeline block (`zoom`, `mosaic`, `text`, `camera`, `subtitle`). |
| `delete_segment` | `start, end` | Adds DeletionBlock for rough cut editing. |
| `reset_timeline` | `confirm?` | Resets all timeline effect blocks. |

### 📝 Subtitles Tools
| Tool | Arguments | Description |
|:---|:---|:---|
| `get_all_subtitles` | `from_index?, to_index?, from_time?, to_time?, query?, regex?` | Reads subtitles array with optional range or search filtering. |
| `update_subtitle` | `id, text, start?, end?, auto?` | Updates subtitle phrase. `auto=false` sends to UI review mode. |
| `batch_correct_subtitles` | `corrections: [...], auto?` | Batch updates subtitles. |
