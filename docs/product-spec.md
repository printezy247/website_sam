# Sam Trading — Product & Monetization Spec

> Brand name "Sam" is a placeholder behind a single `BRAND` config. Broker partner: HFM (hfm-my.com). All content is for education only.

## 1. Positioning
XAUUSD-first signal and education business. Two doors into every tier: open an HFM account under our IB link (Door A) **or** pay monthly on your own broker (Door B). Entitlement = the higher of the IB tier and the paid tier.

## 2. Tier ladder

| Tier | Door A — HFM IB | Door B — own broker | What you get |
|---|---|---|---|
| **Public** (no signup) | — | — | Public Telegram channel: 1 delayed XAUUSD signal/day, daily gold bias summary, weekly recap |
| **Free** | HFM account under IB, **no deposit** | **$9/mo** ($90/yr) | Free ebook, full daily bias + weekly outlook, results page, community chat, 2 full signals/week |
| **Pro** | HFM IB + **≥ $100** deposit | **$49/mo** ($490/yr) | All XAUUSD signals live (entry, SL, TP1–3, management), Pro Telegram group, monthly report, basic TradingView indicator "Sam Gold Levels" |
| **Elite** | HFM IB + **≥ $500** deposit | **$129/mo** ($1,290/yr) | Pro + all instruments as added (US30, NAS100, BTC, EURUSD), full TV + MT5 indicator suite, Telegram→MT5 copier license, weekly live analysis, priority Q&A |
| **Mentorship** (phase 3) | — | $499 one-off / $199/mo | Elite + course + 1:1 trade reviews |

Rules
- Annual = 2 months free. Card (Stripe) and USDT (NOWPayments) accepted.
- IB entitlements re-verified monthly (account active; optional min volume). 7-day grace before downgrade.
- Upgrade paths: IB Free → Pro by depositing $100; Pro → Elite at $500 cumulative. Own-broker users see a "switch to HFM and go free" coupon.
- Every feature is a `feature_key`; tiers map to feature sets in `tier_features` so packaging can change without code.

## 3. Store (à la carte; Elite includes the indicator suite and copier)
- TradingView invite-only indicators: $29–$79/mo or $199 lifetime → admin grant queue by TV username.
- MT5 indicators/EAs: licensed by MT5 account number, 2 activations, expiry (existing license-server pattern).
- Ebooks: free lead magnet + paid $19–$49, delivered by bot + email (signed URL).
- Telegram→MT5 copier license: $39/mo.

## 4. Analysis products (TA + fundamental + sentiment)

| Feature | Free | Pro | Elite |
|---|---|---|---|
| Daily gold bias (SMC: BOS/CHoCH, order blocks, FVG, key levels) | summary | full levels + chart | + intraday updates |
| Economic calendar + "news lockout" flag on signals | view | signals carry flag | + pre-news plan |
| Sentiment gauge (news sentiment + retail positioning) | daily number | daily + history | live feed |
| Public results (win rate, RR, expectancy, drawdown, Myfxbook/FXBlue embed) | all | all | all |
| Weekly outlook (EN + MS) | yes | yes | + live session |

## 5. Funnels
1. Social → landing (live results + risk warning) → "Get free signals" → bot `/start?ref=<campaign>` → public channel + ebook + email capture.
2. Public → Free: bot offers "open HFM under our link → send account number → verified → Free unlocked" or "$9/mo".
3. Free → Pro: "deposit $100" or "$49/mo". Pro → Elite: "$500 total" or "$129/mo". Pinned upsell in group + bot nudge on day 14.
4. Retention: monthly report, dashboard stats, referral (3 invites → 1 month Elite), later HFM sub-affiliate.
5. Churn: auto-remove on expiry, 30% win-back coupon after 7 days.

## 6. Data model (core)
`profiles`, `telegram_accounts`, `tiers`, `features`, `tier_features`, `entitlements(user, tier, source: ib|stripe|crypto|manual, starts_at, expires_at)`, `ib_accounts(broker, account_no, status: pending|verified|rejected, deposit_usd, verified_at)`, `subscriptions`, `payments`, `products`, `orders`, `licenses(mt5_account, activations, expires_at)`, `tv_access_requests(tv_username, status)`, `signals(instrument, side, entry, sl, tp[], status, pnl_pips, published_at)`, `signal_events`, `broadcasts`, `campaigns`, `referrals`. RLS on all tables; admin via role claim.

## 7. Pages
`/` landing · `/results` · `/pricing` · `/products`, `/products/:slug` · `/account` · `/admin` (signals, IB approvals + CSV import, users/entitlements, products/licenses, broadcasts, funnel analytics) · `/legal/risk`, `/legal/terms`, `/legal/privacy`, `/legal/ib-disclosure` · `/ms/*` Malay mirrors.

## 8. Store fulfilment (P2, live)
- Downloads: `GET /api/downloads/:productId` (signed-in; allowed when tier includes the product, it is free, or a paid order exists). `products.file_path` = filename inside `UPLOAD_DIR` (Railway volume), an `https://` URL (redirect), or `tg:<file_id>` (delivered by bot `/ebook`).
- MT5 licences: buyer gets a licence key (`licenses.id`) on `/account`. Indicator/EA calls `POST /api/license/check {license, account}`; first `max_activations` (2) accounts bind, others get `activation limit reached`; `expires_at` returned for subscriptions.
- TradingView: member requests access on `/account`; admin grants in TradingView, marks it at `/admin/tv`; member is DM'd.
- Products CRUD at `/admin/products`.
