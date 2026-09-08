import { db } from "./index";
import { count } from "drizzle-orm";
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
    {
      slug: "ebook-gold-starter",
      type: "ebook",
      name: "Gold Trading Starter (ebook)",
      description: "Starter guide: structure, sessions, risk, journaling.",
      priceCents: 0,
      billing: "one_time",
      tierIncluded: "free",
    },
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
