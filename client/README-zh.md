# Scribis MCP Client & Agent Skills (`talkyon/scribis-mcp-client`)

[English](README.md) | [繁體中文](README-zh.md)

[Scribis](https://github.com/talkyon/scribis) 官方的 Model Context Protocol (MCP) 客戶端、網頁測試工具，以及 AI Agent Skills。

本儲存庫提供連接執行中 Scribis 實例所需的 MCP Client、AI Agent Skills 與測試工具，可讓 Claude Code、Cursor、Codex CLI、Google Antigravity IDE、Windsurf 等 AI 助手快速使用 Scribis 提供的本機語音轉文字、時間軸影片編輯、字幕校正與 TTS 語音合成功能。

---

## 📦 儲存庫內容

- **`skills/scribis-transcribe/`**：可直接使用的 AI Agent Skill（SKILL.md 與相關規格），讓 AI 助手能自動發現並使用 Scribis。
- **`bridge.js`**：獨立 stdio ↔ Socket 橋接腳本，供 AI Host（如 Claude Code、Cursor）透過 stdio 連線至正在運行的 Scribis。
- **`client.js`**：使用 `@modelcontextprotocol/sdk` 的 Node.js 範例 MCP Client，用於測試 MCP 工具與資源。
- **`index.html`**：用於互動式 Web UI，可直接在瀏覽器中測試 MCP 工具與資源。

---

## 🚀 快速開始

### 選項 1：將 AI Agent Skill 加入您的 AI 助手

在您 AI 代理的技能設定檔（例如 `skills.json`）中複製或引用 `skills/scribis-transcribe`：

```json
{
  "entries": [{ "path": "path/to/scribis-mcp-client/skills" }]
}
```

### 選項 2：在 MCP Host 中設定 Scribis

在主機應用程式的 `mcp.json` 中設定 Scribis（選一種即可）：

#### 方式 A：直接使用 `node` 執行 `bridge.js`（最簡便，推薦，無需安裝 CLI）

```json
{
  "mcpServers": {
    "scribis": {
      "command": "node",
      "args": ["/path/to/mcp_client/bridge.js"]
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
      "args": ["/path/to/mcp_client/bridge.js"],
      "env": {
        "SCRIBIS_USER_DATA_PATH": "D:\\CustomScribisData"
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

* **`SCRIBIS_USER_DATA_PATH`**：自訂 Scribis 應用程式 UserData 資料夾路徑（例如當用戶把資料移至 `D:\CustomData` 時）。
* **`SCRIBIS_DISCOVERY_PATH`**：直接指定 `discovery.json` 檔案的完整絕對路徑。
* **`SCRIBIS_SOCKET_PATH`**：直接指定 Unix Socket 或 Windows Named Pipe 路徑（最高優先權）。
* **`SCRIBIS_BRIDGE_PATH`**：（供 `client.js` 測試使用）指定自訂 `bridge.js` 腳本位置。

**使用範例：**

- **macOS / Linux (Bash / Zsh)**：
  ```bash
  SCRIBIS_USER_DATA_PATH="/custom/path/scribis" node bridge.js
  SCRIBIS_BRIDGE_PATH="/path/to/bridge.js" npm start
  ```
- **Windows (PowerShell)**：
  ```powershell
  $env:SCRIBIS_USER_DATA_PATH="D:\CustomData\scribis"; node bridge.js
  $env:SCRIBIS_BRIDGE_PATH="C:\path\to\bridge.js"; npm start
  ```
- **Windows (CMD)**：
  ```cmd
  set SCRIBIS_USER_DATA_PATH=D:\CustomData\scribis && node bridge.js
  set SCRIBIS_BRIDGE_PATH=C:\path\to\bridge.js && npm start
  ```

---

## 📖 MCP 資源與工具總覽

### 資源

- `scribis://subtitles/current`：目前專案的即時字幕 JSON 陣列。
- `scribis://timeline/state`：目前專案的即時時間軸資料，包含音訊、影片、馬賽克、文字與縮放區塊。

### 關鍵工具

- **語音辨識（ASR）**：`list_models`, `transcribe_audio`, `cancel_transcription`
- **語音合成（TTS）**：`list_voices`, `generate_tts`
- **時間軸編輯**：`get_timeline_state`, `add_timeline_block`, `delete_segment`, `reset_timeline`
- **字幕管理**：`get_all_subtitles`, `update_subtitle`, `batch_correct_subtitles`
- **畫面擷取**：`render_preview_frame`, `get_video_frame`, `get_current_frame`, `seek_player`

---

## 📄 授權條款

本儲存庫採用 [MIT 授權條款](LICENSE)。
