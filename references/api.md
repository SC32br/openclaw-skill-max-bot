# MAX Bot API Reference

Base URL: `https://platform-api.max.ru`
Auth: `Authorization: <token>` header (query params deprecated)
Rate limit: 30 rps

## Key Methods

### GET /me
Get bot info.
```bash
curl https://platform-api.max.ru/me -H "Authorization: <token>"
```
Response: `{ user_id, name, username, is_bot, last_activity_time }`

### GET /updates (Long Polling)
```
GET /updates?limit=100&timeout=20&types=message_created,bot_started&marker=<prev>
```
Returns `{ updates: [...], marker: <next> }`. Use `marker` to paginate.

Update types: `message_created`, `bot_started`, `message_callback`

### POST /messages
Send message to chat.
```
POST /messages?chat_id=<id>
Body: { "text": "..." }   // max 4096 chars
```

### POST /chats/{chatId}/actions
Send chat action (typing indicator).
```
POST /chats/<chatId>/actions
Body: { "action": "typing_on" }
```
Actions: `typing_on`, `mark_seen`, `sending_photo`, `sending_video`, `sending_audio`, `sending_file`

### GET /files/{token}
Download file by token from attachment payload.
```
GET /files/<token>
Authorization: <token>
```

## Attachment Types in Incoming Messages

In `message.body.attachments[]`:

| type | Description |
|------|-------------|
| `audio` | Voice/audio message. Has `payload.url` or `payload.token` |
| `voice` | Voice message (alias) |
| `file` | Generic file. Check `payload.filename` for extension |
| `image` | Photo |
| `video` | Video |
| `sticker` | Sticker |
| `inline_keyboard` | Button keyboard |

## Inline Keyboard

```json
{
  "text": "Choose:",
  "attachments": [{
    "type": "inline_keyboard",
    "payload": {
      "buttons": [[
        { "type": "callback", "text": "Option 1", "payload": "opt1" },
        { "type": "link", "text": "Open site", "url": "https://..." }
      ]]
    }
  }]
}
```

Button types: `callback`, `link`, `request_contact`, `request_geo_location`, `open_app`, `message`
Max: 210 buttons, 30 rows, 7 per row (3 for link/open_app/geo/contact)

## HTTP Response Codes
- 200 — OK
- 400 — Bad request
- 401 — Auth error (bad token)
- 404 — Not found
- 429 — Rate limit exceeded
- 503 — Service unavailable
