[![OpenClaw Skill](https://img.shields.io/badge/OpenClaw-Skill-6c47ff?style=for-the-badge)](https://openclaw.ai)
[![MAX Platform](https://img.shields.io/badge/MAX-platform--api.max.ru-0077ff?style=for-the-badge)](https://dev.max.ru/docs)
[![Whisper](https://img.shields.io/badge/Whisper-Voice%20AI-green?style=for-the-badge)](https://github.com/openai/whisper)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](LICENSE)

# openclaw-skill-max-bot

**Connect your OpenClaw AI agent to MAX messenger** (max.ru) — Russia's fast-growing messenger by VK/Mail.ru with 85M+ users.  
Full integration: Long Polling, voice transcription via Whisper, typing indicators, channel publishing, and allowlist security.  
Say `"подключи MAX бот"` — and the agent sets everything up automatically.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      MAX Messenger App                      │
│                    (User writes/speaks)                     │
└──────────────────────────┬──────────────────────────────────┘
                           │  HTTPS
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              MAX API  (platform-api.max.ru)                 │
│                  Long Polling endpoint                      │
└──────────────────────────┬──────────────────────────────────┘
                           │  JSON events
                           ▼
┌─────────────────────────────────────────────────────────────┐
│          openclaw-max-channel  (Node.js plugin)             │
│  ┌──────────────┐  ┌───────────────┐  ┌─────────────────┐  │
│  │ Long Polling │  │ Whisper voice │  │ Typing indicator│  │
│  │   loop       │  │ transcription │  │ pulse (4.5s)    │  │
│  └──────────────┘  └───────────────┘  └─────────────────┘  │
└──────────────────────────┬──────────────────────────────────┘
                           │  text message
                           ▼
┌─────────────────────────────────────────────────────────────┐
│               OpenClaw Agent (Claude / GPT)                 │
│                  Processes & generates reply                │
└──────────────────────────┬──────────────────────────────────┘
                           │  reply text
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              MAX API → User sees the response               │
└─────────────────────────────────────────────────────────────┘
```

---

## ✨ One-command install

Just tell your OpenClaw agent:

```
подключи MAX бот
```

or in English:

```
setup MAX bot
```

The agent will:
1. Clone the plugin from GitHub
2. Install Node.js dependencies
3. Ask for your MAX bot token
4. Add it to `.env`
5. Update `openclaw.json` automatically
6. Restart the gateway
7. Walk you through finding your MAX user_id for the allowlist

No manual file editing needed.

---

## 📋 Requirements

| Requirement | Notes |
|-------------|-------|
| 🇷🇺 Russian legal entity or ИП | Required to register a MAX bot on business.max.ru |
| Node.js 18+ | For the plugin runtime |
| OpenClaw gateway | Running locally or on a server |
| Whisper *(optional)* | `pip install openai-whisper` — for voice message transcription |

---

## ⚡ Quick Start (manual)

If you prefer to set up manually:

### 1. Clone and copy the plugin

```bash
git clone https://github.com/SC32br/openclaw-skill-max-bot ~/max-skill --depth=1
cp -r ~/max-skill/plugins/openclaw-max-channel ~/agents-workspace/plugins/
cd ~/agents-workspace/plugins/openclaw-max-channel && npm install
```

### 2. Add token to environment

```bash
echo 'MAX_TOKEN=your_token_here' >> ~/.openclaw/.env
```

### 3. Update openclaw.json

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

### 4. Restart and test

```bash
openclaw gateway restart
```

Send a message to your bot in MAX — the agent will respond!

---

## 🔧 Config Reference

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `token` | string | — | MAX bot token. Use `${MAX_TOKEN}` for env var |
| `allowFrom` | array | `[]` | MAX user_ids allowed to interact with the bot |
| `dmPolicy` | string | `"allowlist"` | `"allowlist"` — only listed users; `"open"` — everyone |
| `whisperBin` | string | `"whisper"` | Path to Whisper binary |
| `whisperModel` | string | `"small"` | Model: `tiny` / `base` / `small` / `medium` |
| `whisperLanguage` | string | `"ru"` | Language code for transcription |

---

## 🎤 Voice Messages

Voice transcription is **built-in and works locally** — no OpenAI API key required.

**How it works:**
1. User sends a voice message in MAX
2. Plugin detects audio attachment and shows 🎤 indicator
3. Downloads the audio file from MAX API
4. Runs: `whisper audio.ogg --model small --language ru`
5. Injects transcribed text into the agent
6. Shows ✍️ typing indicator while agent thinks
7. Sends text reply back to user

**Install Whisper** (if not already installed):
```bash
pip install openai-whisper
```

**Choose your Whisper model** based on server RAM:

| Model | File Size | RAM Needed | Quality | Best for |
|-------|-----------|-----------|---------|----------|
| `tiny` | 22 MB | ~1 GB | Low | Very fast, weak hardware |
| `base` | 139 MB | ~1 GB | OK | Budget VPS |
| `small` | 462 MB | ~2 GB | **Good** | **Recommended** |
| `medium` | 1.5 GB | ~5 GB | Excellent | Powerful server |

---

## 🔍 Finding your MAX user ID

Your MAX user_id is **not the same as your Telegram ID** — it's a completely separate number.

**How to find it:**

1. Start your OpenClaw gateway: `openclaw gateway start`
2. Send **any message** to your MAX bot from the MAX app
3. Check gateway logs:
   ```bash
   openclaw gateway logs | grep "Inbound" | tail -5
   ```
4. Look for a line like:
   ```
   [MAX] Inbound from 123456789 — text: "hello"
   ```
5. The number after `from` is your MAX user_id
6. Add it to `allowFrom` in `openclaw.json`

---

## 🛠️ Troubleshooting

### ❌ Bot doesn't respond to messages

**Possible causes:**
- Token is wrong or expired → check `MAX_TOKEN` in `.env`
- Your user_id is not in `allowFrom` → add it (see section above)
- Plugin not loaded → verify `openclaw.json` has `"openclaw-max-channel"` in `plugins.allow`

**Fix:**
```bash
openclaw gateway logs | tail -20
```

---

### ❌ Voice messages not transcribed

**Cause:** Whisper is not installed.

**Fix:**
```bash
pip install openai-whisper
```

Verify:
```bash
whisper --help
```

---

### ❌ `npm install` fails in plugin folder

**Cause:** Node.js version too old (need 18+).

**Fix:**
```bash
node --version   # should be 18+
nvm install 18 && nvm use 18
cd ~/agents-workspace/plugins/openclaw-max-channel && npm install
```

---

### ❌ Gateway starts but plugin not loading

**Cause:** Path in `plugins.load.paths` is wrong.

**Fix:** Use absolute path or verify relative path from gateway working directory:
```json
"load": {
  "paths": ["/home/user/agents-workspace/plugins/openclaw-max-channel"]
}
```

---

### ❌ Token rejected by MAX API (401 error)

**Cause:** Token format is wrong or regenerated.

**Fix:**
1. Go to business.max.ru → Чат-боты → [ваш бот] → Интеграция
2. Regenerate the token
3. Update `MAX_TOKEN` in `~/.openclaw/.env`
4. `openclaw gateway restart`

---

## 📂 Repository Structure

```
openclaw-skill-max-bot/
├── SKILL.md                          # OpenClaw skill descriptor + auto-installer
├── README.md                         # This file
├── LICENSE                           # MIT License
├── plugins/
│   └── openclaw-max-channel/
│       ├── index.js                  # Main plugin (Long Polling, Whisper, typing)
│       ├── package.json
│       └── openclaw.plugin.json      # Plugin manifest
├── scripts/
│   └── max_send.py                   # CLI tool for sending messages/testing
├── references/
│   ├── api.md                        # MAX API reference
│   └── channel.md                    # MAX channel publishing guide
└── examples/
    ├── config-minimal.json           # Minimal openclaw.json example
    └── config-full.json              # Full config with all options
```

---

## 🔗 Links

- [MAX Developers](https://dev.max.ru/docs)
- [MAX API Reference](https://dev.max.ru/docs-api)
- [MAX Business Portal](https://business.max.ru/self) *(bot registration)*
- [OpenClaw](https://openclaw.ai)
- [OpenAI Whisper](https://github.com/openai/whisper)
