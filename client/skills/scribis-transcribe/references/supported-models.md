# Scribis List Models Reference (`scribis models` / `list_models`)

This document details how to query available, installed, and default Speech-to-Text (ASR) models using Scribis CLI or MCP tools, along with the full specification of supported model families.

---

## 1. CLI Command: `scribis models`

The `scribis models` command inspects the connected Scribis Desktop application to list all supported ASR models, their installation state (`[Installed]` vs `[Not Installed]`), the active default model, and the local models directory path.

### Standard Stdio Mode:

```bash
scribis models
```

### MCP HTTP Mode:

```bash
scribis models --mcp
```

### Example Terminal Output:

```text
=== Scribis ASR Models ===
Active Default Model: base
Models Directory:     /Users/username/Library/Application Support/scribis/models

Installed Models:
 - tiny                      [Installed]
 - base                      [Installed] (Active Default)
 - small                     [Not Installed]
 - medium                    [Not Installed]
 - large-v2                  [Not Installed]
 - large-v3                  [Installed]
 - large-v3-turbo            [Not Installed]
 - distil-large-v3           [Not Installed]
 - sense-voice-small-q8_0    [Installed]
 - parakeet-tdt-v3-int8      [Not Installed]
 - qwen3-asr-0.6b            [Not Installed]
```

---

## 2. MCP Tool: `list_models`

When communicating directly via MCP Host (Claude Code, Cursor, Antigravity, etc.), invoke the `list_models` tool.

### Arguments:

None (`{}`)

### JSON Output Schema & Response Example:

```json
{
  "active_model": "base",
  "models_dir": "/Users/username/Library/Application Support/scribis/models",
  "models": [
    {
      "id": "tiny",
      "installed": true,
      "active": false
    },
    {
      "id": "base",
      "installed": true,
      "active": true
    },
    {
      "id": "small",
      "installed": false,
      "active": false
    },
    {
      "id": "medium",
      "installed": false,
      "active": false
    },
    {
      "id": "large-v2",
      "installed": false,
      "active": false
    },
    {
      "id": "large-v3",
      "installed": true,
      "active": false
    },
    {
      "id": "large-v3-turbo",
      "installed": false,
      "active": false
    },
    {
      "id": "distil-large-v3",
      "installed": false,
      "active": false
    },
    {
      "id": "sense-voice-small-q8_0",
      "installed": true,
      "active": false
    },
    {
      "id": "parakeet-tdt-v3-int8",
      "installed": false,
      "active": false
    },
    {
      "id": "qwen3-asr-0.6b",
      "installed": false,
      "active": false
    }
  ]
}
```

---
