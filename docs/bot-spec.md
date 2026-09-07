# Telegram Bot Spec (`@SamTradingBot` placeholder)

## Commands
| Command | Behaviour |
|---|---|
| `/start [payload]` | Upsert user; payload = campaign/ref tag; send welcome + ebook + "two ways in" keyboard |
| `/verify` | Ask for HFM account number → insert `ib_accounts` pending → notify admin → on approve: grant tier by deposit band, send single-use invite link (24h) |
| `/subscribe` | Tier picker → Stripe checkout URL or USDT (NOWPayments) invoice |
| `/status` | Current tier, source, expiry, IB status, next upgrade step |
| `/upgrade` | Deposit-more path (IB) or price difference (paid) |
| `/products` | Store list with deep links |
| `/ebook` | Re-send free ebook |
| `/support` | Human handoff link |

## Gatekeeping
- Groups use join requests; bot approves only if `entitlements` grants the group's `feature_key`.
- Invite links are single-use, expire in 24h, created per user (`createChatInviteLink`).
- Daily job: expire entitlements past `expires_at` + grace → `banChatMember` then `unbanChatMember` (soft kick) → win-back message.

## Signal fan-out
Admin posts once in `/admin/signals` → bot sends:
- Public channel: teaser (instrument, side, "TP1 hit" updates only, delayed by N minutes).
- Free tier: 2/week full signals (flagged `free_pick`).
- Pro/Elite groups: full text (entry, SL, TP1–3, risk note, news-lockout flag). Updates edit the original message and post a reply.

## Broadcasts
Admin composes → segment (tier, language, campaign) → scheduled send with rate limiting (≤ 25 msg/s).

## Security
- Webhook secret header check; HTML escaping of all user text; rate limit per Telegram id; idempotent activation keyed on checkout/invoice id.
