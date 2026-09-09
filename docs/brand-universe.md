# SAMBANGGOLD universe

Reference for every design, copy and product request. Load this before writing anything user-facing.

## Brand

- Name: SAMBANGGOLD (wordmark, Anton italic; chrome "SAMBANG" + gold "GOLD"). Short: SBG (ring monogram). Person behind it: Sam.
- Mascot: chrome robot hammering a gold bar on a graphite anvil. Colours: graphite `#050609`, gold `#d4af37` / deep `#7a4003`, chrome `#b7c0ce`.
- Voice: cool, blunt, professional, light military register. Short declaratives. No exclamation marks, no hype, no em dashes, no forced triads. Compliance lines stay verbatim. Web copy has no decorative emoji; bot and email keep only functional marks (✅ ❌ ⚠️ 🔴).
- Locales: Bahasa Melayu first, English second. Rank names are brand terms and are not translated.

## Source assets

Design files live in `printezy247/designresources`, folder `Sam/` (channel code `SAM`, naming `SAM_{Project}_{Description}_v{N}.{ext}`). Current: `BrandAssets/3DModels/SamBangGoldMascot_v1.obj` + `.mtl` (mesh with named parts: anvil, gold_bar, legs, torso, belt, hammer), `BrandAssets/Fonts/Anton_v1.woff2`. This repo keeps its own copies under `public/brand/` (including `mascot-raise.png` and `mascot-strike.png`, rendered from the mesh with three.js) and `src/app/fonts/`.

## Ranks (membership tiers)

| Display name | Internal key | Route A (HFM account) | Route B (own broker) |
|---|---|---|---|
| Public | `public` | none | none |
| General | `free` | account, no deposit | $9 / mo |
| A-Team | `pro` | $100 in the account | $49 / mo |
| Rambo | `elite` | $500 in the account | $129 / mo |

Internal keys never change. Labels live in `TIER_LABELS` (`src/config/tiers.ts`) and `messages/*.json`.

## Ebook tiers

| Ebook tier | What it is | Access | Default paid price |
|---|---|---|---|
| Free (snippets) | Short ebooks, plans or single modules | No requirement | $0 |
| Standard | Full-length ebooks (the three created earlier) | Included in General and above, or paid | $19 |
| Premium | Full guidance or SOP | Included in A-Team and above, or paid | $49 |

Prices are defaults and can be set per ebook in the admin store. The store models this with `products.ebook_tier` (`free | standard | premium`, config in `EBOOK_TIERS`, `src/config/tiers.ts`). Picking a tier in admin sets `tier_included` automatically (Standard to `free`, Premium to `pro`) unless a rank is chosen explicitly. The store page has an Ebooks / Tools filter and shows the tier badge on each ebook. Free ebooks are claimed by creating a website account: the home page claim modal (3D glass card) lists them, sends visitors to sign-up, and lets members download directly. Sign-up through the modal also starts the ebook email drip.
