# Lovable build log (prompts used)

Project: "sam-trading" (remixed from EzyMap ALGO, isolated backend). Prompts are recorded here for reproducibility; see git history of this file for updates.

## 2026-09-07 — Project created
Remix of EzyMap was refused by Lovable (payments-enabled projects cannot be remixed), so a fresh project was created.

- Project id: `0c41e60f-fd38-4be7-b43b-10c6de7d5ade`
- Editor: https://lovable.dev/projects/0c41e60f-fd38-4be7-b43b-10c6de7d5ade
- Preview: https://id-preview--0c41e60f-fd38-4be7-b43b-10c6de7d5ade.lovable.app

### Prompt 1 — initial brief (P0)
Landing, pricing (HFM/own-broker + monthly/annual toggles), results (computed from `signals`), products, account, admin, legal pages; Supabase schema with RLS (`profiles`, `telegram_accounts`, `tiers`, `features`, `tier_features`, `entitlements`, `ib_accounts`, `subscriptions`, `payments`, `products`, `orders`, `licenses`, `tv_access_requests`, `signals`, `signal_events`, `broadcasts`, `campaigns`, `referrals`, `user_roles` + `has_role()`); seeds; `telegram-webhook` and `signal-fanout` edge functions; Stripe monthly/annual per tier. Dark gold luxury-fintech design with mandatory risk-warning strip and IB disclosure.

### Project knowledge
Brand config rule, tier ladder, two-door entitlement rule, feature-key gating, compliance banned words, RLS/secrets/idempotency rules, results shown in R and pips only.
