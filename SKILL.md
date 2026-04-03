---
name: max-bot
description: Full integration with MAX messenger (max.ru) via OpenClaw plugin. Use when you need to: connect a MAX bot to an OpenClaw agent, handle text and voice messages, show typing indicators, publish to MAX channels, configure allowlists, or set up the openclaw-max-channel plugin from scratch. Triggers on: MAX, max.ru, MAX bot, MAX channel, MAX plugin, голосовые MAX, typing MAX, openclaw-max-channel.
---

# MAX Bot — OpenClaw Plugin

MAX messenger (max.ru) — Russian messenger by VK/Mail.ru, 85M users. This skill covers the full production setup: bot registration, OpenClaw plugin install, voice message transcription via Whisper, typing indicators, and channel publishing.

## Architecture

```
User (MAX app)
  → MAX API (platform-api.max.ru)
    → Long Polling (openclaw-max-channel plugin)
      → Whisper (voice → text)
        → OpenClaw agent
          → typing_on pulse (every 4.5s while thinking)
            → sendMessage reply
```

## Quick Setup

### 1. Prerequisites
- Legal entity or sole proprietor registered in Russia (юрлицо/ИП РФ)
- Verified organization on [business.max.ru](https://business.max.ru/self)
- Node.js 18+ on the server

### 2. Register Bot & Get Token
1. Go to business.max.ru → Чат-боты → Создать
2. Fill in name, avatar, description
3. Wait for moderation (usually a few hours)
4. After approval: Чат-боты → Интеграция → Получить токен
5. Save token — treat it like a password

### 3. Install the Plugin
```bash
cp -r plugins/openclaw-max-channel /your/workspace/plugins/
```

### 4. Configure openclaw.json
```json
{
  "plugins": {
    "allow": ["openclaw-max-channel"],
    "load": { "paths": ["./plugins/openclaw-max-channel"] },
    "entries": {
      "openclaw-max-channel": {
        "enabled": true,
        "config": {
          "max": {
            "token": "${MAX_TOKEN}",
            "allowFrom": ["<user_id_in_MAX>"],
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

### 5. Set Environment Variable
```bash
export MAX_TOKEN="your_token_here"
# or add to .env file
```

### 6. Restart OpenClaw
```bash
openclaw gateway restart
```

## Voice Messages

Voice transcription is built-in. When a user sends a voice message:
1. Plugin detects `audio`, `voice`, or audio-extension `file` attachment
2. Sends `sending_audio` chat action (shows microphone indicator)
3. Downloads file from MAX API (tries direct URL, then `/files/{token}`)
4. Runs Whisper locally: `whisper audio.ogg --model small --language ru`
5. Injects transcribed text into agent as if user typed it
6. If transcription fails → sends fallback message to user

### Whisper Models (choose by server RAM)
| Model | Size | RAM | Quality |
|-------|------|-----|---------|
| tiny | 22 MB | ~1 GB | Low |
| base | 139 MB | ~1 GB | OK |
| small | 462 MB | ~2 GB | Good ← recommended |
| medium | 1.5 GB | ~5 GB | Excellent |

Configure in openclaw.json: `"whisperModel": "small"`

## Typing Indicator

While the agent is generating a response:
- Sends `mark_seen` immediately (double checkmark)
- Sends `typing_on` every **4.5 seconds** in a loop
- Stops automatically when reply is sent

This is handled automatically — no code needed.

## Config Reference

| Field | Default | Description |
|-------|---------|-------------|
| `token` | required | MAX bot token from business.max.ru |
| `allowFrom` | `[]` | Allowed MAX user IDs (internal MAX ids, not Telegram) |
| `dmPolicy` | `"allowlist"` | `"allowlist"` or `"open"` |
| `whisperBin` | `"whisper"` | Path to whisper binary |
| `whisperModel` | `"base"` | Whisper model size |
| `whisperLanguage` | `"ru"` | Language code or `"auto"` |

## Finding User IDs in MAX

MAX user IDs are internal (not Telegram IDs). To find someone's MAX ID:
- Check the `sender.user_id` field in incoming updates
- Look in OpenClaw logs: `[MAX] Inbound from <ID>`
- Or send a test message and read the log

## Channel Publishing

To post to a MAX channel via API:
```bash
curl -X POST "https://platform-api.max.ru/messages?chat_id=<channel_id>" \
  -H "Authorization: <token>" \
  -H "Content-Type: application/json" \
  -d '{"text": "Post content here"}'
```

See `references/api.md` for full API reference.
See `references/channel.md` for channel setup and content strategy.

## Troubleshooting

**Bot not responding:**
- Check token is set: `openclaw gateway status`
- Check logs for `[MAX] Connected as @...`
- Verify user ID is in `allowFrom`

**Voice not working:**
- Check `whisper` is installed: `which whisper`
- Test manually: `whisper test.ogg --model small --language ru`
- Check logs for `[MAX] voice attachment failed:`

**Rate limit:**
- MAX API limit: 30 rps
- Plugin uses long polling with 20s timeout — safe by default
