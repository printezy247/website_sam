import { db } from "./index";
import { count, eq } from "drizzle-orm";
import { products, signals, users } from "./schema";

async function main() {
  const sampleProducts = [
    {
      slug: "sam-gold-levels-tv",
      type: "tv_indicator",
      name: "Sam Gold Levels (TradingView)",
      description:
        "Daily bias, key levels and session boxes for XAUUSD. Invite-only script.",
      priceCents: 2900,
      billing: "monthly",
      tierIncluded: "pro",
    },
    {
      slug: "sam-smc-suite-tv",
      type: "tv_indicator",
      name: "SMC Suite (TradingView)",
      description:
        "Order blocks, FVG, BOS/CHoCH and liquidity for gold and indices.",
      priceCents: 19900,
      billing: "lifetime",
      tierIncluded: "elite",
    },
    {
      slug: "sam-gold-levels-mt5",
      type: "mt5_indicator",
      name: "Sam Gold Levels (MT5)",
      description:
        "Same levels on MetaTrader 5. Licensed to your account number, 2 activations.",
      priceCents: 4900,
      billing: "lifetime",
      tierIncluded: "elite",
      filePath: "indicators/SamGoldLevels.mq5",
    },
    // Ebook catalog. PDFs are bundled under assets/ebooks (copied from designresources Sam/Ebooks); UPLOAD_DIR overrides.
    { slug: "sniper-checklist", type: "ebook", name: "Sniper Checklist", description: "One-page pre-trade checklist for XAUUSD entries.", priceCents: 0, billing: "one_time", tierIncluded: null, ebookTier: "free", language: "en", filePath: "ebooks/English/Free/SniperChecklist_v1.pdf", pairSlug: "checklist-sniper" },
    { slug: "7-step-protocol", type: "ebook", name: "7 Step Protocol", description: "The seven steps from bias to exit, in order.", priceCents: 1900, billing: "one_time", tierIncluded: "free", ebookTier: "standard", language: "en", filePath: "ebooks/English/Standard/7StepProtocol_v1.pdf", pairSlug: "protokol-7-langkah" },
    { slug: "gold-trading-field-manual", type: "ebook", name: "Gold Trading Field Manual", description: "Sessions, structure, risk and journaling for gold.", priceCents: 1900, billing: "one_time", tierIncluded: "free", ebookTier: "standard", language: "en", filePath: "ebooks/English/Standard/GoldTradingFieldManual_v1.pdf", pairSlug: "manual-padang-dagangan-emas" },
    { slug: "13-trader-mindset-techniques", type: "ebook", name: "13 Trader Mindset Techniques", description: "Thirteen mindset techniques to stay disciplined.", priceCents: 1900, billing: "one_time", tierIncluded: "free", ebookTier: "standard", language: "en", filePath: "ebooks/English/Standard/13TraderMindsetTechniques_v1.pdf", pairSlug: "13-teknik-minda-trader" },
    { slug: "gold-on-news-time", type: "ebook", name: "Gold On News Time", description: "How to trade gold around red news.", priceCents: 1900, billing: "one_time", tierIncluded: "free", ebookTier: "standard", language: "en", filePath: "ebooks/English/Standard/GoldOnNewsTime_v1.pdf", pairSlug: "bang-bang-news-gold" },
    { slug: "gold-recruit-manual", type: "ebook", name: "Gold Recruit Manual", description: "Full guidance and SOP for new recruits.", priceCents: 4900, billing: "one_time", tierIncluded: "pro", ebookTier: "premium", language: "en", filePath: "ebooks/English/Premium/GoldRecruitManual_v1.pdf", pairSlug: "manual-rekrut-emas" },
    { slug: "checklist-sniper", type: "ebook", name: "Checklist Sniper", description: "Senarai semak sebelum entry XAUUSD, satu muka surat.", priceCents: 0, billing: "one_time", tierIncluded: null, ebookTier: "free", language: "ms", filePath: "ebooks/Malay/Free/SniperChecklist_v1.pdf", pairSlug: "sniper-checklist" },
    { slug: "13-teknik-minda-trader", type: "ebook", name: "13 Teknik Minda Trader", description: "Tiga belas teknik minda untuk kekal disiplin.", priceCents: 1900, billing: "one_time", tierIncluded: "free", ebookTier: "standard", language: "ms", filePath: "ebooks/Malay/Standard/13TeknikMindaTrader_v1.pdf", pairSlug: "13-trader-mindset-techniques" },
    { slug: "protokol-7-langkah", type: "ebook", name: "Protokol 7 Langkah", description: "Tujuh langkah dari bias ke exit, mengikut urutan.", priceCents: 1900, billing: "one_time", tierIncluded: "free", ebookTier: "standard", language: "ms", filePath: "ebooks/Malay/Standard/Protokol7Langkah_v1.pdf", pairSlug: "7-step-protocol" },
    { slug: "bang-bang-news-gold", type: "ebook", name: "Bang Bang News Gold", description: "Cara trade emas sekitar berita merah.", priceCents: 1900, billing: "one_time", tierIncluded: "free", ebookTier: "standard", language: "ms", filePath: "ebooks/Malay/Standard/BangBangNewsGold_v1.pdf", pairSlug: "gold-on-news-time" },
    { slug: "manual-padang-dagangan-emas", type: "ebook", name: "Manual Padang Dagangan Emas", description: "Sesi, struktur, risiko dan jurnal untuk emas.", priceCents: 1900, billing: "one_time", tierIncluded: "free", ebookTier: "standard", language: "ms", filePath: "ebooks/Malay/Standard/ManualPadangDaganganEmas_v1.pdf", pairSlug: "gold-trading-field-manual" },
    { slug: "manual-rekrut-emas", type: "ebook", name: "Manual Rekrut Emas", description: "Panduan penuh dan SOP untuk rekrut baharu.", priceCents: 4900, billing: "one_time", tierIncluded: "pro", ebookTier: "premium", language: "ms", filePath: "ebooks/Malay/Premium/ManualRekrutEmas_v1.pdf", pairSlug: "gold-recruit-manual" },
    { slug: "where-the-stop-goes", type: "ebook", name: "Where The Stop Goes", description: "The stop marks where the idea is wrong, not where the loss starts to hurt.", priceCents: 0, billing: "one_time", tierIncluded: null, ebookTier: "free", language: "en", filePath: "ebooks/English/Free/Snippet04_WhereTheStopGoes_v1.pdf", pairSlug: "di-mana-stop-loss-diletakkan" },
    { slug: "reading-r", type: "ebook", name: "Reading R", description: "One unit of risk. Every result measured against it.", priceCents: 0, billing: "one_time", tierIncluded: null, ebookTier: "free", language: "en", filePath: "ebooks/English/Free/Snippet05_ReadingR_v1.pdf", pairSlug: "membaca-r" },
    { slug: "the-news-lockout", type: "ebook", name: "The News Lockout", description: "For a few minutes a day, levels stop working. Those minutes are printed in advance.", priceCents: 0, billing: "one_time", tierIncluded: null, ebookTier: "free", language: "en", filePath: "ebooks/English/Free/Snippet06_TheNewsLockout_v1.pdf", pairSlug: "news-lockout" },
    { slug: "di-mana-stop-loss-diletakkan", type: "ebook", name: "Di Mana Stop Loss Diletakkan", description: "Stop loss menanda tempat idea itu salah, bukan tempat kerugian mula terasa.", priceCents: 0, billing: "one_time", tierIncluded: null, ebookTier: "free", language: "ms", filePath: "ebooks/Malay/Free/Snippet04_WhereTheStopGoes_v1.pdf", pairSlug: "where-the-stop-goes" },
    { slug: "membaca-r", type: "ebook", name: "Membaca R", description: "Satu unit risiko. Setiap keputusan diukur terhadapnya.", priceCents: 0, billing: "one_time", tierIncluded: null, ebookTier: "free", language: "ms", filePath: "ebooks/Malay/Free/Snippet05_ReadingR_v1.pdf", pairSlug: "reading-r" },
    { slug: "news-lockout", type: "ebook", name: "News Lockout", description: "Untuk beberapa minit sehari, level berhenti berfungsi. Minit itu dicetak lebih awal.", priceCents: 0, billing: "one_time", tierIncluded: null, ebookTier: "free", language: "ms", filePath: "ebooks/Malay/Free/Snippet06_TheNewsLockout_v1.pdf", pairSlug: "the-news-lockout" },
    { slug: "what-moves-gold", type: "ebook", name: "What Moves Gold", description: "Four forces set the price of gold. Name them before you trade them.", priceCents: 0, billing: "one_time", tierIncluded: null, ebookTier: "free", language: "en", filePath: "ebooks/English/Free/Snippet01_WhatMovesGold_v1.pdf", pairSlug: "apa-yang-menggerakkan-gold" },
    { slug: "pips-lots-and-size", type: "ebook", name: "Pips, Lots and Size", description: "The stop decides the size. Never the other way round.", priceCents: 0, billing: "one_time", tierIncluded: null, ebookTier: "free", language: "en", filePath: "ebooks/English/Free/Snippet02_PipsLotsAndSize_v1.pdf", pairSlug: "pip-lot-dan-saiz" },
    { slug: "levels-that-hold", type: "ebook", name: "Levels That Hold", description: "Support and resistance are zones, not lines. Two or three a day is enough.", priceCents: 0, billing: "one_time", tierIncluded: null, ebookTier: "free", language: "en", filePath: "ebooks/English/Free/Snippet03_LevelsThatHold_v1.pdf", pairSlug: "level-yang-bertahan" },
    { slug: "apa-yang-menggerakkan-gold", type: "ebook", name: "Apa Yang Menggerakkan Gold", description: "Empat kuasa menetapkan harga gold. Kenali dahulu sebelum anda berdagang.", priceCents: 0, billing: "one_time", tierIncluded: null, ebookTier: "free", language: "ms", filePath: "ebooks/Malay/Free/Snippet01_WhatMovesGold_v1.pdf", pairSlug: "what-moves-gold" },
    { slug: "pip-lot-dan-saiz", type: "ebook", name: "Pip, Lot dan Saiz", description: "Stop loss menentukan saiz. Bukan sebaliknya.", priceCents: 0, billing: "one_time", tierIncluded: null, ebookTier: "free", language: "ms", filePath: "ebooks/Malay/Free/Snippet02_PipsLotsAndSize_v1.pdf", pairSlug: "pips-lots-and-size" },
    { slug: "level-yang-bertahan", type: "ebook", name: "Level Yang Bertahan", description: "Support dan resistance ialah zon, bukan garis. Dua atau tiga sehari sudah cukup.", priceCents: 0, billing: "one_time", tierIncluded: null, ebookTier: "free", language: "ms", filePath: "ebooks/Malay/Free/Snippet03_LevelsThatHold_v1.pdf", pairSlug: "levels-that-hold" },
    { slug: "gold-navigator", type: "ebook", name: "Gold Navigator", description: "Three forces set the price. A handful of players move it. It only really moves in one window of the day.", priceCents: 0, billing: "one_time", tierIncluded: null, ebookTier: "free", language: "en", filePath: "ebooks/English/Free/Snippet07_GoldNavigator_v1.pdf", pairSlug: "apa-menggerakkan-emas" },
    { slug: "the-real-cost-of-a-trade", type: "ebook", name: "The Real Cost Of A Trade", description: "Before a strategy can make anything, the arithmetic has to allow it. Pip value, spread, leverage, lot size.", priceCents: 0, billing: "one_time", tierIncluded: null, ebookTier: "free", language: "en", filePath: "ebooks/English/Free/Snippet08_TheRealCostOfATrade_v1.pdf", pairSlug: "kos-sebenar-satu-trade" },
    { slug: "reading-a-bare-gold-chart", type: "ebook", name: "Reading A Bare Gold Chart", description: "One candle, two zones, one trendline, three timeframes. Everything you need is price.", priceCents: 0, billing: "one_time", tierIncluded: null, ebookTier: "free", language: "en", filePath: "ebooks/English/Free/Snippet09_ReadingABareGoldChart_v1.pdf", pairSlug: "membaca-chart-emas-kosong" },
    { slug: "the-one-plan-order", type: "ebook", name: "The One-Plan Order", description: "Three prices go in together or none of them go in. Then R does the accounting.", priceCents: 0, billing: "one_time", tierIncluded: null, ebookTier: "free", language: "en", filePath: "ebooks/English/Free/Snippet10_TheOnePlanOrder_v1.pdf", pairSlug: "satu-plan-satu-order" },
    { slug: "a-clean-desk", type: "ebook", name: "A Clean Desk", description: "Four tools, one chart layout, and a long list of things to switch off. The edge is not in the software.", priceCents: 0, billing: "one_time", tierIncluded: null, ebookTier: "free", language: "en", filePath: "ebooks/English/Free/Snippet11_ACleanDesk_v1.pdf", pairSlug: "meja-yang-bersih" },
    { slug: "apa-menggerakkan-emas", type: "ebook", name: "Apa Menggerakkan Emas", description: "Tiga kuasa menetapkan harganya. Segelintir pemain menggerakkannya. Ia hanya benar-benar bergerak dalam satu tingkap sehari.", priceCents: 0, billing: "one_time", tierIncluded: null, ebookTier: "free", language: "ms", filePath: "ebooks/Malay/Free/Snippet07_ApaMenggerakkanEmas_v1.pdf", pairSlug: "gold-navigator" },
    { slug: "kos-sebenar-satu-trade", type: "ebook", name: "Kos Sebenar Satu Trade", description: "Sebelum satu strategi boleh menghasilkan apa-apa, kiraannya mesti membenarkannya. Nilai pip, spread, leverage, saiz lot.", priceCents: 0, billing: "one_time", tierIncluded: null, ebookTier: "free", language: "ms", filePath: "ebooks/Malay/Free/Snippet08_KosSebenarSatuTrade_v1.pdf", pairSlug: "the-real-cost-of-a-trade" },
    { slug: "membaca-chart-emas-kosong", type: "ebook", name: "Membaca Chart Emas Kosong", description: "Satu candlestick, dua zon, satu trendline, tiga time frame. Semua yang anda perlukan ialah harga.", priceCents: 0, billing: "one_time", tierIncluded: null, ebookTier: "free", language: "ms", filePath: "ebooks/Malay/Free/Snippet09_MembacaChartEmasKosong_v1.pdf", pairSlug: "reading-a-bare-gold-chart" },
    { slug: "satu-plan-satu-order", type: "ebook", name: "Satu Plan Satu Order", description: "Tiga harga masuk bersama atau tiada satu pun masuk. Kemudian R membuat kiraan.", priceCents: 0, billing: "one_time", tierIncluded: null, ebookTier: "free", language: "ms", filePath: "ebooks/Malay/Free/Snippet10_SatuPlanSatuOrder_v1.pdf", pairSlug: "the-one-plan-order" },
    { slug: "meja-yang-bersih", type: "ebook", name: "Meja Yang Bersih", description: "Empat alat, satu susunan chart, dan satu senarai panjang perkara yang perlu dimatikan. Kelebihan bukan dalam perisian.", priceCents: 0, billing: "one_time", tierIncluded: null, ebookTier: "free", language: "ms", filePath: "ebooks/Malay/Free/Snippet11_MejaYangBersih_v1.pdf", pairSlug: "a-clean-desk" },
    { slug: "combo-entry-sop", type: "ebook", name: "Combo Entry SOP", description: "Take gold only where a trendline and a flipped level arrive at the same price. H4 sets the direction, H1 the entry.", priceCents: 4900, billing: "one_time", tierIncluded: "pro", ebookTier: "premium", language: "en", filePath: "ebooks/English/Premium/ComboEntrySOP_v1.pdf", pairSlug: "sop-entry-combo" },
    { slug: "discipline-sop", type: "ebook", name: "Discipline SOP", description: "Ten faults that take money off you, ten demo drills that remove them, and the standard you clear before going live.", priceCents: 4900, billing: "one_time", tierIncluded: "pro", ebookTier: "premium", language: "en", filePath: "ebooks/English/Premium/DisciplineSOP_v1.pdf", pairSlug: "sop-disiplin" },
    { slug: "sop-entry-combo", type: "ebook", name: "SOP Entry Combo", description: "Ambil emas hanya di tempat trendline dan level yang bertukar peranan tiba pada harga yang sama. H4 tetapkan arah, H1 entry.", priceCents: 4900, billing: "one_time", tierIncluded: "pro", ebookTier: "premium", language: "ms", filePath: "ebooks/Malay/Premium/SOPEntryCombo_v1.pdf", pairSlug: "combo-entry-sop" },
    { slug: "sop-disiplin", type: "ebook", name: "SOP Disiplin", description: "Sepuluh kesilapan yang merugikan anda, sepuluh drill demo yang membuangnya, dan standard yang dilepasi sebelum live.", priceCents: 4900, billing: "one_time", tierIncluded: "pro", ebookTier: "premium", language: "ms", filePath: "ebooks/Malay/Premium/SOPDisiplin_v1.pdf", pairSlug: "discipline-sop" },
    {
      slug: "telegram-mt5-copier",
      type: "copier",
      name: "Telegram → MT5 Copier",
      description:
        "Auto-copy our signals to your MT5 with your own risk settings.",
      priceCents: 3900,
      billing: "monthly",
      tierIncluded: "elite",
    },
  ];

  function sampleSignals() {
    const out = [];
    let price = 2380;
    const start = Date.now() - 90 * 864e5;
    const outcomes = [
      1.8, -1, 2.2, 1.5, -1, 3, 1.2, -1, 2, 1.7, -1, 2.5, 1.4, 2.1, -1, 1.9,
      2.8, -1, 1.6, 2.3,
    ];
    for (let i = 0; i < outcomes.length; i++) {
      const side = i % 3 === 0 ? "sell" : "buy";
      const r = outcomes[i];
      const risk = 8; // $8 stop ≈ 80 pips on gold (0.1 = 1 pip)
      price += (Math.random() - 0.4) * 10;
      const entry = Number(price.toFixed(2));
      const sl = side === "buy" ? entry - risk : entry + risk;
      const tp1 = side === "buy" ? entry + risk : entry - risk;
      const tp2 = side === "buy" ? entry + risk * 2 : entry - risk * 2;
      const tp3 = side === "buy" ? entry + risk * 3 : entry - risk * 3;
      const publishedAt = new Date(start + i * 4.2 * 864e5);
      out.push({
        instrument: "XAUUSD",
        side,
        entry: String(entry),
        sl: String(sl.toFixed(2)),
        tp1: String(tp1.toFixed(2)),
        tp2: String(tp2.toFixed(2)),
        tp3: String(tp3.toFixed(2)),
        status: r > 0 ? (r >= 3 ? "tp3" : r >= 2 ? "tp2" : "tp1") : "sl",
        resultR: String(r),
        resultPips: String((r * risk * 10).toFixed(1)),
        visibility: i % 4 === 0 ? "public" : "pro",
        publishedAt,
        closedAt: new Date(publishedAt.getTime() + 6 * 36e5),
        note: "Seed sample. Replace with real signals.",
      });
    }
    return out;
  }

  await db.insert(products).values(sampleProducts).onConflictDoNothing();
  // Ebook catalog rows keep their file, tier and language in sync with the repo; price and name stay editable in admin.
  for (const p of sampleProducts.filter((x) => x.type === "ebook")) {
    await db.update(products).set({ filePath: p.filePath, ebookTier: p.ebookTier, language: p.language, tierIncluded: p.tierIncluded, pairSlug: p.pairSlug }).where(eq(products.slug, p.slug));
  }
  await db.update(products).set({ active: false }).where(eq(products.slug, "ebook-gold-starter")); // replaced by the catalog
  // Tools ship one at a time. The SMC suite stays out of the store until it exists and is approved.
  await db.update(products).set({ active: false }).where(eq(products.slug, "sam-smc-suite-tv"));
  await db.update(products).set({ filePath: "indicators/SamGoldLevels.mq5" }).where(eq(products.slug, "sam-gold-levels-mt5"));
  const [{ n }] = await db.select({ n: count() }).from(signals);
  if (n === 0) await db.insert(signals).values(sampleSignals());
  else console.log(`signals already seeded (${n}), skipping`);
  if (process.env.SEED_ADMIN_EMAIL) {
    await db
      .insert(users)
      .values({
        email: process.env.SEED_ADMIN_EMAIL,
        role: "admin",
        name: "Admin",
      })
      .onConflictDoUpdate({ target: users.email, set: { role: "admin" } });
  }
  console.log("seeded");
  process.exit(0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
