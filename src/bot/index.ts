import { Bot, InlineKeyboard, webhookCallback, type Context } from "grammy";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { ibAccounts, products, telegramAccounts, users } from "@/db/schema";
import { BRAND } from "@/config/brand";
import { TIERS, fmtUsd } from "@/config/tiers";
import { effectiveTier } from "@/lib/entitlements";
import { tierByKey } from "@/config/tiers";
import { CHATS, escapeHtml } from "@/lib/telegram";
import { approveIbAccount, rejectIbAccount } from "@/lib/ib";

type VerifyState = { step: "region" | "account" | "name" | "balance" | "photo"; region?: string; accountNo?: string; fullName?: string; balance?: string };

const T = {
  ms: {
    welcome: (n: string) => `Selamat datang ke <b>${n}</b> 👋\n\nSignal emas (XAUUSD) dengan ketelusan penuh. Dua cara masuk:\n\n<b>A.</b> Buka akaun HFM guna link kami — Free tanpa deposit, Pro $100, Elite $500.\n<b>B.</b> Bayar pelan bulanan dengan broker sendiri.\n\n⚠️ Dagangan CFD berisiko tinggi. Pendidikan sahaja, bukan nasihat kewangan.`,
    btn_channel: "📢 Channel signal percuma", btn_hfm: "🏦 Daftar HFM", btn_verify: "✅ Sahkan akaun HFM", btn_plans: "💳 Lihat pelan", btn_guide: "📖 Panduan daftar",
    region: "Pilih rantau akaun HFM anda:", ask_account: "Hantar nombor akaun MT4/MT5 anda:", ask_name: "Nama penuh (seperti dalam HFM):", ask_balance: "Baki akaun sekarang dalam USD (contoh: 120):", ask_photo: "Hantar screenshot akaun (nama + nombor akaun + baki kelihatan):",
    submitted: "Terima kasih! Permohonan dihantar. Admin akan sahkan dalam 24 jam dan bot akan hantar link group anda.",
    bad_account: "Nombor akaun tak sah. Hantar nombor sahaja (5–12 digit).",
    status: (tier: string, exp: string) => `Pelan semasa: <b>${tier.toUpperCase()}</b>${exp}`,
    no_link: "Akaun Telegram ini belum dipautkan ke akaun web. Log masuk di laman web dan pautkan Telegram, atau guna /verify.",
    plans: "Pelan (bayar bulanan, atau percuma melalui HFM):",
    support: "Hubungi sokongan:", help: "Arahan: /start /verify /status /upgrade /plans /products /ebook /news /support",
  },
  en: {
    welcome: (n: string) => `Welcome to <b>${n}</b> 👋\n\nGold (XAUUSD) signals with full transparency. Two ways in:\n\n<b>A.</b> Open an HFM account under our link — Free with no deposit, Pro $100, Elite $500.\n<b>B.</b> Pay a monthly plan on your own broker.\n\n⚠️ CFD trading carries high risk. Education only, not financial advice.`,
    btn_channel: "📢 Free signal channel", btn_hfm: "🏦 Open HFM account", btn_verify: "✅ Verify HFM account", btn_plans: "💳 See plans", btn_guide: "📖 Registration guide",
    region: "Pick your HFM account region:", ask_account: "Send your MT4/MT5 account number:", ask_name: "Full name (as in HFM):", ask_balance: "Current account balance in USD (e.g. 120):", ask_photo: "Send an account screenshot (name + account number + balance visible):",
    submitted: "Thanks! Submitted. An admin verifies within 24h and the bot will DM your group link.",
    bad_account: "Invalid account number. Send digits only (5–12).",
    status: (tier: string, exp: string) => `Current plan: <b>${tier.toUpperCase()}</b>${exp}`,
    no_link: "This Telegram account is not linked to a web account yet. Sign in on the website and link Telegram, or use /verify.",
    plans: "Plans (pay monthly, or free via HFM):",
    support: "Contact support:", help: "Commands: /start /verify /status /upgrade /plans /products /ebook /news /support",
  },
};
const lang = (ctx: Context) => (ctx.from?.language_code?.startsWith("ms") || ctx.from?.language_code?.startsWith("id") ? "ms" : "en");

async function upsertTg(ctx: Context, campaign?: string) {
  if (!ctx.from) return;
  await db.insert(telegramAccounts).values({
    telegramId: String(ctx.from.id), username: ctx.from.username, firstName: ctx.from.first_name,
    languageCode: ctx.from.language_code, campaign: campaign || undefined,
  }).onConflictDoUpdate({ target: telegramAccounts.telegramId, set: { username: ctx.from.username, lastSeenAt: new Date(), ...(campaign ? { campaign } : {}) } });
}
async function getState(id: number) {
  const [r] = await db.select({ state: telegramAccounts.state }).from(telegramAccounts).where(eq(telegramAccounts.telegramId, String(id)));
  return (r?.state?.verify as VerifyState | undefined) ?? null;
}
async function setState(id: number, verify: VerifyState | null) {
  await db.update(telegramAccounts).set({ state: verify ? { verify } : {} }).where(eq(telegramAccounts.telegramId, String(id)));
}

export function createBot(token: string) {
  // Providing botInfo skips the getMe() network call on first update (needed in serverless/webhook mode).
  const botId = process.env.TELEGRAM_BOT_ID;
  const username = process.env.NEXT_PUBLIC_TG_BOT_USERNAME;
  const botInfo = botId && username ? {
    id: Number(botId), is_bot: true as const, first_name: BRAND.name, username,
    can_join_groups: true, can_read_all_group_messages: false, supports_inline_queries: false,
    can_connect_to_business: false, has_main_web_app: false, has_topics_enabled: false,
    allows_users_to_create_topics: false, can_manage_bots: false, supports_join_request_queries: false,
  } : undefined;
  const bot = new Bot(token, { botInfo, client: { timeoutSeconds: 20 } });

  bot.command("start", async (ctx) => {
    const payload = ctx.match?.trim();
    await upsertTg(ctx, payload?.startsWith("link_") ? undefined : payload);
    if (payload?.startsWith("link_") && ctx.from) {
      // Link this Telegram account to a web user (deep link from /account).
      const userId = payload.slice(5);
      await db.update(users).set({ telegramId: String(ctx.from.id), tgUsername: ctx.from.username }).where(eq(users.id, userId)).catch(() => {});
      await db.update(telegramAccounts).set({ userId }).where(eq(telegramAccounts.telegramId, String(ctx.from.id)));
      await ctx.reply("🔗 Telegram linked to your web account.");
    }
    const t = T[lang(ctx)];
    const kb = new InlineKeyboard()
      .url(t.btn_channel, BRAND.telegram.publicChannel).row()
      .url(t.btn_hfm, BRAND.broker.links.my).url(t.btn_guide, BRAND.telegram.registerGuide).row()
      .text(t.btn_verify, "verify").url(t.btn_plans, `${BRAND.siteUrl}/pricing`);
    await ctx.reply(t.welcome(BRAND.name), { parse_mode: "HTML", reply_markup: kb, link_preview_options: { is_disabled: true } });
  });

  const startVerify = async (ctx: Context) => {
    await upsertTg(ctx);
    const t = T[lang(ctx)];
    await setState(ctx.from!.id, { step: "region" });
    await ctx.reply(t.region, { reply_markup: new InlineKeyboard().text("🇲🇾 🇸🇬 🇧🇳 MY / SG / BN", "region:my").text("🇮🇩 Indonesia", "region:id") });
  };
  bot.command("verify", startVerify);
  bot.callbackQuery("verify", async (ctx) => { await ctx.answerCallbackQuery(); await startVerify(ctx); });

  bot.callbackQuery(/^region:(my|id)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const t = T[lang(ctx)];
    await setState(ctx.from.id, { step: "account", region: ctx.match[1] });
    await ctx.reply(t.ask_account);
  });

  bot.command("status", async (ctx) => {
    await upsertTg(ctx);
    const t = T[lang(ctx)];
    const [u] = await db.select().from(users).where(eq(users.telegramId, String(ctx.from!.id)));
    if (!u) return ctx.reply(t.no_link);
    const tier = await effectiveTier(u.id);
    await ctx.reply(t.status(tier, ""), { parse_mode: "HTML" });
  });

  bot.command("plans", async (ctx) => {
    const t = T[lang(ctx)];
    const lines = TIERS.filter((x) => x.key !== "public").map((x) => `• <b>${x.key.toUpperCase()}</b> — ${fmtUsd(x.priceMonthCents)}/mo · HFM ${x.ibMinDepositUsd ? "+$" + x.ibMinDepositUsd : "no deposit"}`);
    await ctx.reply(`${t.plans}\n\n${lines.join("\n")}`, { parse_mode: "HTML", reply_markup: new InlineKeyboard().url(t.btn_plans, `${BRAND.siteUrl}/pricing`) });
  });
  bot.command("upgrade", async (ctx) => {
    await upsertTg(ctx);
    const [u] = await db.select().from(users).where(eq(users.telegramId, String(ctx.from!.id)));
    const tier = u ? await effectiveTier(u.id) : "public";
    const next = TIERS.find((x) => x.rank === (tierByKey(tier)?.rank ?? 0) + 1);
    if (!next) return ctx.reply(lang(ctx) === "ms" ? "Anda sudah di pelan tertinggi 🎉" : "You are already on the top plan 🎉");
    const ms = lang(ctx) === "ms";
    const text = ms
      ? `Pelan semasa: <b>${tier.toUpperCase()}</b>\nNaik ke <b>${next.key.toUpperCase()}</b>:\n• Deposit HFM sehingga $${next.ibMinDepositUsd} lalu /verify semula\n• atau bayar ${fmtUsd(next.priceMonthCents)}/bulan`
      : `Current plan: <b>${tier.toUpperCase()}</b>\nUpgrade to <b>${next.key.toUpperCase()}</b>:\n• Deposit HFM up to $${next.ibMinDepositUsd} then /verify again\n• or pay ${fmtUsd(next.priceMonthCents)}/month`;
    await ctx.reply(text, { parse_mode: "HTML", reply_markup: new InlineKeyboard().url(ms ? "Deposit HFM" : "Deposit at HFM", BRAND.broker.links.my).url(ms ? "Bayar" : "Pay", `${BRAND.siteUrl}/account?checkout=${next.key}`) });
  });

  bot.command("products", async (ctx) => {
    const rows = await db.select().from(products).where(eq(products.active, true));
    const ms = lang(ctx) === "ms";
    const lines = rows.map((p) => `• <b>${p.name}</b> — ${p.priceCents ? "$" + p.priceCents / 100 : (ms ? "Percuma" : "Free")}${p.tierIncluded ? ` (${ms ? "termasuk" : "included"} ${p.tierIncluded.toUpperCase()})` : ""}`);
    await ctx.reply(`${ms ? "Kedai" : "Store"}:\n\n${lines.join("\n")}`, { parse_mode: "HTML", reply_markup: new InlineKeyboard().url(ms ? "Buka kedai" : "Open store", `${BRAND.siteUrl}/products`) });
  });

  bot.command("ebook", async (ctx) => {
    const [p] = await db.select().from(products).where(eq(products.slug, "ebook-gold-starter"));
    const ms = lang(ctx) === "ms";
    if (p?.filePath?.startsWith("tg:")) return ctx.replyWithDocument(p.filePath.slice(3), { caption: p.name });
    await ctx.reply(ms ? "Ebook akan dihantar tidak lama lagi. Sementara itu sertai channel awam 👇" : "Ebook coming shortly. Meanwhile join the public channel 👇", { reply_markup: new InlineKeyboard().url("📢 Channel", BRAND.telegram.publicChannel) });
  });

  // Auto-approve join requests when the user holds the right tier.
  bot.on("chat_join_request", async (ctx) => {
    const chatId = String(ctx.chatJoinRequest.chat.id);
    const needed = chatId === CHATS.elite ? "elite" : chatId === CHATS.pro ? "pro" : chatId === CHATS.free ? "free" : null;
    if (!needed) return;
    const [u] = await db.select().from(users).where(eq(users.telegramId, String(ctx.chatJoinRequest.from.id)));
    const tier = u ? await effectiveTier(u.id) : "public";
    if ((tierByKey(tier)?.rank ?? 0) >= (tierByKey(needed)?.rank ?? 99)) await ctx.approveChatJoinRequest(ctx.chatJoinRequest.from.id).catch(() => {});
    else await ctx.declineChatJoinRequest(ctx.chatJoinRequest.from.id).catch(() => {});
  });

  bot.command("news", async (ctx) => {
    const ms = lang(ctx) === "ms";
    const { getHighImpact, fmtMyt } = await import("@/lib/news");
    const ev = (await getHighImpact().catch(() => [])).slice(0, 8);
    if (!ev.length) return ctx.reply(ms ? "Tiada berita impak tinggi USD dalam feed buat masa ini." : "No high-impact USD news in the feed right now.");
    const lines = ev.map((e) => `🔴 <b>${escapeHtml(e.title)}</b>\n${fmtMyt(e.date)} MYT${e.forecast ? ` · ${ms ? "ramalan" : "fcst"} ${escapeHtml(e.forecast)}` : ""}`);
    return ctx.reply(`${ms ? "📅 <b>Berita impak tinggi minggu ini</b>" : "📅 <b>High-impact news this week</b>"}\n\n${lines.join("\n\n")}\n\n<i>${ms ? "Elak entry baru 30 minit sebelum/selepas berita merah." : "Avoid new entries 30 min before/after red news."}</i>`, { parse_mode: "HTML" });
  });
  bot.command("support", async (ctx) => ctx.reply(`${T[lang(ctx)].support} ${BRAND.telegram.support}`));
  bot.command("help", async (ctx) => ctx.reply(T[lang(ctx)].help));

  // Admin approve/reject from the notification message.
  bot.callbackQuery(/^ib:(approve|reject):(.+)$/, async (ctx) => {
    if (!CHATS.admin || String(ctx.chat?.id) !== CHATS.admin) return ctx.answerCallbackQuery({ text: "Not allowed" });
    const [, action, id] = ctx.match;
    const res = action === "approve" ? await approveIbAccount(id) : await rejectIbAccount(id, "Rejected via Telegram");
    await ctx.answerCallbackQuery({ text: res.ok ? "Done" : res.error });
    if (res.ok) await ctx.editMessageReplyMarkup({ reply_markup: undefined }).catch(() => {});
  });

  // Conversation steps for /verify (text + photo).
  bot.on("message", async (ctx) => {
    if (!ctx.from) return;
    const st = await getState(ctx.from.id);
    if (!st) return;
    const t = T[lang(ctx)];
    const text = ctx.message.text?.trim();
    if (st.step === "account") {
      if (!text || !/^\d{5,12}$/.test(text)) return ctx.reply(t.bad_account);
      await setState(ctx.from.id, { ...st, step: "name", accountNo: text }); return ctx.reply(t.ask_name);
    }
    if (st.step === "name") {
      if (!text) return;
      await setState(ctx.from.id, { ...st, step: "balance", fullName: text.slice(0, 80) }); return ctx.reply(t.ask_balance);
    }
    if (st.step === "balance") {
      const bal = Number((text ?? "").replace(/[^0-9.]/g, ""));
      if (!Number.isFinite(bal)) return ctx.reply(t.ask_balance);
      await setState(ctx.from.id, { ...st, step: "photo", balance: String(bal) }); return ctx.reply(t.ask_photo);
    }
    if (st.step === "photo") {
      const photo = ctx.message.photo?.at(-1);
      if (!photo) return ctx.reply(t.ask_photo);
      const [u] = await db.select().from(users).where(eq(users.telegramId, String(ctx.from.id)));
      const [row] = await db.insert(ibAccounts).values({
        userId: u?.id, telegramId: String(ctx.from.id), region: st.region ?? "my", accountNo: st.accountNo!, fullName: st.fullName,
        balanceUsd: st.balance, screenshotPath: `tg:${photo.file_id}`, status: "pending",
      }).onConflictDoUpdate({ target: [ibAccounts.broker, ibAccounts.accountNo], set: { telegramId: String(ctx.from.id), fullName: st.fullName, balanceUsd: st.balance, screenshotPath: `tg:${photo.file_id}`, status: "pending" } }).returning();
      await setState(ctx.from.id, null);
      await ctx.reply(t.submitted);
      if (CHATS.admin) {
        await bot.api.sendPhoto(CHATS.admin, photo.file_id, {
          caption: `🆕 IB verify\n@${escapeHtml(ctx.from.username ?? "-")} (${ctx.from.id})\nAcc: <code>${escapeHtml(st.accountNo)}</code>\nName: ${escapeHtml(st.fullName)}\nBalance: $${escapeHtml(st.balance)}\nRegion: ${st.region}`,
          parse_mode: "HTML",
          reply_markup: new InlineKeyboard().text("✅ Approve", `ib:approve:${row.id}`).text("❌ Reject", `ib:reject:${row.id}`),
        }).catch((e) => console.error("[bot] admin notify failed", e));
      }
    }
  });

  bot.catch((err) => console.error("[bot]", err.error));
  return bot;
}

let handler: ((req: Request) => Promise<Response>) | null = null;
export function createWebhookHandler(token: string, secret: string) {
  handler ??= webhookCallback(createBot(token), "std/http", { secretToken: secret, timeoutMilliseconds: 25_000 });
  return handler;
}
