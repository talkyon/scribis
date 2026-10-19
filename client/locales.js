globalThis.locales = {
  en: {
    title: 'Scribis MCP Web API Tester',
    subtitle: 'Model Context Protocol HTTP Diagnostic Tool',
    server: 'Server:',
    tab_asr: 'ASR Transcription & Models',
    tab_tts: 'TTS Voice Synthesis',
    tab_timeline: 'Subtitles & Timeline',
    tab_raw: 'JSON-RPC API',

    // ASR
    asr_list_models_title: '1. List ASR Models',
    asr_list_models_btn: 'Query Models',
    asr_list_models_desc:
      'Click the button above to query all currently installed ASR models (Whisper, SenseVoice, Parakeet, QwenASR, etc.).',
    asr_transcribe_title: '2. Transcribe Audio/Video File',
    asr_file_path_label: 'Absolute Path to Audio/Video File:',
    asr_file_path_placeholder: '/Users/username/Downloads/demo.mp4',
    asr_select_file_btn: 'Select File',
    asr_drag_drop_text:
      'Drag & drop audio/video here, or click to open file selection (Supports MP4, MOV, M4A, MP3, WAV, AAC, etc.)',
    asr_model_label: 'Select Model:',
    asr_model_placeholder: 'Please load models first...',
    asr_lang_label: 'Language:',
    asr_lang_auto: 'auto (Auto Detect)',
    asr_lang_zh: 'zh (Chinese)',
    asr_lang_zh_TW: 'zh_TW (Traditional Chinese)',
    asr_lang_zh_CN: 'zh_CN (Simplified Chinese)',
    asr_lang_en: 'en (English)',
    asr_lang_ja: 'ja (Japanese)',
    asr_lang_ko: 'ko (Korean)',
    asr_lang_de: 'de (German)',
    asr_lang_es: 'es (Spanish)',
    asr_lang_fr: 'fr (French)',
    asr_lang_ru: 'ru (Russian)',
    asr_lang_pt: 'pt (Portuguese)',
    asr_lang_it: 'it (Italian)',
    asr_lang_vi: 'vi (Vietnamese)',
    asr_lang_th: 'th (Thai)',
    asr_lang_yue: 'yue (Cantonese)',
    asr_lang_custom: '✏️ Custom Language Code...',
    asr_lang_custom_placeholder: 'Enter custom code (e.g. yue, fr-FR)',
    asr_persist_label: 'Save to Scribis Project Library',
    asr_start_btn: 'Start Transcription',
    asr_cancel_btn: 'Cancel Transcription',
    asr_transcribing: 'Transcribing...',
    asr_canceling: 'Canceling...',

    asr_result_title: 'Transcription Result:',
    asr_tab_summary: 'Summary & Full Text',
    asr_tab_srt: 'SRT Subtitles',
    asr_tab_json: 'JSON Pretty',
    asr_copy_srt: 'Copy SRT',
    asr_copy_json: 'Copy JSON',

    // TTS
    tts_list_voices_title: '1. Query TTS Voices',
    tts_query_btn: 'Query Voices',
    tts_list_voices_desc:
      'Click the button above to query available TTS voices (Click a voice card to fill it into the synthesis form below).',
    tts_generate_title: '2. Generate Speech File',
    tts_text_label: 'Text Content:',
    tts_text_placeholder:
      'Welcome to the Scribis Speech Transcription and AI Voice Synthesis Testing Tool.',
    tts_voice_id_label: 'Voice ID:',
    tts_voice_id_placeholder: "Click 'Query Voices' to load...",
    tts_ref_audio_label: 'Reference audio (optional, Native engine)',
    tts_ref_audio_help: 'Choose an audio sample to synthesize without a Voice ID. Max 20 MiB.',
    alert_tts_ref_engine: 'Select the Native engine to use reference audio.',
    tts_engine_label: 'Engine:',
    tts_lang_label: 'Synthesis Language:',
    tts_generate_btn: 'Generate Speech WAV File',
    tts_generating: 'Synthesizing...',
    tts_result_title: 'Synthesis Successful! Audio Preview:',
    tts_failed_title: 'Synthesis Failed',

    // Avatar
    avatar_generate_title: '3. Create Talking Avatar',
    avatar_image_label: 'Portrait Photo:',
    avatar_audio_label: 'Driving Audio:',
    avatar_dimension_label: 'Maximum Output Dimension:',
    avatar_binary_label: 'Return MP4 Base64 (enable_binary)',
    avatar_generate_help:
      'Choose one portrait photo and one audio file. The browser sends them as Base64; the generated video is returned as a temp path unless Base64 is enabled.',
    avatar_generate_btn: 'Generate Avatar Video',
    avatar_generating: 'Generating avatar video...',
    alert_avatar_inputs: 'Please select one portrait photo and one audio file.',
    alert_avatar_size: 'Photo must be 20 MiB or smaller; audio must be 100 MiB or smaller.',

    // Timeline
    timeline_preview_title: 'Video Frames & Vision Preview',
    timeline_timestamp_label: 'Target Timestamp (sec):',
    timeline_wireframe_label: 'Include UI Wireframe',
    timeline_preview_output: 'Preview Frame Output:',
    timeline_subtitle_title: 'Subtitles & State Queries',
    timeline_get_state: 'Get complete current Timeline data and blocks',
    timeline_get_all: 'Read array of all subtitle segments in the video',
    timeline_get_current: 'Read subtitle corresponding to the current playhead position',
    timeline_get_at_time: 'Query corresponding subtitle based on target timestamp',

    // Raw
    raw_title: 'Free Testing Raw JSON-RPC 2.0',
    raw_send_btn: 'Send JSON-RPC Request (POST /mcp)',

    // Console
    console_title: 'Communication Diagnostics Log',
    console_clear_btn: 'Clear',
    console_ready:
      'Ready. Invoking any MCP tool will log the Request and Response in the real-time console.',
    console_cleared: 'Console cleared.',

    alert_select_file: 'Please select an audio/video file or enter an absolute path',
    alert_tts_empty: 'Please select a Voice ID and enter text content',

    // JS dynamic strings
    active_model: 'Active Model:',
    compatible_models: 'compatible models found',
    models_dir: 'Models Dir:',
    available: '✓ Available',
    default_active: '[Default Active]',
    active_star: '★ Active',

    error: 'Error:',
    full_text: 'Full Text:',
    duration: 'Duration:',
    script_id: 'Script ID:',
    no_subtitles: '(No Subtitle Data)',
    copied_srt: 'SRT subtitles copied to clipboard!',
    copied_json: 'JSON data copied to clipboard!',

    transcribe_err: 'Transcription execution error:',
    cancel_req: 'Cancel transcription request sent:',
    cancel_err: 'Failed to send cancel transcription request:',

    total_voices: 'Total voices found:',
    selected_voice: 'Selected voice:',

    frame_saved: 'Frame saved at:',

    file_selected: 'File selected:',
    file_dropped: 'File dropped:',
    converting_base64: 'Converting to Base64 data...',
    audio_loaded: 'Audio loaded. Press play on audio element if autoplay is paused by browser.',
    invalid_json: 'Invalid JSON or Request Error:',

    large_file_title: 'Large Media File Detected',
    large_file_desc:
      "Browser security restrictions in standard web browsers prevent reading full local directory paths. Please verify or paste the absolute path (e.g. /Users/.../demo.mp4) or click 'Select File' to use the native system dialog.",
    alert_file_too_large_prefix: 'Media file is too large',
    alert_file_too_large_desc:
      'Due to browser security restrictions in Chrome, the full local directory path cannot be auto-detected for large files. Converting this large media file to Base64 in the browser would exceed Mojo IPC limits and crash the tab (Error code 5).',
    alert_file_too_large_example:
      "Please enter the absolute file path (e.g. /Users/username/Downloads/demo.mp4) into the path input, or click 'Select File' to pick the file natively!"
  },
  'zh-TW': {
    title: 'Scribis MCP Web API Tester',
    subtitle: 'Model Context Protocol HTTP Diagnostic Tool',
    server: 'Server:',
    tab_asr: 'ASR 轉錄與模型',
    tab_tts: 'TTS 語音合成',
    tab_timeline: '字幕與時間軸',
    tab_raw: 'JSON-RPC API',

    // ASR
    asr_list_models_title: '1. 列出 ASR 轉錄模型',
    asr_list_models_btn: '查詢模型清單',
    asr_list_models_desc:
      '點擊上方按鈕查詢目前所有安裝之 ASR 模型（Whisper, SenseVoice, Parakeet, QwenASR 等）。',
    asr_transcribe_title: '2. 轉錄音訊/影片檔案',
    asr_file_path_label: '音訊/影片檔案絕對路徑 (Absolute Path):',
    asr_file_path_placeholder: '/Users/username/Downloads/demo.mp4',
    asr_select_file_btn: '選擇檔案',
    asr_drag_drop_text:
      '將音訊/影片拖曳至此，或點擊開啟檔案選擇視窗 (支援 MP4, MOV, M4A, MP3, WAV, AAC 等影音格式)',
    asr_model_label: '選擇模型 (Model):',
    asr_model_placeholder: '請先載入模型 (讀取中...)',
    asr_lang_label: '語言 (Language):',
    asr_lang_auto: 'auto (自動辨識)',
    asr_lang_zh: 'zh (中文)',
    asr_lang_zh_TW: 'zh_TW (繁體中文 Traditional Chinese)',
    asr_lang_zh_CN: 'zh_CN (簡體中文 Simplified Chinese)',
    asr_lang_en: 'en (英文 English)',
    asr_lang_ja: 'ja (日文 Japanese)',
    asr_lang_ko: 'ko (韓文 Korean)',
    asr_lang_de: 'de (德文 German)',
    asr_lang_es: 'es (西班牙文 Spanish)',
    asr_lang_fr: 'fr (法文 French)',
    asr_lang_ru: 'ru (俄文 Russian)',
    asr_lang_pt: 'pt (葡萄牙文 Portuguese)',
    asr_lang_it: 'it (義大利文 Italian)',
    asr_lang_vi: 'vi (越南文 Vietnamese)',
    asr_lang_th: 'th (泰文 Thai)',
    asr_lang_yue: 'yue (粵語 Cantonese)',
    asr_lang_custom: '✏️ 自訂語言碼 (Custom Code...)',
    asr_lang_custom_placeholder: '輸入自訂語言碼 (如 yue, fr-FR)',
    asr_persist_label: '儲存為 Scribis 專案庫字幕',
    asr_start_btn: '開始轉錄',
    asr_cancel_btn: '取消轉錄',
    asr_transcribing: '轉錄處理中...',
    asr_canceling: '取消中...',

    asr_result_title: '轉錄結果 (Transcription Result):',
    asr_tab_summary: '摘要與全文字',
    asr_tab_srt: 'SRT 字幕',
    asr_tab_json: 'JSON Pretty',
    asr_copy_srt: '複製 SRT',
    asr_copy_json: '複製 JSON',

    // TTS
    tts_list_voices_title: '1. 查詢 TTS 發音人',
    tts_query_btn: '查詢發音人',
    tts_list_voices_desc:
      '點擊上方按鈕查詢可用之語音合成發音人（點擊發音人卡片可直接填入下方合成表單）。',
    tts_generate_title: '2. 合成語音檔',
    tts_text_label: '合成文字內容 (Text):',
    tts_text_placeholder: '歡迎使用 Scribis 語音轉錄與 AI 語音合成測試工具。',
    tts_voice_id_label: 'Voice ID:',
    tts_voice_id_placeholder: '請點擊「查詢發音人」載入...',
    tts_ref_audio_label: '參考音訊（選填，使用 Native 引擎）',
    tts_ref_audio_help: '選擇音訊樣本即可不填 Voice ID 合成；檔案上限 20 MiB。',
    alert_tts_ref_engine: '使用參考音訊時，請選擇 Native 引擎。',
    tts_engine_label: 'Engine:',
    tts_lang_label: '合成語言 (Language):',
    tts_generate_btn: '生成語音 WAV 檔',
    tts_generating: '語音合成中...',
    tts_result_title: '合成成功！音訊試聽:',
    tts_failed_title: '語音合成失敗',

    // Avatar
    avatar_generate_title: '3. 生成說話 Avatar 影片',
    avatar_image_label: '人物照片：',
    avatar_audio_label: '驅動音訊：',
    avatar_dimension_label: '影片最大尺寸：',
    avatar_binary_label: '回傳 MP4 Base64（enable_binary）',
    avatar_generate_help:
      '選擇一張人物照片和一段音訊。瀏覽器會以 Base64 傳送；未啟用 Base64 時，影片會回傳暫存檔路徑。',
    avatar_generate_btn: '生成 Avatar 影片',
    avatar_generating: '正在生成 Avatar 影片…',
    alert_avatar_inputs: '請選擇一張人物照片和一段音訊。',
    alert_avatar_size: '照片需小於等於 20 MiB；音訊需小於等於 100 MiB。',

    // Timeline
    timeline_preview_title: '畫面與預覽視覺類 (Video Frames & Vision Preview)',
    timeline_timestamp_label: '目標時間點 (timestamp_sec):',
    timeline_wireframe_label: '包含 UI 調試框',
    timeline_preview_output: 'Preview Frame Output:',
    timeline_subtitle_title: 'Timeline 與字幕查詢類 (Subtitles & State)',
    timeline_get_state: '獲取當前 Timeline 完整數據與區塊',
    timeline_get_all: '讀取全片所有字幕段落陣列',
    timeline_get_current: '讀取當前播放頭位置對應之字幕',
    timeline_get_at_time: '根據目標時間點查詢對應字幕',

    // Raw
    raw_title: '自由測試 Raw JSON-RPC 2.0',
    raw_send_btn: '傳送 JSON-RPC 請求 (POST /mcp)',

    // Console
    console_title: '通訊診斷日誌 (Console Log)',
    console_clear_btn: '清空',
    console_ready: '準備就緒。調用任何 MCP 工具皆會在實時控制項記錄 Request 與 Response。',
    console_cleared: '控制項已清空。',

    alert_select_file: '請選擇音訊/影片檔案或輸入絕對路徑',
    alert_tts_empty: '請填入文字，並選擇 Voice ID 或參考音訊。',

    // JS dynamic strings
    active_model: 'Active Model:',
    compatible_models: '個相容模型',
    models_dir: 'Models Dir:',
    available: '✓ 可用',
    default_active: '[預設 Active]',
    active_star: '★ Active',

    error: 'Error:',
    full_text: 'Full Text:',
    duration: 'Duration:',
    script_id: 'Script ID:',
    no_subtitles: '（無字幕數據）',
    copied_srt: '已複製 SRT 字幕至剪貼簿！',
    copied_json: '已複製 JSON 數據至剪貼簿！',

    transcribe_err: '轉錄執行錯誤:',
    cancel_req: '已發送取消轉錄請求:',
    cancel_err: '取消轉錄請求失敗:',

    total_voices: '共找到',
    selected_voice: 'Selected voice:',

    frame_saved: 'Frame saved at:',

    file_selected: '已選擇檔案:',
    file_dropped: '已拖曳檔案:',
    converting_base64: '正在轉換為 Base64 數據...',
    audio_loaded: 'Audio loaded. Press play on audio element if autoplay is paused by browser.',
    invalid_json: 'Invalid JSON or Request Error:',

    large_file_title: '偵測到大型影音檔案',
    large_file_desc:
      '瀏覽器安全機制限制直接讀取本機完整路徑。請在上方欄位確認或輸入絕對路徑，或點擊「選擇檔案」透過系統原生對話框選取。',
    alert_file_too_large_prefix: '影音檔案過大',
    alert_file_too_large_desc:
      '因 Chrome 瀏覽器安全限制，無法自動偵測本機完整目錄路徑。將此大型檔案轉為 Base64 會超出瀏覽器 Mojo IPC 傳輸限制並造成分頁崩潰 (Error code 5)。',
    alert_file_too_large_example:
      '請直接在路徑欄位輸入本機絕對路徑（例如：/Users/username/Downloads/demo.mp4）或點擊「選擇檔案」透過原生視窗選取！'
  }
};
