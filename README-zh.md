# Scribis: 語音轉文字 (Speech to Text)

[English](README.md) | [繁體中文](README-zh.md)

**轉錄、翻譯與筆記 — 重塑您的音訊轉錄與 AI 協作體驗**

Scribis 是一款專為隱私與效率設計的高效能本地 AI 語音轉文字工具。我們利用端側運算技術，在不將數據上傳至雲端的前提下，讓每一段音訊都能成為您的知識資產。

> **注意**：本 GitHub 倉庫僅用於發佈編譯後的程式（Binaries）、說明文件及問題回報，不包含原始碼。

---

## 📥 下載中心 (Download)

| 平台 | 下載連結 |
| :--- | :--- |
| **macOS** | [![Download on the App Store](https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg)](https://apps.apple.com/us/app/scribis-speech-to-text/id6761047195?mt=12) <br> [直接下載 (.dmg)](https://github.com/talkyon/scribis/releases/latest/download/scribis.dmg) |
| **Windows** | [直接下載 (.exe)](https://github.com/talkyon/scribis/releases/latest/download/scribis-setup.exe) <br> **提示**：此試用版目前尚未包含數位簽章，安裝時 Windows 可能會彈出安全警告。您可以點擊「仍要執行」繼續，但若您對此有安全性疑慮，建議您暫時不要下載使用。 |

---

## ✨ 核心特色

### 🎙️ 頂尖本地 AI 模型全支援
Scribis 支援多種頂尖模型，滿足不同的轉錄需求，無需聯網即可確保高準確率與極速響應。
- **OpenAI Whisper**: 精準辨識，支援超過 99 種語言。
- **SenseVoice Small**: 極速多語種辨識，支援中文、英文、日文與韓語。
- **VibeVoice & Voxtral**: 專業級模型，提供高品質的音訊處理。
- **Qwen 3 ASR & Parakeet**: 針對多語境深度優化，具備極低的運算延遲。

![Multiple Local ASR Models](images/zh/MULTIPLE%20LOCAL%20ASR%20MODELS.png)

### 🔍 精準影片 OCR
透過自定義區域框選工具，直接從影片中提取並數位化「硬字幕」（內嵌字幕）。
- **macOS**: 採用原生 Apple OCR 技術，提供流暢的辨識體驗。
- **Windows**: 支援 Tesseract 與 PaddleOCR，確保高精準度的文字提取。

![OCR Text Extraction](images/zh/OCR%20TEXT%20EXTRACTION.png)

### ⚡ 即時轉錄與特定應用程式音訊擷取
- **特定應用程式音訊擷取**: 過濾背景雜音，直接從特定應用程式（如 Zoom、Teams、Chrome）擷取高品質音訊。
- **懸浮字幕**: 在錄音或參加會議時，透過懸浮視窗即時查看轉錄文字。
- **全球翻譯**: 為國際會議或講座提供即時流暢的翻譯字幕，打破語言隔閡。

![App-Specific Audio Capture](images/zh/APP-SPECIFIC%20AUDIO%20CAPTURE.png)
![Real-Time Floating Subtitles](images/zh/REAL-TIME%20FLOATING%20SUBTITLES.png)

### 👥 講者辨識 (Speaker Diarization)
- **角色自動分離**: 先進演算法能精準區分音訊中的不同發言者。
- **清晰對話記錄**: 自動標記「誰在何時說了什麼」，讓會議或訪談的逐字稿條理清晰。

![Local Speaker Audio Redesign](images/zh/LOCAL%20SPEAKER%20AUDIO%20REDESIGN.png)

### 🤖 AI 智慧助手 (支援本地 GGUF 模型)
- **本地 GGUF 整合**: 使用本地大語言模型 (LLM) 進行離線摘要，並針對音訊內容進行互動式問答。
- **智慧摘要**: 數小時的錄音，只需數秒即可提煉出核心重點與行動指南。

![Local LLM GGUF Support](images/zh/LOCAL%20LLM%20GGUF%20SUPPORT.png)

### 📝 高效字幕編輯器
內建專為速度與準確性設計的編輯器，輕鬆調整時間軸與文字內容，完美銜接匯出流程。

![Subtitle Editor](images/zh/SUBTITLE%20EDITOR.png)

### 🔊 語音合成 (TTS)
- **自然人聲配音**: 內建高品質 CPU 驅動語音合成技術，支援中、英、日語，提供自然人性化的音色。
- **一鍵文字變聲音**: 適用於影片配音、有聲書製作或輔助閱讀。

### 🛠️ 專業工作流整合
- **多格式匯出**: 支援匯出 SRT, VTT, Markdown 與純文字。
- **媒體庫管理**: 輕鬆管理數以千計的專案，支援全域快速搜尋與標籤分類。

---

## 🌐 支援轉錄語言

Scribis 支援超過 **99 種轉錄語言**，包括：
**繁體/簡體中文**, **英語**, **日語**, **韓語**, **粵語**, **越南語**, **法語**, **德語**, **西班牙語**, **義大利語**, **葡萄牙語**, **俄語**, **泰語**, **印地語**, **阿拉伯語**...等。

---

## 🎯 適合誰使用？

- **內容創作者 / YouTuber**: 快速生成精準字幕，進軍全球市場。
- **商務精英**: 將複雜會議記錄快速轉化為行動清單。
- **媒體工作者**: 快速整理採訪錄音，自動標記發言角色。
- **學生與研究員**: 將課程轉化為結構化筆記，透過 AI 快速檢索知識點。
- **法律與學術專業**: 在本地隱私保護下，精確記錄訪談細節。

---

## 🛡️ 隱私與效能

- **高效能架構**: 針對現代硬體優化，包括充分利用 Apple Silicon (M 系列) 的神經網路引擎。
- **100% 本地處理**: 您的音訊與轉錄內容絕不離開裝置。零伺服器成本，零數據外洩風險。
- **不訓練政策**: 我們絕不使用您的私人資料來訓練 AI 模型。

---
