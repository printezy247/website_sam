# SAMBANGGOLD universe

Reference for every design, copy and product request. Load this before writing anything user-facing.

## Brand

- Name: SAMBANGGOLD (wordmark, Anton italic; chrome "SAMBANG" + gold "GOLD"). Short: SBG (ring monogram). Person behind it: Sam.
- Mascot: chrome robot hammering a gold bar on a graphite anvil. Colours: graphite `#050609`, gold `#d4af37` / deep `#7a4003`, chrome `#b7c0ce`.
- Voice: cool, blunt, professional, light military register. Short declaratives. No exclamation marks, no hype, no em dashes, no forced triads. Compliance lines stay verbatim. Web copy has no decorative emoji; bot and email keep only functional marks (✅ ❌ ⚠️ 🔴).
- Locales: Bahasa Melayu first, English second. Rank names are brand terms and are not translated.

### Ebook catalog

| Language | Free | Standard ($19) | Premium ($49) |
|---|---|---|---|
| English | Sniper Checklist · What Moves Gold · Pips, Lots and Size · Levels That Hold | 7 Step Protocol · Gold Trading Field Manual · 13 Trader Mindset Techniques · Gold On News Time | Gold Recruit Manual |
| Bahasa Melayu | Checklist Sniper · Apa Yang Menggerakkan Gold · Pip, Lot dan Saiz · Level Yang Bertahan | Protokol 7 Langkah · Manual Padang Dagangan Emas · 13 Teknik Minda Trader · Bang Bang News Gold | Manual Rekrut Emas |

Every topic exists in both languages. PDFs live in `printezy247/designresources` under `Sam/Ebooks/{English|Malay}/{Free|Standard|Premium}/` and are bundled into this repo at `assets/ebooks/` (seed sets `products.file_path` to the relative path; `UPLOAD_DIR` on the Railway volume overrides when the same path exists there). Seeded in `src/db/seed.ts` with `products.language`; the store, the claim modal, the lead ebook and the bot `/ebook` pick the reader's language first. When a new PDF lands in designresources, copy it to `assets/ebooks/`, add a seed row, then run `npm run covers` to render its cover.

The landing page carries the Free tier as a rolling deck (`src/components/EbookDeck.tsx`), placed after the stat tiles: one cover at a time, holographic previous and next, and a language toggle so a deck is never mixed. Covers are page one of each PDF, rendered by `tools/ebook-covers.mjs` into `public/ebooks/<slug>.png` and committed. Read opens the reader overlay (`src/components/EbookReader.tsx`): guests get page one from `/api/ebooks/<id>/preview`, which slices the PDF server side, shown to 75% and faded out, then a "what you miss" card listing the headings of the pages behind the gate (`/api/ebooks/<id>/outline`, read from the PDF itself); members get the whole book from `/api/ebooks/<id>/inline`.

Premium surfaces use the `lux` class in `src/app/globals.css`: layered glass, a gold hairline, a spotlight that follows the cursor (`src/components/LuxCursor.tsx`), and a light sweep on hover. `lux-gold` adds a slow beam around the edge and marks the featured card. It is on the two door cards, the rank cards, the store cards and the reader gate.

## MT5 copier

Rambo includes the copier; anyone else subscribes to it in the store ($39 monthly, the `telegram-mt5-copier` row). The robot (`tools/mt5/SamBangGoldCopier.mq5`) runs in the member's own MT5 and talks to three routes under `/api/copier/`: `hello` binds the terminal to their licence and returns their risk settings, `signals` hands out what to do next, `ack` records what happened. Commands are derived from the signals their rank can see, so a terminal that misses a poll catches up on the next one, and a signal already acted on is never sent twice.

Each signal becomes a pending order at our published entry, cancelled after the member's window (four hours by default), with the first target as take profit. Risk is either a fixed lot or a percent of balance sized off the stop distance, capped by a maximum lot. When we close a signal, the robot closes its side too.

Members manage it on the account page (`src/components/CopierPanel.tsx`): key, download, a green light per terminal, risk settings and the last trades. The bot answers `/copier` with the same state. Setup guide lives at `/copier` in both languages. Sam compiles the robot once in MetaEditor and drops the `.ex5` into `assets/copier/`; until then the download hands over the source.

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
