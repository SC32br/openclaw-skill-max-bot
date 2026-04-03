# 🤖 openclaw-max-bot

<div align="center">

![MAX Messenger](https://img.shields.io/badge/MAX-messenger-blue?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTIgMkM2LjQ3NyAyIDIgNi40NzcgMiAxMnM0LjQ3NyAxMCAxMCAxMCAxMC00LjQ3NyAxMC0xMFMxNy41MjMgMiAxMiAyeiIgZmlsbD0id2hpdGUiLz48L3N2Zz4=)
![OpenClaw](https://img.shields.io/badge/OpenClaw-plugin-orange?style=for-the-badge)
![Node.js](https://img.shields.io/badge/Node.js-18+-green?style=for-the-badge&logo=node.js)
![License](https://img.shields.io/badge/license-MIT-brightgreen?style=for-the-badge)
![Whisper](https://img.shields.io/badge/Whisper-voice_STT-yellow?style=for-the-badge)

**Production-ready OpenClaw plugin for MAX messenger (max.ru)**

*Voice messages · Typing indicators · Channel publishing · Allowlist security*

[Quick Start](#-quick-start) · [Configuration](#-configuration) · [Voice Messages](#-voice-messages) · [API Reference](#-api-reference)

</div>

---

## ✨ Features

- 🎤 **Voice-to-Text** — Automatically transcribes voice messages via local [Whisper](https://github.com/openai/whisper) (no external API, works offline)
- ✍️ **Typing Indicator** — Shows "typing..." in real-time while the agent generates a response
- 👁️ **Read Receipts** — Sends `mark_seen` (double checkmark) immediately on message receive
- 📢 **Channel Publishing** — Post to MAX public/private channels via API
- 🔒 **Allowlist Security** — Only approved MAX user IDs can interact with the bot
- 🔄 **Long Polling** — Reliable message delivery, no webhook server required
- ⚡ **Zero Dependencies** — Pure Node.js plugin, no extra packages needed

---

## 🏗️ Architecture

```
User (MAX app)
  │
  ▼ voice / text message
MAX API (platform-api.max.ru)
  │
  ▼ long polling
openclaw-max-channel plugin
  │
  ├─► 🎤 Whisper STT (voice only)
  │
  ▼
OpenClaw Agent (Claude / GPT / etc.)
  │
  ├─► ✍️ typing_on pulse (every 4.5s)
  │
  ▼
sendMessage → User
```

---

## 🚀 Quick Start

### Prerequisites

- **OpenClaw** gateway running on Linux/macOS server
- **MAX bot** registered at [business.max.ru](https://business.max.ru/self) *(requires Russian legal entity or sole proprietor)*
- **Node.js** 18+
- **Whisper** for voice support: `pip install openai-whisper`

### 1. Copy plugin to your workspace

```bash
cp -r plugins/openclaw-max-channel /your/workspace/plugins/
```

### 2. Configure `openclaw.json`

```json
{
  "plugins": {
    "allow": ["openclaw-max-channel"],
    "load": {
      "paths": ["./plugins/openclaw-max-channel"]
    },
    "entries": {
      "openclaw-max-channel": {
        "enabled": true,
        "config": {
          "max": {
            "token": "${MAX_TOKEN}",
            "allowFrom": ["your_max_user_id"],
            "dmPolicy": "allowlist",
            "whisperModel": "small",
            "whisperLanguage": "ru"
          }
        }
      }
    }
  }
}
```

### 3. Set token & restart

```bash
export MAX_TOKEN="your_bot_token_here"
openclaw gateway restart
```

### 4. Test it

Send a message to your bot in MAX — the agent responds.
Send a voice note — it gets transcribed and processed automatically. 🎉

---

## ⚙️ Configuration

| Field | Default | Description |
|-------|---------|-------------|
| `token` | **required** | MAX bot token from business.max.ru |
| `allowFrom` | `[]` | Allowed MAX user IDs (whitelist) |
| `dmPolicy` | `"allowlist"` | `"allowlist"` or `"open"` |
| `whisperBin` | `"whisper"` | Path to Whisper binary |
| `whisperModel` | `"base"` | Whisper model: `tiny` / `base` / `small` / `medium` |
| `whisperLanguage` | `"ru"` | Language code or `"auto"` |

### Finding your MAX User ID

MAX user IDs are internal (different from Telegram IDs).

```bash
# After sending a message to the bot, check OpenClaw logs:
openclaw gateway logs | grep "Inbound from"
# → [MAX] Inbound from 7445093: hello
```

---

## 🎤 Voice Messages

Voice transcription pipeline:

```
1. User sends voice note
2. Plugin detects audio/voice attachment
3. Shows 🎤 indicator (sending_audio)
4. Downloads file from MAX API
5. Runs Whisper locally → text
6. Sends transcribed text to agent
7. Agent replies with typing indicator
```

### Choosing a Whisper model

| Model | Size | RAM needed | Quality |
|-------|------|-----------|---------|
| `tiny` | 22 MB | ~1 GB | Low |
| `base` | 139 MB | ~1 GB | OK |
| `small` | 462 MB | ~2 GB | **Good ← recommended** |
| `medium` | 1.5 GB | ~5 GB | Excellent |

---

## 🛠️ Utility Script

Send messages programmatically via `scripts/max_send.py`:

```bash
# Send a message
python3 scripts/max_send.py --token $MAX_TOKEN --chat CHAT_ID --text "Hello!"

# With typing indicator
python3 scripts/max_send.py --token $MAX_TOKEN --chat CHAT_ID --text "Hello!" --typing

# Check bot identity
python3 scripts/max_send.py --token $MAX_TOKEN --chat x --text x --whoami

# Use env var for token
export MAX_TOKEN="your_token"
python3 scripts/max_send.py --chat CHAT_ID --text "Hello from script!"
```

---

## 📡 API Reference

Key MAX API endpoints used by this plugin:

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/me` | Get bot info |
| `GET` | `/updates` | Long polling for new messages |
| `POST` | `/messages` | Send message to chat/channel |
| `POST` | `/chats/{id}/actions` | Send typing / seen indicator |
| `GET` | `/files/{token}` | Download media attachment |

Full reference: [dev.max.ru/docs-api](https://dev.max.ru/docs-api)

---

## 📂 Repository Structure

```
openclaw-max-bot/
├── 📄 SKILL.md                  ← OpenClaw skill instructions
├── 📄 README.md                 ← This file
├── 📄 README.user.md            ← User-facing guide
├── plugins/
│   └── openclaw-max-channel/
│       ├── index.js             ← Main plugin (long polling, voice, typing)
│       ├── package.json
│       └── openclaw.plugin.json
├── references/
│   ├── api.md                   ← MAX API quick reference
│   └── channel.md               ← Channel setup & content strategy
└── scripts/
    └── max_send.py              ← CLI utility for sending messages
```

---

## 🔗 Links

- [MAX for Developers](https://dev.max.ru/docs)
- [MAX API Reference](https://dev.max.ru/docs-api)
- [MAX Business Platform](https://business.max.ru/self)
- [OpenClaw](https://openclaw.ai)
- [Whisper by OpenAI](https://github.com/openai/whisper)
- [ClawHub Skills Registry](https://clawhub.ai)

---

## 📄 License

MIT © 2026
