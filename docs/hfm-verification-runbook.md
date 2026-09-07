# HFM IB Verification Runbook

HFM (hfm-my.com) Partner Area shows referred clients, deposits and volume, and pays commission daily. No public client API is assumed at launch.

## Flow
1. User taps "Open HFM account" (env `HFM_IB_LINK`) and registers under our Partner ID.
2. User sends the MT5/myHF account number via bot `/verify` or `/account`.
3. Row `ib_accounts` created with status `pending`.
4. Admin (daily) exports the Partner Area client report as CSV and uploads it at `/admin/ib-import`.
   - Matcher joins on `account_no`; sets `status=verified`, `deposit_usd`, `verified_at`.
   - Tier band: deposit 0 → Free; ≥ 100 → Pro; ≥ 500 → Elite (configurable in `tiers`).
5. Entitlement written with `source=ib`, `expires_at = now + 30 days`; bot sends invite link.
6. Monthly re-import refreshes `deposit_usd`; downgrade after 7-day grace if the account is closed/withdrawn below band.

## Manual approve
`/admin/ib-approvals`: approve / reject with reason; approving sets band manually if the report lags.

## If HFM grants API access
Replace CSV import with a scheduled fetch; keep the same matcher.

## Disclosure
Site and bot state that we earn commission from HFM on referred accounts. See `compliance-copy.md`.
