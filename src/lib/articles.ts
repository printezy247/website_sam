import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { articles } from "@/db/schema";
import { BRAND } from "@/config/brand";
import { CHATS, getBot } from "@/lib/telegram";
import { generateJson, llmConfigured } from "@/lib/llm";


/** Rotating topic bank: common problems retail gold/forex traders face today, each with a fix angle. */
export const TOPICS: { key: string; category: string; en: string }[] = [
  { key: "overtrading", category: "mindset", en: "Overtrading after a loss: why it happens and a 3-step reset routine" },
  { key: "revenge", category: "mindset", en: "Revenge trading on gold: recognising the trigger and building a cooldown rule" },
  { key: "fomo-news", category: "execution", en: "FOMO entries during NFP/CPI: how to plan a news day instead of chasing" },
  { key: "position-size", category: "risk", en: "Position sizing on XAUUSD: converting a $ risk into lots correctly" },
  { key: "stop-hunt", category: "strategy", en: "Stop hunts and liquidity sweeps: placing stops beyond the obvious level" },
  { key: "moving-stop", category: "risk", en: "Moving your stop loss further away: the habit that empties accounts" },
  { key: "tp-partial", category: "execution", en: "Taking partial profits on gold: a simple TP1/TP2/TP3 framework" },
  { key: "session-timing", category: "strategy", en: "Which sessions move gold: London, New York overlap and Asian range" },
  { key: "journal", category: "mindset", en: "Keeping a trading journal that you actually use: 5 fields that matter" },
  { key: "signal-dependence", category: "mindset", en: "Following signals without understanding them: how to learn from every setup" },
  { key: "leverage", category: "risk", en: "High leverage is not the problem, position size is: a clear explanation" },
  { key: "drawdown", category: "risk", en: "Surviving a drawdown: cutting size, not strategy" },
  { key: "structure-bos", category: "strategy", en: "Market structure basics: break of structure vs change of character on gold" },
  { key: "order-blocks", category: "strategy", en: "Order blocks and fair value gaps explained without the jargon" },
  { key: "spread-slippage", category: "execution", en: "Spread and slippage on gold at news time: what to expect and how to adapt" },
  { key: "small-account", category: "risk", en: "Growing a $100 account safely: realistic targets and rules" },
  { key: "compounding", category: "risk", en: "Compounding a trading account: the maths and the discipline" },
  { key: "correlations", category: "strategy", en: "DXY, yields and gold: reading correlations before you enter" },
  { key: "scalp-vs-swing", category: "strategy", en: "Scalping vs swing trading gold: choosing by your schedule, not your mood" },
  { key: "screen-time", category: "mindset", en: "Screen addiction: trading less to earn more" },
  { key: "backtest", category: "tools", en: "Backtesting a setup in 30 minutes with the TradingView replay tool" },
  { key: "risk-reward", category: "risk", en: "Why a 1:2 risk-to-reward changes everything about win rate" },
  { key: "breakeven", category: "execution", en: "Moving to break-even too early: when it helps and when it hurts" },
  { key: "multiple-timeframes", category: "strategy", en: "Top-down analysis: daily bias, 1H structure, 5M entry" },
  { key: "prop-firm", category: "risk", en: "Prop firm challenges: daily drawdown rules and how traders fail them" },
  { key: "expectations", category: "mindset", en: "Realistic monthly returns for a retail trader (and why 97% win rate claims are a red flag)" },
  { key: "telegram-groups", category: "mindset", en: "How to evaluate a signal group: track record, risk disclosure, transparency" },
  { key: "broker-choice", category: "tools", en: "Choosing a broker for gold: spreads, execution, regulation and deposits" },
  { key: "mt5-setup", category: "tools", en: "Setting up MT5 for gold: one-click trading, risk calculator, alerts" },
  { key: "alerts", category: "tools", en: "Using price alerts so you stop staring at charts" },
  { key: "asian-range", category: "strategy", en: "Trading the Asian range breakout on XAUUSD" },
  { key: "fomc", category: "strategy", en: "FOMC days on gold: the three typical patterns and a plan for each" },
  { key: "losing-streak", category: "mindset", en: "Five losses in a row: is the strategy broken or is it variance?" },
  { key: "checklist", category: "execution", en: "A pre-trade checklist you can run in 60 seconds" },
  { key: "hedging", category: "risk", en: "Hedging on the same account: why it usually makes things worse" },
  { key: "martingale", category: "risk", en: "Martingale and grid bots on gold: how they blow up accounts" },
  { key: "weekend-gaps", category: "risk", en: "Weekend gaps on gold: holding trades over Friday close" },
  { key: "entries-limit", category: "execution", en: "Limit orders vs market orders on gold: getting better fills" },
  { key: "mindset-identity", category: "mindset", en: "Trading as a business: monthly review, fixed risk, no heroics" },
  { key: "sleep", category: "mindset", en: "Sleep, caffeine and tilt: how your body ruins your trades" },
];

export type ArticleDraft = { title_ms: string; title_en: string; excerpt_ms: string; excerpt_en: string; body_ms: string; body_en: string; read_minutes: number };

const SCHEMA = {
  type: "object", additionalProperties: false,
  required: ["title_ms", "title_en", "excerpt_ms", "excerpt_en", "body_ms", "body_en", "read_minutes"],
  properties: {
    title_ms: { type: "string" }, title_en: { type: "string" },
    excerpt_ms: { type: "string" }, excerpt_en: { type: "string" },
    body_ms: { type: "string" }, body_en: { type: "string" },
    read_minutes: { type: "integer", minimum: 2, maximum: 15 },
  },
};

const SYSTEM = `You write educational articles for ${BRAND.name}, a Gold (XAUUSD) trading education community based in Malaysia with members in Malaysia, Singapore, Brunei and Indonesia.

Audience: retail traders from beginner to intermediate. Tone: direct, practical, warm, no hype. Style similar to well-known trading education blogs: a relatable problem, why it happens, a concrete method to fix it, a short example on gold, and a closing checklist.

Rules:
- Education only. Never promise profits, never state win rates, never say "guaranteed", "risk-free", "easy money".
- Include one short risk reminder near the end: trading CFDs on margin carries high risk and you can lose more than your deposit.
- Write BOTH languages fully: Bahasa Melayu (natural Malaysian register, not Indonesian, keep common trading terms in English like entry, stop loss, take profit, drawdown) and English.
- Markdown body: H2 sections, short paragraphs, bullet lists, one bold key takeaway per section. 600 to 900 words per language. No H1 (title is separate). No links.
- Excerpt: one sentence, max 160 characters, per language.
- Do not mention competitors or specific brokers. You may mention that ${BRAND.name} members can ask in the community.`;

export function pickTopic(usedKeys: string[]) {
  const unused = TOPICS.filter((t) => !usedKeys.includes(t.key));
  const pool = unused.length ? unused : TOPICS; // cycle when exhausted
  return pool[Math.floor(Math.random() * pool.length)];
}

export function slugify(s: string) {
  return s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-").slice(0, 80);
}

export async function generateArticle(topicKey?: string) {
  if (!llmConfigured()) throw new Error("No LLM API key set (GEMINI_API_KEY, GROQ_API_KEY, OPENROUTER_API_KEY or ANTHROPIC_API_KEY)");
  const recent = await db.select({ k: articles.topicKey }).from(articles).orderBy(desc(articles.publishedAt)).limit(TOPICS.length - 5);
  const topic = topicKey ? TOPICS.find((t) => t.key === topicKey) ?? pickTopic([]) : pickTopic(recent.map((r) => r.k));
  const { json: draft, model } = await generateJson<ArticleDraft>({
    system: SYSTEM, schema: SCHEMA, maxTokens: 6000,
    user: `Topic (category: ${topic.category}): ${topic.en}\n\nWrite today's article as JSON matching the schema.`,
  });
  for (const k of ["title_ms", "title_en", "excerpt_ms", "excerpt_en", "body_ms", "body_en"] as const) if (!draft[k]) throw new Error(`model output missing ${k}`);
  draft.read_minutes = Math.min(15, Math.max(2, Number(draft.read_minutes) || 5));
  let slug = slugify(draft.title_en) || topic.key;
  const [clash] = await db.select({ id: articles.id }).from(articles).where(eq(articles.slug, slug));
  if (clash) slug = `${slug}-${Date.now().toString(36)}`;
  const [row] = await db.insert(articles).values({
    slug, topicKey: topic.key, category: topic.category,
    titleMs: draft.title_ms, titleEn: draft.title_en, excerptMs: draft.excerpt_ms, excerptEn: draft.excerpt_en,
    bodyMs: draft.body_ms, bodyEn: draft.body_en, readMinutes: draft.read_minutes, model,
  }).returning();
  return row;
}

/** Daily job: generate one article if none was published in the last 20 hours. */
export async function ensureDailyArticle() {
  const [last] = await db.select({ at: articles.publishedAt }).from(articles).orderBy(desc(articles.publishedAt)).limit(1);
  if (last && Date.now() - last.at.getTime() < 20 * 36e5) return null;
  const row = await generateArticle();
  await announceArticle(row.id).catch((e) => console.error("[articles] announce", e));
  return row;
}

export async function announceArticle(id: string) {
  const bot = getBot();
  const [a] = await db.select().from(articles).where(eq(articles.id, id));
  if (!bot || !a || !CHATS.public) return;
  await bot.api.sendMessage(CHATS.public,
    `📚 <b>${a.titleMs}</b>\n${a.excerptMs}\n\n${BRAND.siteUrl}/education/${a.slug}`,
    { parse_mode: "HTML" });
}

export async function listArticles(limit = 30, category?: string) {
  return db.select().from(articles).where(category ? sql`${articles.published} = true and ${articles.category} = ${category}` : eq(articles.published, true))
    .orderBy(desc(articles.publishedAt)).limit(limit);
}
export const CATEGORIES = [...new Set(TOPICS.map((t) => t.category))];
export const CATEGORY_EMOJI: Record<string, string> = { mindset: "🧠", risk: "🛡️", strategy: "🎯", execution: "⚡", tools: "🧰" };


/** Published within the last 48 hours (kept out of components for the purity lint). */
export function isFresh(d: Date, hours = 48) { return Date.now() - d.getTime() < hours * 36e5; }
