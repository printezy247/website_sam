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
