# MAX Bot — OpenClaw Skill

Connect your OpenClaw AI agent to **MAX messenger** (max.ru) — Russia's fast-growing messenger by VK/Mail.ru with 85M users.

## What it does

- 🤖 **Full bot integration** — your OpenClaw agent responds to messages in MAX
- 🎤 **Voice messages** — automatically transcribed via local Whisper (no API key needed)
- ✍️ **Typing indicator** — shows "typing..." while agent is thinking
- 📢 **Channel publishing** — post to MAX channels via API
- 🔒 **Allowlist security** — only approved user IDs can talk to the bot

## Requirements

- OpenClaw gateway running on a server (Linux/macOS)
- MAX bot registered at [business.max.ru](https://business.max.ru/self) (requires Russian legal entity/IP)
- [Whisper](https://github.com/openai/whisper) installed for voice support: `pip install openai-whisper`

## Quick Start

### 1. Install the plugin
```bash
# Copy plugin to your workspace
cp -r plugins/openclaw-max-channel /your/workspace/plugins/
```

### 2. Add to openclaw.json
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

### 3. Set token and restart
```bash
export MAX_TOKEN="your_bot_token"
openclaw gateway restart
```

### 4. Test
Send a message to your bot in MAX — the agent will respond.
Send a voice message — it will be transcribed and processed automatically.

## Commands & Examples

| What you want | How |
|--------------|-----|
| Send message to MAX chat | `python3 scripts/max_send.py --chat CHAT_ID --text "Hello"` |
| Show typing first | `python3 scripts/max_send.py --chat ID --text "..." --typing` |
| Check bot identity | `python3 scripts/max_send.py --chat x --text x --whoami` |

## How Voice Messages Work

```
User sends voice note
  → Plugin detects audio attachment
  → Shows 🎤 indicator in MAX
  → Downloads audio file
  → Runs: whisper audio.ogg --model small --language ru
  → Sends transcribed text to OpenClaw agent
  → Agent responds
  → Shows ✍️ typing while generating
  → Sends reply to user
```

## Finding Your MAX User ID

Your MAX user ID (internal, not Telegram):
1. Send any message to the bot
2. Check OpenClaw logs: `[MAX] Inbound from <ID>`
3. Add that ID to `allowFrom` in config

## Whisper Model Guide

| Model | File Size | RAM | Best for |
|-------|-----------|-----|----------|
| tiny | 22 MB | ~1 GB | Fast servers, low quality |
| base | 139 MB | ~1 GB | Balanced |
| small | 462 MB | ~2 GB | **Recommended** |
| medium | 1.5 GB | ~5 GB | High quality, powerful server |

## Links

- MAX for Developers: https://dev.max.ru/docs
- MAX API Reference: https://dev.max.ru/docs-api
- MAX Business Platform: https://business.max.ru/self
- Whisper: https://github.com/openai/whisper
- OpenClaw: https://openclaw.ai

## License

MIT
