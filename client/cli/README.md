# Scribis CLI

`scribis` 是一個輕量化的命令列代理工具（Proxy Client），透過 stdio (IPC Socket) 或 MCP HTTP 協議與運作中的 Scribis Desktop 應用程式進行互動與轉錄。

## 功能特點

- 🔌 **雙重通訊模式 (stdio / MCP)**：預設以 stdio 讀取 IPC socket 與桌面端溝通；亦可透過 `--mcp` 以 MCP HTTP 互動。
- 🎙️ **支援多種 ASR 模型**：Whisper, SenseVoice, Parakeet, QwenASR
- 📻 **Real-time Streaming 轉錄**：從 stdin 接收 16kHz PCM16 數據經由代理發送轉錄
- 📄 **多種輸出格式**：JSON, SRT, TXT, VTT
- 🤖 **MCP Bridge Proxy**：供 Claude Code / Codex / Cursor / Antigravity 作為 stdio MCP bridge 呼叫

## 通訊模式與設定

1. **stdio 模式（預設）**：
   啟動時自動檢測 Scribis 桌面端的 stdio socket 通道。
2. **MCP HTTP 模式 (`--mcp`)**：
   預設使用執行中 App 寫入 `discovery.json` 的 HTTP Port；可用環境變數 `SCRIBIS_MCP_PORT` 覆寫為 Settings → MCP 顯示的 Port（預設 8890）。兩者皆無時，`--mcp` 模式會回報錯誤提示。

## 安裝與設定

```bash
# 1. 從本儲存庫根目錄進入 cli 目錄
cd cli

# 2. 執行自動安裝命令
node bin/scribis.js install-cli
```

### 🍎 macOS
執行 `install-cli` 後，會在 `~/.local/bin/scribis` 建立 Symlink 捷徑。
請確保 `~/.local/bin` 已包含在你的 Shell PATH 中 (`export PATH="$HOME/.local/bin:$PATH"`)。

### 🪟 Windows
執行 `install-cli` 後，會在 `%LOCALAPPDATA%\Programs\scribis\scribis.cmd` 建立批次檔。
請將 `%LOCALAPPDATA%\Programs\scribis` 新增至 Windows 的 **使用者環境變數 (User PATH)** 中。

## 指令範例

### 轉錄檔案 (Batch)

```bash
# 基本轉錄 (預設 stdio 模式，輸出 JSON)
scribis transcribe input.mp4

# 指定模型與語言，輸出 SRT 字幕
scribis transcribe input.mp4 --model large-v3 --lang zh --output srt -o output.srt

# 使用 MCP HTTP 模式
scribis transcribe input.mp4 --mcp --output json
```

### 即時轉錄 (Streaming)

```bash
# 1. 預設管道模式 (收集整個 stdin 音訊後一次輸出完整 JSON/SRT)
ffmpeg -i input.wav -ar 16000 -ac 1 -f s16le - | scribis stream --model base --lang auto

# 2. VAD 語音活動檢測模式 (推薦！檢測到說話停頓/講完一句時才即時印出文字)
ffmpeg -re -i input.wav -ar 16000 -ac 1 -f s16le - | scribis stream --vad --lang auto

# 3. 固定時間切片增量模式 (每 3 秒邊灌邊印出文字)
ffmpeg -re -i input.wav -ar 16000 -ac 1 -f s16le - | scribis stream --realtime --chunk 3 --lang auto
```

### 查看狀態與模型

```bash
scribis status
scribis models
```

`scribis status` 會確認 `discovery.json` 記錄的程序仍在執行，且 Socket 可以連線；若 discovery 檔案已過期，會回報 `Stale MCP discovery` 而不是「Connected」。請重新啟動 Scribis 或在設定中關閉再開啟 MCP 伺服器，或設定 `SCRIBIS_SOCKET_PATH`。macOS 上 CLI 會依序在 Application Support、Mac App Store 的 App Group 容器與 MAS App 容器尋找 `discovery.json`；若回報 `stdio socket is unavailable`，請改用 `--mcp`（錯誤訊息會列出 App 使用的 Port）。

### 開啟頁面

把 Scribis 視窗帶到前景並開啟頁面（若另一個 Cuts 或場景編輯器正在開啟，會回報錯誤而不會關閉它）：

```bash
scribis open youtube https://youtu.be/dQw4w9WgXcQ   # 開啟 YouTube AI 瀏覽器並載入影片
scribis open cuts <project_id>                     # 在時間軸編輯器開啟 Cuts 專案
scribis open scene <scene_id>                      # 在場景編輯器開啟場景

# YouTube 字幕與額度 (免費版每月 10 部新影片，與 YouTube AI 瀏覽器共用；歷史紀錄中的影片免費)
scribis youtube captions https://youtu.be/dQw4w9WgXcQ --lang en --output srt -o talk.srt
scribis youtube quota                              # 本月已用與剩餘的新影片數
scribis youtube history                            # 歷史紀錄中的影片
```

Cuts → 最近編輯／場景 中「開啟」旁的複製按鈕會複製 `/scribis-edit cuts <id>` 或 `/scribis-edit scene <id>`：貼到 Claude Code 等 AI 代理會由 `scribis-edit` skill 直接開啟並建置；CLI 使用時取最後的 ID 即可。
