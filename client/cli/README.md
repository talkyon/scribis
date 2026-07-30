# Scribis CLI

`scribis` 是一個輕量化的命令列代理工具（Proxy Client），透過 stdio (IPC Socket) 或 MCP HTTP 協議與運作中的 Scribis Desktop 應用程式進行互動與轉錄。

## 功能特點

- 🔌 **雙重通訊模式 (stdio / MCP)**：預設以 stdio 讀取 IPC socket 與桌面端溝通；亦可透過 `--mcp` 結合 `SCRIBIS_MCP_PORT` 進行 MCP HTTP 互動。
- 🎙️ **支援多種 ASR 模型**：Whisper, SenseVoice, Parakeet, QwenASR
- 📻 **Real-time Streaming 轉錄**：從 stdin 接收 16kHz PCM16 數據經由代理發送轉錄
- 📄 **多種輸出格式**：JSON, SRT, TXT, VTT
- 🤖 **MCP Bridge Proxy**：供 Claude Code / Codex / Cursor / Antigravity 作為 stdio MCP bridge 呼叫

## 通訊模式與設定

1. **stdio 模式（預設）**：
   啟動時自動檢測 Scribis 桌面端的 stdio socket 通道。
2. **MCP HTTP 模式 (`--mcp`)**：
   需透過環境變數 `SCRIBIS_MCP_PORT` 指定連接 Port (例如: `8890`)。若未設定環境變數即使用 `--mcp` 模式，系統將拋出錯誤提示。

## 安裝與設定

```bash
# 1. 進入 cli 目錄
cd mcp_client/cli

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
SCRIBIS_MCP_PORT=8890 scribis transcribe input.mp4 --mcp --output json
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
