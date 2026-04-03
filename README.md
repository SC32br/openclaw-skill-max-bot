<div align="center">

<img src="assets/banner.png" alt="MAX Bot Skill" width="100%" />

# 🤖 openclaw-skill-max-bot

**Connect your OpenClaw AI agent to MAX messenger — Russia's fastest-growing platform with 85M users**

[![OpenClaw Skill](https://img.shields.io/badge/OpenClaw-Skill-6c47ff?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTIgMkM2LjQ4IDIgMiA2LjQ4IDIgMTJzNC40OCAxMCAxMCAxMCAxMC00LjQ4IDEwLTEwUzE3LjUyIDIgMTIgMnoiIGZpbGw9IndoaXRlIi8+PC9zdmc+)](https://openclaw.ai)
[![MAX Platform](https://img.shields.io/badge/MAX-platform--api.max.ru-0077ff?style=for-the-badge)](https://dev.max.ru/docs)
[![Whisper](https://img.shields.io/badge/Whisper-Voice%20AI-green?style=for-the-badge)](https://github.com/openai/whisper)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](LICENSE)
[![Language](https://img.shields.io/badge/Language-Russian%20%2B%20English-red?style=for-the-badge)](#)

---

**Voice messages → Whisper → AI reply • Typing indicator • Channel publishing • Allowlist security**

[🚀 Quick Start](#quick-start) · [📖 Full Docs](#full-documentation) · [🎤 Voice Setup](#voice-messages) · [📢 Channels](#channel-publishing) · [🛠 Troubleshooting](#troubleshooting)

</div>

---

## What is MAX?

**MAX** (max.ru) is a Russian messenger by VK/Mail.ru — 85M users, rapidly growing in 2025-2026. It supports bots, channels, mini-apps, and has a developer API similar to Telegram but with **better organic reach** for Russian-speaking audiences.

> 💡 For Russian businesses: subscriber acquisition cost on MAX is **3x cheaper** than Telegram, with algorithmic recommendations (not just chronological feed).

---

## What This Skill Does

| Feature | Description |
|---------|-------------|
| 🤖 **Full bot integration** | Your OpenClaw agent responds to messages in MAX personal chats |
| 🎤 **Voice transcription** | Voice notes → local Whisper → text → agent. No API key, no cost |
| ✍️ **Typing indicator** | Shows `typing...` in MAX while agent generates response |
| 👁️ **Read receipts** | Marks messages as seen instantly (`mark_seen`) |
| 📢 **Channel publishing** | Post to MAX channels via API (text, photos, videos) |
| 🔒 **Allowlist security** | Only approved MAX user IDs can access the bot |
| 🎛️ **Inline keyboards** | Buttons and callback handlers |
| 📎 **File attachments** | Receive and process images, documents, audio |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        User (MAX app)                           │
│                     sends text / voice                          │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              MAX API   platform-api.max.ru                      │
│                     Long Polling                                │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│           openclaw-max-channel  plugin                          │
│                                                                 │
│   ┌─────────────┐    ┌──────────────┐    ┌─────────────────┐   │
│   │  Attachment │───▶│    Whisper   │───▶│  Transcribed    │   │
│   │  Detector   │    │  local STT   │    │  Text           │   │
│   └─────────────┘    └──────────────┘    └────────┬────────┘   │
│                                                    │            │
│   ┌─────────────┐                        ┌────────▼────────┐   │
│   │  typing_on  │◀───────────────────────│  OpenClaw       │   │
│   │  every 4.5s │                        │  Agent          │   │
│   └─────────────┘                        └────────┬────────┘   │
│                                                    │            │
│                                          ┌────────▼────────┐   │
│                                          │  sendMessage    │   │
│                                          │  reply to user  │   │
│                                          └─────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Requirements

- ✅ **OpenClaw** gateway running (Linux/macOS server)
- ✅ **MAX bot** registered at [business.max.ru](https://business.max.ru/self)
  - ⚠️ Requires Russian legal entity (юрлицо) or sole proprietor (ИП РФ)
- ✅ **Node.js 18+** on the server
- ✅ **Whisper** (optional, for voice): `pip install openai-whisper`

---

## Quick Start

### Step 1 — Register your MAX bot

1. Go to **[business.max.ru/self](https://business.max.ru/self)** → verify your organization
2. Navigate to **Чат-боты → Создать**
3. Fill in name, description, avatar
4. Wait for moderation (typically a few hours)
5. After approval: **Чат-боты → Интеграция → Получить токен**
6. Copy the token — store it securely

### Step 2 — Install the plugin

```bash
# Clone this repo into your OpenClaw workspace
cd ~/agents-workspace/plugins
git clone https://github.com/SC32br/openclaw-skill-max-bot openclaw-max-channel
```

### Step 3 — Configure openclaw.json

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
            "allowFrom": ["YOUR_MAX_USER_ID"],
            "dmPolicy": "allowlist",
            "whisperBin": "whisper",
            "whisperModel": "small",
            "whisperLanguage": "ru"
          }
        }
      }
    }
  }
}
```

### Step 4 — Set token and restart

```bash
# Add to your .env file
echo 'MAX_TOKEN=your_token_here' >> ~/.openclaw/.env

# Restart gateway
openclaw gateway restart
```

### Step 5 — Find your MAX user ID

Send any message to your bot in MAX, then check logs:

```bash
openclaw gateway logs | grep "MAX.*Inbound"
# Output: [MAX] Inbound from 12345678 — add this to allowFrom
```

### Step 6 — Test it

Send a text message → agent responds ✅  
Send a voice note → transcribed automatically → agent responds ✅

---

## Full Documentation

### Config Reference

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `token` | string | **required** | MAX bot token from business.max.ru |
| `allowFrom` | string[] | `[]` | Allowed MAX user IDs (internal, not Telegram!) |
| `dmPolicy` | string | `"allowlist"` | `"allowlist"` — only listed users; `"open"` — anyone |
| `whisperBin` | string | `"whisper"` | Path to Whisper binary |
| `whisperModel` | string | `"base"` | Model: tiny / base / small / medium |
| `whisperLanguage` | string | `"ru"` | Language code or `"auto"` |

---

## Voice Messages

Voice transcription works out of the box — no external API needed.

```
User sends 🎤 voice note
    ↓
Plugin detects audio/voice attachment
    ↓
Shows 🎤 sending_audio indicator in MAX
    ↓
Downloads audio file from MAX CDN
    ↓
Runs: whisper audio.ogg --model small --language ru
    ↓
Sends transcribed text to OpenClaw agent
    ↓
Agent generates response
    ↓
Shows ✍️ typing_on (every 4.5s)
    ↓
Sends reply to user
```

### Choosing a Whisper Model

| Model | Size | RAM | Speed | Quality | Best for |
|-------|------|-----|-------|---------|----------|
| `tiny` | 22 MB | ~1 GB | ⚡⚡⚡ | ★★☆☆☆ | Weak servers |
| `base` | 139 MB | ~1 GB | ⚡⚡⚡ | ★★★☆☆ | Default |
| `small` | 462 MB | ~2 GB | ⚡⚡ | ★★★★☆ | **Recommended** |
| `medium` | 1.5 GB | ~5 GB | ⚡ | ★★★★★ | High-end servers |

```bash
# Install Whisper
pip install openai-whisper

# Test manually
whisper audio.ogg --model small --language ru
```

---

## Channel Publishing

Post to MAX channels via API directly:

```bash
# Post text
python3 scripts/max_send.py \
  --token "$MAX_TOKEN" \
  --chat CHANNEL_ID \
  --text "Your post content here 🚀"

# Post with typing indicator first
python3 scripts/max_send.py \
  --chat CHANNEL_ID \
  --text "New arrivals dropped! 🔥" \
  --typing

# Check bot identity
python3 scripts/max_send.py \
  --chat 0 --text x \
  --whoami
```

Or via curl:

```bash
# Text post
curl -X POST "https://platform-api.max.ru/messages?chat_id=CHANNEL_ID" \
  -H "Authorization: $MAX_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"text": "Post content"}'

# With image
curl -X POST "https://platform-api.max.ru/messages?chat_id=CHANNEL_ID" \
  -H "Authorization: $MAX_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Caption",
    "attachments": [{"type": "image", "payload": {"url": "https://..."}}]
  }'
```

---

## Inline Keyboards

```json
{
  "text": "Choose an option:",
  "attachments": [{
    "type": "inline_keyboard",
    "payload": {
      "buttons": [[
        {"type": "callback", "text": "✅ Yes", "payload": "yes"},
        {"type": "callback", "text": "❌ No", "payload": "no"}
      ],[
        {"type": "link", "text": "🌐 Open site", "url": "https://example.com"}
      ]]
    }
  }]
}
```

Button types: `callback` · `link` · `request_contact` · `request_geo_location` · `open_app`

---

## Typing Indicator

The plugin handles typing automatically while the agent generates a response:

1. `mark_seen` — sent immediately (shows double checkmark)
2. `typing_on` — sent every **4.5 seconds** in a loop
3. Auto-stops when reply is sent

No extra configuration needed.

---

## Finding MAX User IDs

MAX user IDs are **internal** — different from Telegram IDs.

**Method 1 — Logs:**
```bash
openclaw gateway logs | grep "Inbound"
# [MAX] Inbound from 15963859 — Дарья
```

**Method 2 — incoming update:**
```json
{
  "update_type": "message_created",
  "message": {
    "sender": {
      "user_id": 15963859,
      "name": "Дарья"
    }
  }
}
```

**Method 3 — ask them to send `/start` to the bot**, then check logs.

---

## Troubleshooting

**Bot not responding:**
```bash
openclaw gateway status        # Is gateway running?
openclaw gateway logs | grep MAX  # Look for errors
curl https://platform-api.max.ru/me -H "Authorization: $MAX_TOKEN"  # Token valid?
```
→ Check `allowFrom` contains the correct MAX user ID

**Voice not working:**
```bash
which whisper              # Is it installed?
whisper --version          # Check version
whisper test.ogg --model small --language ru  # Test manually
```
→ Check logs for `[MAX] voice attachment failed:`

**401 Unauthorized:**
→ Token is invalid or expired. Get a new one from business.max.ru

**"Unknown recipient" error:**
→ Use `?user_id=ID` query parameter, not request body

**Rate limit (429):**
→ MAX API limit is 30 rps. Plugin uses long polling (20s timeout) — safe by default

---

## File Structure

```
openclaw-skill-max-bot/
├── SKILL.md                    # OpenClaw skill descriptor
├── README.md                   # This file
├── scripts/
│   └── max_send.py             # CLI tool: send messages via MAX API
├── references/
│   ├── api.md                  # MAX Bot API quick reference
│   └── channel.md              # Channel setup & content strategy
├── examples/
│   ├── config-minimal.json     # Minimal openclaw.json config
│   └── config-full.json        # Full config with all options
└── assets/
    └── banner.png              # Repository banner
```

---

## Links

| Resource | URL |
|----------|-----|
| MAX for Developers | https://dev.max.ru/docs |
| MAX API Reference | https://dev.max.ru/docs-api |
| MAX Business Platform | https://business.max.ru/self |
| OpenClaw | https://openclaw.ai |
| OpenClaw Docs | https://docs.openclaw.ai |
| Whisper (OpenAI) | https://github.com/openai/whisper |

---

## License

MIT © 2026

---

<div align="center">

Made with ❤️ for the OpenClaw community

**[⭐ Star this repo](https://github.com/SC32br/openclaw-skill-max-bot)** if it helped you!

</div>
