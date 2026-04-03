---
name: max-bot
description: Full integration with MAX messenger (max.ru) via OpenClaw plugin. Use when you need to: connect a MAX bot to an OpenClaw agent, handle text and voice messages, show typing indicators, publish to MAX channels, configure allowlists, or set up the openclaw-max-channel plugin from scratch. Triggers on: MAX, max.ru, MAX bot, MAX channel, MAX plugin, голосовые MAX, typing MAX, openclaw-max-channel.
---

# MAX Bot — OpenClaw Plugin (Auto-installer)

MAX messenger (max.ru) — Russian messenger by VK/Mail.ru, 85M+ users.  
This skill covers the **full automated setup**: bot registration, plugin install, voice transcription via Whisper, typing indicators, and channel publishing.

---

## ⚠️ Important Prerequisites

> **MAX bot registration requires a Russian legal entity (юрлицо) or sole proprietor (ИП).**  
> Individual accounts cannot register bots on MAX.  
> Register at: [business.max.ru](https://business.max.ru/self)

---

## 🤖 Auto-Installation (for AI agent)

When user says "подключи MAX бот" or "setup MAX bot", follow these steps in order:

### Step 1 — Clone the plugin repository

```bash
git clone https://github.com/SC32br/openclaw-skill-max-bot ~/agents-workspace/plugins/openclaw-max-channel --depth=1 && cp -r ~/agents-workspace/plugins/openclaw-max-channel/plugins/openclaw-max-channel ~/agents-workspace/plugins/
```

### Step 2 — Install plugin dependencies

```bash
cd ~/agents-workspace/plugins/openclaw-max-channel && npm install
```

### Step 3 — Ask the user for their MAX bot token

Ask the user:
> "Перейди на business.max.ru → Чат-боты → [твой бот] → Интеграция → Токен.  
> Скопируй токен и пришли мне."

Wait for the token before proceeding.

### Step 4 — Add token to environment file

```bash
echo "MAX_TOKEN=<token_from_user>" >> ~/.openclaw/.env
```

Replace `<token_from_user>` with the actual token provided.

### Step 5 — Update openclaw.json

Read the current `~/.openclaw/openclaw.json` and add:

**In `plugins.allow`** — add `"openclaw-max-channel"`

**In `plugins.load.paths`** — add `"./plugins/openclaw-max-channel"`

**In `plugins.entries`** — add:
```json
"openclaw-max-channel": {
  "enabled": true,
  "config": {
    "max": {
      "token": "${MAX_TOKEN}",
      "allowFrom": [],
      "dmPolicy": "allowlist",
      "whisperBin": "whisper",
      "whisperModel": "small",
      "whisperLanguage": "ru"
    }
  }
}
```

### Step 6 — Restart OpenClaw gateway

```bash
openclaw gateway restart
```

### Step 7 — Get the user's MAX user_id

Tell the user:
> "Теперь отправь **любое сообщение** своему MAX боту в приложении MAX.  
> Я покажу тебе твой MAX user_id для allowlist."

After they confirm they sent a message, run:

```bash
openclaw gateway logs | grep -E "Inbound|user_id" | tail -5
```

Extract the user_id from the log line like:  
`[MAX] Inbound from 12345678 — text: "hello"`  
The number after "from" is the MAX user_id.

> ⚠️ **MAX user_id ≠ Telegram user_id.** They are completely different numbers.  
> MAX user_id can only be found from actual bot interaction logs.

### Step 8 — Add user_id to allowlist

Update `~/.openclaw/openclaw.json` — set:
```json
"allowFrom": ["<max_user_id>"]
```

### Step 9 — Restart gateway again

```bash
openclaw gateway restart
```

### Step 10 — Confirm success

Tell the user:
> "✅ MAX бот подключён! Отправь любое сообщение своему MAX боту — агент ответит."

---

## 🎤 Voice Messages

Voice transcription works via local Whisper. No API key needed.

**If voice messages don't work**, install Whisper:
```bash
pip install openai-whisper
```

**Check Whisper is installed:**
```bash
whisper --help
```

**Whisper models** (set via `whisperModel` in config):
| Model | RAM | Quality |
|-------|-----|---------|
| tiny | ~1 GB | Low (fast) |
| base | ~1 GB | OK |
| small | ~2 GB | Good ← recommended |
| medium | ~5 GB | Excellent |

---

## 📢 Publishing to MAX Channels

Use `scripts/max_send.py` to publish to a MAX channel:

```bash
python3 scripts/max_send.py --chat <CHANNEL_ID> --text "Your message" --token $MAX_BOT_TOKEN
```

Find your channel's chat_id:
```bash
curl -sS -H "Authorization: Bearer $MAX_TOKEN" https://platform-api.max.ru/chats
```

---

## 🔧 Configuration Reference

| Parameter | Type | Description |
|-----------|------|-------------|
| `token` | string | MAX bot token (use `${MAX_TOKEN}` env var) |
| `allowFrom` | array | List of MAX user_ids allowed to chat |
| `dmPolicy` | string | `"allowlist"` = only allowed users; `"open"` = everyone |
| `whisperBin` | string | Path to whisper binary (default: `"whisper"`) |
| `whisperModel` | string | Model size: tiny/base/small/medium (default: `"small"`) |
| `whisperLanguage` | string | Language code (default: `"ru"`) |

---

## 🏗️ Architecture

```
User (MAX app)
  → MAX API (platform-api.max.ru)
    → Long Polling (openclaw-max-channel plugin)
      → Whisper (voice → text, optional)
        → OpenClaw agent
          → typing_on pulse (every 4.5s while thinking)
            → sendMessage reply → User
```

---

## 🔗 Links

- MAX Developers: https://dev.max.ru/docs
- MAX API Reference: https://dev.max.ru/docs-api
- MAX Business Portal: https://business.max.ru/self
- Plugin source: https://github.com/SC32br/openclaw-skill-max-bot
