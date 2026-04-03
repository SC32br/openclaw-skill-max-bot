# MAX Channels — Setup & Strategy

## Channel Types

| | Public | Private |
|--|--------|---------|
| Who can create | Legal entity/IP (Russia) | Any user with RU phone |
| Discoverable | Yes (search) | Only by invite link |
| Verification | Required (А+ badge or business.max.ru) | Not required |
| Subscribers | Anyone | Invite only |

## Creating a Public Channel

Two ways:
1. **А+ badge** — if you already have verified community on VK/OK/Dzen/Telegram, use bot [@channel_bot](https://max.ru/channel_bot) to mirror it automatically with same name/nick
2. **Via business.max.ru** — register org, then create channel in the partner platform

## Posting via API

```bash
# Post text to channel
curl -X POST "https://platform-api.max.ru/messages?chat_id=<channel_id>" \
  -H "Authorization: <token>" \
  -H "Content-Type: application/json" \
  -d '{"text": "Your post text here"}'

# Post with photo
curl -X POST "https://platform-api.max.ru/messages?chat_id=<channel_id>" \
  -H "Authorization: <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Caption",
    "attachments": [{
      "type": "image",
      "payload": { "url": "https://example.com/photo.jpg" }
    }]
  }'
```

## Content Strategy (proven for Russian market)

**Post frequency:** 3-5x/week minimum in first month (algorithm rewards regularity)

**Content mix (3:1 rule):**
- 3 posts: value/beauty/entertainment
- 1 post: selling/promo

**Best formats:**
| Format | Frequency | Why it works |
|--------|-----------|--------------|
| Lookbook / outfit of the day | 2-3x/week | Visual + hashtags → search |
| New arrivals | On arrival | Urgency + specifics |
| Brand/product story | 1x/week | Expertise, trust |
| Poll / vote | 1x/week | Engagement signal to algorithm |
| Behind the scenes | 1x/week | Authenticity |
| Promo / special offer | 1x/2 weeks | Direct sales |

**Key hashtags (fashion niche):**
`#мода #Россия #стиль #образдня #новинки #бренд`

## SEO for MAX

Put keywords in channel **name** and **description** — MAX search indexes both:
- Include city, niche, brands you carry
- Example: `"Дебош Вологда | BOSS Diesel Moncler | Мужская мода"`

## Advantages vs Telegram (2025-2026)

| | MAX | Telegram |
|--|-----|----------|
| Algorithm | Recommendation-based (like social) | Chronological only |
| Organic reach | High for new channels | Only ads/cross-promo |
| Competition | Low | High |
| Subscriber cost | 20-50 ₽ | 3x more expensive |
| Mini-apps | Growing | More mature |
