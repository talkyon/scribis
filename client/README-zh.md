# Scribis MCP Client & Agent Skills (`talkyon/scribis-mcp-client`)

[English](README.md) | [繁體中文](README-zh.md)

[Scribis](https://github.com/talkyon/scribis) 官方的 Model Context Protocol (MCP) 客戶端、網頁測試工具，以及 AI Agent Skills。

本儲存庫提供連接執行中 Scribis 實例所需的 MCP Client、AI Agent Skills 與測試工具，可讓 Claude Code、Cursor、Codex CLI、Google Antigravity IDE、Windsurf 等 AI 助手快速使用 Scribis 提供的本機語音轉文字、時間軸影片編輯、字幕校正與 TTS 語音合成功能。

Scribis Desktop 提供需驗證的 OpenAI 相容 REST API：`http://<scribis-host>:<shared-port>/v1`。在 **Settings → MCP Protocol** 設定共用 HTTP 埠號（預設 `8890`）。API 支援 `GET /models`、`GET /models/:model`、`GET /audio/voices`（Scribis voice 探索）、`POST /audio/transcriptions`、`POST /audio/speech`、`POST /chat/completions`、`POST /completions` 和 `POST /embeddings`。Chat 與 text completions 可用 `stream: true` 接收 Server-Sent Events，也可傳入選用的 `temperature` 和 `max_tokens` 生成參數。Chat 訊息支援標準的 `system`、`user`、`assistant` 角色。非串流完成回應會附上 usage；本地模型與 Apple 模型的 token 數為估算值。LLM 僅支援 Apple Foundation Models 與已安裝的本地 GGUF 模型；雲端 LLM 會被拒絕。下載「智慧媒體搜尋」資源後即可使用 `POST /embeddings`：模型為 `embeddinggemma-2-Q8_0`（僅在已安裝時出現在 `GET /models`），`input` 可為字串或最多 64 筆字串（每筆最多 8192 字元，不支援 token ID 陣列），可選 `encoding_format`（`float` 或 little-endian float32 的 `base64`）與 `dimensions`（`768`、`512`、`256` 或 `128`，截斷後重新正規化）。未下載模型時回傳 HTTP 404 `model_not_found`；usage 的 token 數為估算值。產生 API key 時需設定未來的 `expire_at`，呼叫時使用 `Authorization: Bearer <API_KEY>`。MCP 與 API 共用同一 listener；API 啟用時，MCP 路由會在 request 入口攔截，且仍只接受 localhost。MCP HTTP 路由不需要 token（只接受本機連線）：只接受目前埠號的 loopback `Host`、拒絕其他網站的 `Origin`，`/mcp` 與 `/api/select-file` 只接受 `Content-Type: application/json` 的 `POST`，超過 256 MiB 的 request body 會以 HTTP 413 拒絕，且不送 wildcard CORS，網頁無法呼叫。要對外提供 REST API，請加上 HTTPS 與來源受限的防火牆，且反向代理只轉送 `/v1` 路由。

---

## 📦 儲存庫內容

- **`skills/scribis-transcribe/`**：可直接使用的 AI Agent Skill（SKILL.md 與相關規格），讓 AI 助手能自動發現並使用 Scribis。
- **`skills/scribis-edit/`**：`/scribis-edit cuts <id>`、`/scribis-edit scene <id>`（從 Scribis 複製）的入口 Skill：開啟該編輯器、讀取內容並依需求轉到對應流程（字幕、粗剪、馬賽克／人臉、動態圖像、場景）。
- **`skills/scribis-motion/`**：以簡報 (brief) 為起點的動態圖像 Skill：起始範本（`kinetic_title`、`stat_chart`、`explainer`、`callout`、`lower_third`，以及說明動畫段落 `hook_title`、`points_list`、`takeaway_card`、`ui_walkthrough`、`logo_outro`）、內嵌 motion kit、審核放置與單一細節修改。
- **`skills/scribis-audio/`**：音樂與音效 Skill：搜尋與匯入素材、以配方產生音效、放到 Cuts 或場景音訊軌，以及音量與時機規則。
- **`skills/scribis-voice/`**：語音 Skill：TTS 旁白、專案講者的聲音與聲音複製、以實際聽到的逐字時間讓動畫與音效對齊節奏。
- **`skills/scribis-explainer/`**：說明動畫 Skill（以程式碼驅動的動態段落）：以報告、數字或 YouTube 影片為素材，在場景中用一段一段獨立的段落（標題、重點、圖表、結論）組成，每一段都能單獨修改。

請將 `scribis-edit` 與其轉介的 Skill（`scribis-transcribe`、`scribis-motion`、`scribis-audio`、`scribis-voice`、`scribis-explainer`）一起安裝。
- **`bridge.js`**：獨立 stdio ↔ Socket 橋接腳本，供 AI Host（如 Claude Code、Cursor）透過 stdio 連線至正在運行的 Scribis。
- **`client.js`**：使用 `@modelcontextprotocol/sdk` 的 Node.js 範例 MCP Client，用於測試 MCP 工具與資源。
- **`index.html`**：用於互動式 Web UI，可直接在瀏覽器中測試 MCP 工具與資源。
- **`scripts/check-public-content.js`**（`npm run check:public`）：給貢獻者使用；本公開套件含有私有內容（原始碼路徑、開發機路徑、Team 或 App Group ID、真實 ID）時會失敗。加上 `-- --tools-dir <dir>` 可同時依工具原始碼檢查 Skill 提到的每個工具名稱。

---

## 🚀 快速開始

### 選項 1：安裝隨附的 AI Agent Skills

`skills/` 底下每個資料夾都是標準 Agent Skill（含 `SKILL.md` 的資料夾）。請將**全部六個** `skills/scribis-*` 資料夾複製或建立符號連結到 Agent 的 Skills 目錄，並放在同一層：各 Skill 以相對路徑 `../scribis-*/` 互相連結，只安裝其中一個會造成連結失效。

| Agent | 專案（僅此儲存庫） | 個人（所有專案） |
| --- | --- | --- |
| Claude Code | `.claude/skills/` | `~/.claude/skills/` |
| OpenAI Codex（CLI、IDE、App） | `.agents/skills/` | `~/.agents/skills/` |
| Google Antigravity | `.agents/skills/` | `~/.gemini/config/skills/`（舊版：`~/.gemini/antigravity/skills/`） |
| Cursor | `.cursor/skills/` 或 `.agents/skills/` | `~/.cursor/skills/` 或 `~/.agents/skills/` |
| Windsurf | `.windsurf/skills/` 或 `.agents/skills/` | `~/.codeium/windsurf/skills/` 或 `~/.agents/skills/` |
| 其他支援 Agent Skills 的工具 | `.agents/skills/` | `~/.agents/skills/` |

Skill 目錄會隨主機版本改變；若資料夾沒有被讀取，請查看該版本的說明文件。例如在 macOS 或 Linux 為 Claude Code 安裝全部 Skill：

```bash
mkdir -p ~/.claude/skills
cp -R /path/to/scribis-mcp-client/skills/scribis-* ~/.claude/skills/
```

Windows（PowerShell）的個人目錄是 `%USERPROFILE%\.claude\skills`：

```powershell
New-Item -ItemType Directory -Force "$env:USERPROFILE\.claude\skills" | Out-Null
Copy-Item -Recurse -Force C:\path\to\scribis-mcp-client\skills\scribis-* "$env:USERPROFILE\.claude\skills"
```

若改用 `ln -s` 取代 `cp -R`，之後 `git pull` 即可更新 Skill。Windows 也可用檔案總管或 `xcopy /E /I` 複製資料夾。Cursor 也會讀取 `.claude/skills/`，因此安裝一次 Claude Code 即可同時使用。安裝後請重新啟動 Agent（或開新工作階段）。

### 選項 2：在 MCP Host 中設定 Scribis

先在 Scribis 啟用 MCP（**Settings → MCP**）。該頁面會依實際埠號顯示下列主機可直接複製的設定片段；下表中 `<port>` 即該埠號（預設 `8890`），`/path/to/` 為你 clone 本儲存庫的位置。

| 主機 | 設定檔 | 設定片段 |
| --- | --- | --- |
| Claude Code | 專案中的 `.mcp.json` | `{"mcpServers": {"scribis": {"type": "http", "url": "http://127.0.0.1:<port>/mcp"}}}`，或執行 `claude mcp add --transport http scribis http://127.0.0.1:<port>/mcp`（沒有 `"type": "http"` 的項目會被當成 stdio） |
| Claude Desktop | `claude_desktop_config.json`（macOS `~/Library/Application Support/Claude/`，Windows `%APPDATA%\Claude\`） | 只支援 stdio：`{"mcpServers": {"scribis": {"command": "node", "args": ["/path/to/scribis-mcp-client/bridge.js"]}}}`（見下方方式 A） |
| Cursor | `.cursor/mcp.json`（專案）或 `~/.cursor/mcp.json` | `{"mcpServers": {"scribis": {"url": "http://127.0.0.1:<port>/mcp"}}}` |
| OpenAI Codex（CLI、IDE） | `~/.codex/config.toml` | `[mcp_servers.scribis]` 接著 `url = "http://127.0.0.1:<port>/mcp"` |
| Google Antigravity | `mcp_config.json`（Agent 面板 → MCP Servers → Manage MCP Servers → View raw config） | `{"mcpServers": {"scribis": {"serverUrl": "http://127.0.0.1:<port>/mcp"}}}`；Antigravity 必須用 `serverUrl`，請把通用片段中的 `url` 改名 |
| Windsurf | `mcp_config.json`（Cascade → MCP servers → 檢視原始設定） | `{"mcpServers": {"scribis": {"serverUrl": "http://127.0.0.1:<port>/mcp"}}}`（也接受 `url`） |
| 其他主機 | 該主機的 MCP JSON | `{"mcpServers": {"scribis": {"url": "http://127.0.0.1:<port>/mcp"}}}`，或下方的 stdio bridge |

HTTP 端點只接受本機連線。只能啟動本機程序（stdio）的主機請使用 `bridge.js`：

#### 方式 A：直接使用 `node` 執行 `bridge.js`（最簡便，推薦，無需安裝 CLI）

```json
{
  "mcpServers": {
    "scribis": {
      "command": "node",
      "args": ["/path/to/scribis-mcp-client/bridge.js"]
    }
  }
}
```

*提示：如果 Scribis 安裝在非預設目錄，可在 `mcp.json` 內透過 `"env"` 傳入環境變數：*
```json
{
  "mcpServers": {
    "scribis": {
      "command": "node",
      "args": ["/path/to/scribis-mcp-client/bridge.js"],
      "env": {
        "SCRIBIS_USER_DATA_PATH": "E:\\CustomScribisData"
      }
    }
  }
}
```

#### 方式 B：使用全域 CLI 命令（需先執行 `scribis install-cli` 並加入 PATH）

```json
{
  "mcpServers": {
    "scribis": {
      "command": "scribis",
      "args": ["mcp-bridge"]
    }
  }
}
```

---

## 🧪 測試 MCP 連線

1. 確保 **Scribis 桌面應用程式** 正在您的機器上執行。
2. 安裝依賴套件：
   ```bash
   npm install
   ```
3. 執行示範客戶端腳本：
   ```bash
   npm start
   ```

### 自訂橋接腳本與環境變數

`bridge.js` 支援以下環境變數，方便在自訂安裝目錄或特殊環境下使用：

* **`SCRIBIS_USER_DATA_PATH`**：自訂 Scribis 應用程式 UserData 資料夾路徑（例如當用戶把資料移至 `E:\CustomData` 時）。
* **`SCRIBIS_DISCOVERY_PATH`**：直接指定 `discovery.json` 檔案的完整絕對路徑。
* **`SCRIBIS_SOCKET_PATH`**：直接指定 Unix Socket 或 Windows Named Pipe 路徑（最高優先權）。
* **`SCRIBIS_BRIDGE_PATH`**：（供 `client.js` 測試使用）指定自訂 `bridge.js` 腳本位置。

請將 `bridge.js` 與 `cli/` 資料夾一起保留在 clone 的儲存庫內：Bridge 會載入 `cli/lib/discovery.js`，不能單獨複製到其他位置。

**過期的 discovery 檔案：** Scribis 只允許單一執行個體，再次啟動會將既有視窗帶到前景。Bridge 與 `scribis` CLI 會確認 `discovery.json` 記錄的程序仍在執行，`scribis status` 也會確認其 Socket 可以連線；否則會回報 `Stale MCP discovery`，而不是顯示已連線。請重新啟動 Scribis，或在設定中關閉再開啟 MCP 伺服器以重寫該檔案，也可以將 `SCRIBIS_SOCKET_PATH` 設為正在執行的 App 的 Socket。

**discovery 檔案位置：** 未設定 `SCRIBIS_DISCOVERY_PATH` 或 `SCRIBIS_USER_DATA_PATH` 時，Bridge 與 CLI 會依序檢查下列位置，使用第一個正在執行的實例：

| 版本 | `discovery.json` |
| :--- | :--- |
| macOS（官網下載版） | `~/Library/Application Support/scribis/_mcp/discovery.json` |
| macOS（Mac App Store 版） | `~/Library/Group Containers/` 底下 Scribis App Group 容器中的 `_mcp/discovery.json`（會自動尋找） |
| macOS（舊版 Mac App Store） | `~/Library/Containers/com.talkyon.scribis/Data/Library/Application Support/scribis/_mcp/discovery.json` |
| Windows | `%APPDATA%\scribis\_mcp\discovery.json` |
| Linux | `~/.config/scribis/_mcp/discovery.json` |

**Mac App Store（沙盒）版本：** App 容器路徑超過 macOS Unix Socket 的 104 位元組上限，因此沙盒版本改在 App Group 容器建立 `mcp.sock`。若 Socket 仍無法監聽，Scribis 會在 `discovery.json` 寫入 `socketError`，Bridge 與 `scribis status` 會回報 `stdio socket is unavailable`；此時請改用本機 HTTP 傳輸：`scribis status --mcp`（會讀取 App 寫入 `discovery.json` 的 Port），或在 MCP Host 設定 `http://127.0.0.1:<port>/mcp`，其中 `<port>` 為 Settings → MCP 顯示的 Port（預設 8890）。讀取 App Group 容器時，macOS 可能會詢問一次是否允許終端機或 MCP Host 存取其他 App 的資料。

**沙盒版本的檔案路徑：** Scribis 只能讀取使用者授權過的檔案。`transcribe_audio`（`path`）、`get_video_frame`（`video_path`）、`create_avatar`（`image_path`、`audio_path`）收到無法讀取的路徑時，會回傳說明如何授權的錯誤，而不是 `File not found`：請在 Scribis 中開啟或匯入該檔案（或將所在資料夾設為同步資料夾）、在支援的工具改傳 Base64（`audio_data`、`image_data`），或呼叫 HTTP 的 `POST /api/select-file`（JSON body） 在 Scribis 對話框選擇檔案後傳入回傳的路徑。

**使用範例：**

- **macOS / Linux (Bash / Zsh)**：
  ```bash
  SCRIBIS_USER_DATA_PATH="/custom/path/scribis" node bridge.js
  SCRIBIS_BRIDGE_PATH="/path/to/bridge.js" npm start
  ```
- **Windows (PowerShell)**：
  ```powershell
  $env:SCRIBIS_USER_DATA_PATH="E:\CustomData\scribis"; node bridge.js
  $env:SCRIBIS_BRIDGE_PATH="C:\path\to\bridge.js"; npm start
  ```
- **Windows (CMD)**：
  ```cmd
  set SCRIBIS_USER_DATA_PATH=E:\CustomData\scribis && node bridge.js
  set SCRIBIS_BRIDGE_PATH=C:\path\to\bridge.js && npm start
  ```

---

## 📖 MCP 資源與工具總覽

### 資源

- `scribis://subtitles/current`：目前專案的即時字幕 JSON 陣列。
- `scribis://timeline/state`：目前專案的即時時間軸資料，包含音訊、影片、馬賽克、文字與縮放區塊。
- `scribis://cuts/motion-guide`、`scribis://cuts/motion-template`：HTML 動態圖像規格與範本（與 `scenes_get_motion_guide` 相同）。

### 關鍵工具

- **語音辨識（ASR）**：`list_models`, `transcribe_audio`, `cancel_transcription`
- **語音合成（TTS）**：`list_voices`, `generate_tts`
- **Avatar 影片**：`create_avatar`

`generate_tts` 可使用已安裝的 `voice_id`，也可用參考音訊克隆聲音而不傳 voice ID。參考音訊請使用 Base64 或 `data:audio/...;base64,...` Data URL，最多 20 MiB；`ref_audio` 請勿傳入本機檔案路徑。MioCodec `native` 支援 WAV、MP3、M4A、FLAC、OGG、WebM、AAC；VoxCPM2（`engine: "voxcpm2-tts"`）需要 WAV 參考聲音，且需先在 Scribis 安裝 VoxCPM2 模型。可用 `list_voices({engine: "voxcpm2-tts"})` 取得已安裝聲音的 ID，或將 WAV Data URL 傳入 `ref_audio`。`instruct` 可設定 VoxCPM2 的聲音風格。本地 TTS 遇到長句可能失敗，請依句末標點切成短句後逐段合成，並維持原有順序。

`create_avatar` 使用 `image_path` 或 `image_data`，再搭配 `audio_path` 或 `audio_data` 產生 MP4。Base64 可使用原始字串或相符的 Data URL；照片最多 20 MiB，音訊最多 100 MiB。`max_dimension` 可選 `256` 或 `512` px（預設 `512`）。預設回傳 Scribis temp 目錄中的 `video_path`；設 `enable_binary: true` 則改回傳 `video_base64`。若選用的 Avatar 模型尚未安裝，工具會直接回報，不會自動下載。

```json
{
  "text": "你好，今天開始錄音。",
  "lang": "zh-TW",
  "engine": "native",
  "ref_audio": "data:audio/wav;base64,<base64 audio>",
  "return_base64": true
}
```

有 `ref_audio` 時省略 `voice_id`。回覆的 `audio_base64` 預設為 WAV Data URL。
- **時間軸編輯**：`get_timeline_state`, `add_timeline_block`, `delete_segment`（粗剪範圍，預設 `mode="review"`，由使用者在 Scribis 編輯器接受）, `delete_timeline_block`（也可移除刪除區段）, `split_media`（切開跨越指定時間的字幕與效果區塊，不切音訊片段）, `reset_timeline`。每次成功的 MCP 時間軸變更都可用一次 Undo 復原。
- **字幕管理**：`get_all_subtitles`, `update_subtitle`, `batch_correct_subtitles`
- **畫面擷取**：`render_preview_frame`, `get_video_frame`, `get_current_frame`, `seek_player`
- **LLM 模型與對話**：`list_llm_models`, `llm_completion`（支援 macOS 26+ ARM64 Apple Intelligence、macOS 27+ MAS Apple PCC，以及本地/自訂 GGUF 模型；不支援雲端模型）
- **開啟頁面**：`app_open_youtube_browser(url?)` 開啟 YouTube AI 瀏覽器並載入 YouTube 網址或影片 ID；`cuts_open_project(project_id)`、`scenes_open(scene_id)` 在編輯器開啟 Cuts 專案或場景（ID 來自 `cuts_list_projects` / `scenes_list`，或 Cuts 中「開啟」旁的複製按鈕，會複製 `/scribis-edit cuts <id>` / `/scribis-edit scene <id>`，貼到 AI 代理即由 `scribis-edit` skill 開啟編輯器並開始編輯）。另一個編輯器開啟時會回報錯誤，不會直接關閉它。
- **YouTube**：`youtube_get_captions(url, lang?, format?)`（字幕可輸出為 `[m:ss]` 文字、cues 或 SRT，長影片分頁）、`youtube_get_quota`、`youtube_list_history`。免費帳號每月可使用 10 部新 YouTube 影片，與 YouTube AI 瀏覽器共用（同一部影片只計一次；歷史紀錄中的影片免費；Pro 無上限）；超過上限時這些工具與 `app_open_youtube_browser` 會以 `error_code: "YOUTUBE_MONTHLY_LIMIT_REACHED"` 失敗。
- **人臉與可用空間**：`cuts_detect_faces(action)` 以 Auto Mosaic 的 `none` 顆粒標記人臉（不打碼），為選用功能，僅在使用者想避開人臉時執行；`cuts_get_avoid_regions(start, end, project_id? | scene_id?, include_faces?, content_aspect?)` 回傳需避開的區域與可放 B-roll、文字、動態圖像的 `free_areas`（依實際畫面像素排序的最大可用矩形）。HTML 動態圖像依放置框尺寸排版，並可直接以名稱使用 Scribis 字型庫中的字型。編輯前請先讀 `skills/scribis-transcribe/references/mcp-playbook.md`。
- **Cuts 專案**：`cuts_list_projects`, `cuts_get_project`, `cuts_list_assets`, `cuts_place_visual`, `cuts_update_visual`, `cuts_remove_visual`, `cuts_split_block`, `cuts_merge_blocks`, `cuts_set_track_state`（預設 `mode="review"`）。Cuts 時間軸編輯器除了自己的影片，可加入 HTML 動態圖像（`cuts_place_visual` 會在需要時建立視覺軌道）與音樂、音效（`cuts_place_audio`，音訊軌）；圖片與影片請用 `scenes_edit`（`add_clip`、`source="asset"`）放進場景。`cuts_add_track` 暫時無法使用。
- **Scenes 場景**：`scenes_list(query?, limit?)`, `scenes_get(scene_id?)`, `scenes_create(name, aspect_ratio?)`, `scenes_edit(scene_id?, operations[], mode?, expected_revision?)`, `scenes_render_frame(scene_id?, timestamp_sec? | times?, width?, height?, return?)`。場景組合多個 Cuts 時間軸：軌道 1 是 storyboard（只放時間軸 clip，依序播放、不可重疊，相鄰 clip 之間可設轉場）；上方的圖層軌道可放時間軸、圖片、影片與 HTML 動態圖像；下方的音訊軌道只放音訊。時間軸來自 `cuts_list_projects`，素材來自 `cuts_list_assets`。HTML clip 可帶 `params`（依模板 manifest 驗證）；`replace_asset` 可把 clip 換成同類型的另一個素材，例如模板新版本。場景在 Scribis 開啟時，編輯預設 `mode="review"`（由使用者接受或拒絕；以 `scenes_get` → `review.recent` 讀取結果）；`mode="auto"` 直接套用。`scenes_render_frame` 以與場景預覽、匯出相同的方式渲染場景合成影格（storyboard 轉場、含 HTML 動態圖像的圖層軌道、場景背景），使用開啟中編輯器的即時狀態或已儲存的場景，並等待影片影格解碼與 HTML 圖層就緒；回傳 PNG 影像與暫存檔路徑（最多 6 個 `times`（`return="sheet"` 時最多 12 個並合成一張附時間標籤的縮圖表，`scenes_render_motion_graphic` 也支援）；`scenes_edit` 的 `add_clip` 可用 `track="previous"` 放到同一次編輯中上一個 `add_clip` 的軌道（先用 `new_layer` / `new_audio` 開始），未指定軌道時會放到該類型的第一條軌；場景片段最短 0.1 秒，`audio_generate_sfx` 產生更短的音效時會回傳 `warning`；預設為開啟中編輯器的播放頭）。
- **AI 參照**：在 Cuts 或場景編輯器選取任何項目都會顯示可複製的參照（`audio-1a2b3c4d`、`motion-…`、`subtitle-…` 等，附 `project:<id>` / `scene:<id>`；場景片段、Cuts 視覺區塊（圖片除外）與音樂區塊另附它播放的原始時間區間，例如 HTML 的合成時間 `(source 0:05.38–0:26.54)`）；`scribis_resolve_ref` 會找出該項目與可編輯它的工具，編輯工具也可直接把參照當作 `block_id` / `clip_id` / `id` 使用。
- **語音**：`audio_list_voices`、`audio_generate_speech`（以聲音目錄中的聲音、專案講者指定的聲音、從影片複製的講者聲音或參考錄音產生 TTS，存成 Cuts 素材）、`cuts_get_speech_words` / `scenes_get_speech_words` / `audio_get_speech_words`（實際聽到的逐字時間；TTS 段落會以 ASR 對齊其文字，因為字幕保留的是原始錄音的時間）。見 `scribis-voice` skill。
- **素材庫、音樂與音效**：`cuts_search_assets`（以文字搜尋音訊、圖片、影片與 HTML；建立 Media Search Index 後也依內容比對，音訊與影片的內容比對結果附 `match_times`，即檔案中符合的時間點）、`cuts_import_asset`（把本機檔案匯入 Cuts 素材庫）、`cuts_place_audio` / `cuts_update_audio` / `cuts_remove_audio`（在 Cuts 音訊軌放置音樂與音效；TTS 語音另外管理）、`audio_list_sfx_recipes` / `audio_generate_sfx`（以配方產生 whoosh、riser、impact、pop、click、ding 等音效，存成標記 `sfx` 的音訊素材）。音樂與音效片段有音量包絡線（`volume_keyframes`：`{time, gain, curve}` 控制點，App 中可直接拖曳音量線；預覽與匯出效果相同），適用 Cuts 區塊與場景音訊片段（`scenes_edit` 的 `update_clip`）；`fade_in` / `fade_out` 以及 `cuts_duck_audio` / `scenes_duck_audio`（說話時壓低音樂）都是寫入包絡線的預設。響度以量測為準：`audio_measure`（整合響度 LUFS、真實峰值、響度範圍與建議音量）與 `cuts_audio_check` / `scenes_audio_check`（說話時的音樂響度、蓋過字詞的音效、音效響度與密度、缺少的淡入淡出、削波；每個問題附上修正呼叫）。見 `scribis-audio` skill。
- **場景動態圖像**：`scenes_get_motion_guide(starter?)`（起始範本：`lower_third`、`kinetic_title`、`stat_chart`、`explainer`、`callout`，說明動畫段落 `hook_title`、`points_list`、`takeaway_card`、`ui_walkthrough`、`logo_outro`；見 `scribis-motion` skill）, `scenes_find_motion_templates`, `scenes_create_motion_graphic`, `scenes_get_motion_graphic`, `scenes_import_motion_graphic`, `scenes_update_motion_graphic`, `scenes_render_motion_graphic`。動態圖像是自包含的 HTML 文件（`scribis.motion/1`），存入 HTML 模板庫，附穩定的 `template_id`、可搜尋的描述與標籤；起始範本也以唯讀的內建模板出現在模板庫中。相同或近似的模板不會重複儲存：建立時會回傳既有模板（`status: "existing"`）或相似的模板清單（`status: "similar_found"`，可用 `force: true` 略過），內容未變的更新不會新增版本（`status: "unchanged"`），搜尋結果附 `usage_count`。參數型別可為 text、color、number、boolean、select、`image`（Cuts 圖片素材）或 `font`（已安裝字型），並可標註 `role`；模板帶有 `category` 與適用的 `aspects`，可用 `scenes_find_motion_templates` 依 `category`/`aspect` 瀏覽。用 `scenes_find_motion_templates` 以關鍵字或場景／時間軸時間位置（「11:50 的模板」）找到後，可修改它（`scenes_update_motion_graphic`，`retarget="open_scene"` 或 `"open_project"` 會對開啟中的場景或 Cuts 專案提出替換的編輯）或以它為基礎建立新模板（`scenes_create_motion_graphic` 搭配 `based_on`），再以 `scenes_edit` 的 `add_clip(source="asset", params)` 放進場景，或以 `cuts_place_visual` 放到 Cuts 時間軸。建立、更新與渲染的結果都附 `warnings`（靜態檢查）與 `logs`（渲染期間文件的 console 輸出與未捕捉的例外，含 HTML 行號），讓 agent 不用開啟程式碼編輯器也能除錯模板。`scenes_import_motion_graphic(format="hyperframes", html, files)` 可將 HyperFrames 合成（index.html 與所有子合成檔、本機腳本/樣式表）轉成單一模板：內嵌子合成與本機腳本、`composition` 只匯入多場景專案中的單一場景、宣告的變數轉為參數，`<video>`/`<audio>` 會被拒絕（可用 `strip_media` 移除），結果附 `import.warnings`。詳見 `skills/scribis-transcribe/references/mcp-tools-spec.md`。

---

## 📄 授權條款

本儲存庫採用 [MIT 授權條款](LICENSE)。
