import { Bot, InlineKeyboard, InputFile, webhookCallback, type Context } from "grammy";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { ibAccounts, products, telegramAccounts, users } from "@/db/schema";
import { BRAND } from "@/config/brand";
import { TIERS, fmtUsd, tierLabel } from "@/config/tiers";
import { effectiveTier } from "@/lib/entitlements";
import { tierByKey } from "@/config/tiers";
import { CHATS, escapeHtml } from "@/lib/telegram";
import { approveIbAccount, rejectIbAccount } from "@/lib/ib";

type VerifyState = { step: "region" | "account" | "name" | "balance" | "photo"; region?: string; accountNo?: string; fullName?: string; balance?: string };

const T = {
  ms: {
    welcome: (n: string) => `<b>${n}</b>. Signal emas (XAUUSD) dengan rekod awam.\n\nDua cara masuk:\n<b>A.</b> Akaun HFM melalui link kami. General: tanpa deposit. A-Team: $100. Rambo: $500.\n<b>B.</b> Pelan bulanan dengan broker sendiri.\n\n⚠️ Dagangan CFD berisiko tinggi. Pendidikan sahaja, bukan nasihat kewangan.`,
    btn_channel: "Channel awam", btn_hfm: "Buka akaun HFM", btn_verify: "Sahkan akaun HFM", btn_plans: "Lihat pangkat", btn_guide: "Panduan daftar",
    region: "Pilih rantau akaun HFM anda:", ask_account: "Hantar nombor akaun MT4/MT5 anda:", ask_name: "Nama penuh (seperti dalam HFM):", ask_balance: "Baki akaun sekarang dalam USD (contoh: 120):", ask_photo: "Hantar screenshot akaun (nama + nombor akaun + baki kelihatan):",
    submitted: "Dihantar. Pengesahan dalam 24 jam. Bot akan hantar link group anda.",
    bad_account: "Nombor akaun tak sah. Hantar nombor sahaja (5–12 digit).",
    status: (tier: string, exp: string) => `Pangkat semasa: <b>${tierLabel(tier)}</b>${exp}`,
    no_link: "Akaun Telegram ini belum dipautkan ke akaun web. Log masuk di laman web dan pautkan Telegram, atau guna /verify.",
    plans: "Pangkat (bulanan, atau tanpa yuran melalui HFM):",
    support: "Hubungi sokongan:", help: "Arahan: /start /verify /status /upgrade /plans /products /ebook /copier /news /mystats /leaderboard /language /support",
  },
  en: {
    welcome: (n: string) => `<b>${n}</b>. Gold (XAUUSD) signals with a public record.\n\nTwo ways in:\n<b>A.</b> HFM account under our link. General: no deposit. A-Team: $100. Rambo: $500.\n<b>B.</b> Monthly plan on your own broker.\n\n⚠️ CFD trading carries high risk. Education only, not financial advice.`,
    btn_channel: "Public channel", btn_hfm: "Open HFM account", btn_verify: "Verify HFM account", btn_plans: "See ranks", btn_guide: "Registration guide",
    region: "Pick your HFM account region:", ask_account: "Send your MT4/MT5 account number:", ask_name: "Full name (as in HFM):", ask_balance: "Current account balance in USD (e.g. 120):", ask_photo: "Send an account screenshot (name + account number + balance visible):",
    submitted: "Submitted. Verification within 24h. The bot sends your group link.",
    bad_account: "Invalid account number. Send digits only (5–12).",
    status: (tier: string, exp: string) => `Current rank: <b>${tierLabel(tier)}</b>${exp}`,
    no_link: "This Telegram account is not linked to a web account yet. Sign in on the website and link Telegram, or use /verify.",
    plans: "Ranks (monthly, or no fee via HFM):",
    support: "Contact support:", help: "Commands: /start /verify /status /upgrade /plans /products /ebook /copier /news /mystats /leaderboard /language /support",
  },
};
const fromCode = (code?: string | null) => (code?.startsWith("ms") || code?.startsWith("id") ? "ms" : code?.startsWith("en") ? "en" : null);
/** Reply language: /language choice, else linked web account locale, else the Telegram client language. */
async function langOf(ctx: Context): Promise<"ms" | "en"> {
  const id = ctx.from?.id;
  if (id) {
    const [r] = await db.select({ code: telegramAccounts.languageCode, locale: users.locale })
      .from(telegramAccounts).leftJoin(users, eq(users.telegramId, telegramAccounts.telegramId))
      .where(eq(telegramAccounts.telegramId, String(id))).catch(() => []);
    if (r?.code === "ms" || r?.code === "en") return r.code;
    if (r?.locale === "ms" || r?.locale === "en") return r.locale;
  }
  return fromCode(ctx.from?.language_code) ?? "ms";
}

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

async function setLanguage(id: number, code: "ms" | "en") {
  await db.update(telegramAccounts).set({ languageCode: code }).where(eq(telegramAccounts.telegramId, String(id)));
  await db.update(users).set({ locale: code }).where(eq(users.telegramId, String(id))).catch(() => {});
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
    const t = T[await langOf(ctx)];
    const kb = new InlineKeyboard()
      .url(t.btn_channel, BRAND.telegram.publicChannel).row()
      .url(t.btn_hfm, BRAND.broker.links.my).url(t.btn_guide, BRAND.telegram.registerGuide).row()
      .text(t.btn_verify, "verify").url(t.btn_plans, `${BRAND.siteUrl}/pricing`);
    await ctx.reply(t.welcome(BRAND.name), { parse_mode: "HTML", reply_markup: kb, link_preview_options: { is_disabled: true } });
  });

  const startVerify = async (ctx: Context) => {
    await upsertTg(ctx);
    const t = T[await langOf(ctx)];
    await setState(ctx.from!.id, { step: "region" });
    await ctx.reply(t.region, { reply_markup: new InlineKeyboard().text("🇲🇾 🇸🇬 🇧🇳 MY / SG / BN", "region:my").text("🇮🇩 Indonesia", "region:id") });
  };
  bot.command("verify", startVerify);
  bot.callbackQuery("verify", async (ctx) => { await ctx.answerCallbackQuery(); await startVerify(ctx); });

  bot.callbackQuery(/^region:(my|id)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const t = T[await langOf(ctx)];
    await setState(ctx.from.id, { step: "account", region: ctx.match[1] });
    await ctx.reply(t.ask_account);
  });

  bot.command("status", async (ctx) => {
    await upsertTg(ctx);
    const t = T[await langOf(ctx)];
    const [u] = await db.select().from(users).where(eq(users.telegramId, String(ctx.from!.id)));
    if (!u) return ctx.reply(t.no_link);
    const tier = await effectiveTier(u.id);
    await ctx.reply(t.status(tier, ""), { parse_mode: "HTML" });
  });

  bot.command("plans", async (ctx) => {
    const t = T[await langOf(ctx)];
    const lines = TIERS.filter((x) => x.key !== "public").map((x) => `• <b>${tierLabel(x.key)}</b>: ${fmtUsd(x.priceMonthCents)}/mo, or HFM ${x.ibMinDepositUsd ? "+$" + x.ibMinDepositUsd : "no deposit"}`);
    await ctx.reply(`${t.plans}\n\n${lines.join("\n")}`, { parse_mode: "HTML", reply_markup: new InlineKeyboard().url(t.btn_plans, `${BRAND.siteUrl}/pricing`) });
  });
  bot.command("upgrade", async (ctx) => {
    await upsertTg(ctx);
    const [u] = await db.select().from(users).where(eq(users.telegramId, String(ctx.from!.id)));
    const tier = u ? await effectiveTier(u.id) : "public";
    const next = TIERS.find((x) => x.rank === (tierByKey(tier)?.rank ?? 0) + 1);
    if (!next) return ctx.reply((await langOf(ctx)) === "ms" ? "Anda sudah di pangkat tertinggi." : "You are already on the top rank.");
    const ms = (await langOf(ctx)) === "ms";
    const text = ms
      ? `Pangkat semasa: <b>${tierLabel(tier)}</b>\nNaik ke <b>${tierLabel(next.key)}</b>:\n• Deposit HFM sehingga $${next.ibMinDepositUsd} lalu /verify semula\n• atau bayar ${fmtUsd(next.priceMonthCents)}/bulan`
      : `Current rank: <b>${tierLabel(tier)}</b>\nUpgrade to <b>${tierLabel(next.key)}</b>:\n• Deposit HFM up to $${next.ibMinDepositUsd} then /verify again\n• or pay ${fmtUsd(next.priceMonthCents)}/month`;
    await ctx.reply(text, { parse_mode: "HTML", reply_markup: new InlineKeyboard().url(ms ? "Deposit HFM" : "Deposit at HFM", BRAND.broker.links.my).url(ms ? "Bayar" : "Pay", `${BRAND.siteUrl}/account?checkout=${next.key}`) });
  });

  bot.command("products", async (ctx) => {
    const rows = await db.select().from(products).where(eq(products.active, true));
    const ms = (await langOf(ctx)) === "ms";
    const lines = rows.map((p) => `• <b>${p.name}</b> — ${p.priceCents ? "$" + p.priceCents / 100 : (ms ? "Percuma" : "Free")}${p.tierIncluded ? ` (${ms ? "termasuk" : "included"} ${tierLabel(p.tierIncluded)})` : ""}`);
    await ctx.reply(`${ms ? "Kedai" : "Store"}:\n\n${lines.join("\n")}`, { parse_mode: "HTML", reply_markup: new InlineKeyboard().url(ms ? "Buka kedai" : "Open store", `${BRAND.siteUrl}/products`) });
  });

  bot.command("ebook", async (ctx) => {
    const lang = await langOf(ctx); const ms = lang === "ms";
    const { ebookCatalog } = await import("@/lib/ebooks");
    const { resolveProductFile } = await import("@/lib/files");
    const rows = await ebookCatalog(lang);
    const free = rows.find((p) => p.ebookTier === "free" && p.filePath);
    if (free?.filePath) {
      const f = resolveProductFile(free.filePath);
      const doc = f.kind === "file" ? new InputFile(f.abs) : f.kind === "url" ? new InputFile(new URL(f.url)) : f.kind === "telegram" ? f.fileId : null;
      if (doc) await ctx.replyWithDocument(doc, { caption: `${free.name} [${ms ? "Percuma" : "Free"}]` }).catch((e) => console.warn("[bot] ebook send failed", (e as Error).message));
    }
    const badge = { free: ms ? "Percuma" : "Free", standard: "Standard", premium: "Premium" } as const;
    const lines = rows.map((p) => {
      const tag = `[${badge[(p.ebookTier ?? "standard") as keyof typeof badge]}]`;
      const other = p.language && p.language !== lang ? ` (${p.language.toUpperCase()})` : "";
      const price = p.priceCents ? ` · $${p.priceCents / 100}` : "";
      const inc = p.tierIncluded ? ` · ${ms ? "dalam" : "in"} ${tierLabel(p.tierIncluded)}` : "";
      return `${tag} <b>${escapeHtml(p.name)}</b>${other}${price}${inc}`;
    });
    const kb = new InlineKeyboard().url(ms ? "Buka kedai" : "Open store", `${BRAND.siteUrl}/products?filter=ebook`).url(ms ? "Tuntut percuma" : "Claim free", `${BRAND.siteUrl}/?claim=free`);
    const foot = ms ? "Standard dan Premium: muat turun di /account bila pangkat anda termasuk, atau beli di kedai." : "Standard and Premium: download at /account when your rank includes them, or buy in the store.";
    await ctx.reply(`${ms ? "<b>Ebook</b>" : "<b>Ebooks</b>"}\n\n${lines.join("\n") || (ms ? "Tiada ebook lagi." : "No ebooks yet.")}\n\n<i>${foot}</i>`, { parse_mode: "HTML", reply_markup: kb });
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

  bot.command("copier", async (ctx) => {
    const ms = (await langOf(ctx)) === "ms";
    const [u] = await db.select().from(users).where(eq(users.telegramId, String(ctx.from!.id)));
    const kb = new InlineKeyboard().url(ms ? "Buka akaun" : "Open account", `${BRAND.siteUrl}/account`).url(ms ? "Panduan" : "Guide", `${BRAND.siteUrl}/copier`);
    if (!u) return ctx.reply(ms ? "Sambung akaun laman anda dahulu, kemudian cuba semula." : "Link your website account first, then try again.", { reply_markup: kb });
    const { copierLinksOf, ensureCopierLicense, isLive } = await import("@/lib/copier");
    const lic = await ensureCopierLicense(u.id).catch(() => null);
    if (!lic) {
      return ctx.reply(ms
        ? "Copier termasuk dalam pangkat Rambo, atau langgan berasingan di kedai."
        : "The copier comes with the Rambo rank, or subscribe to it on its own in the store.", { reply_markup: kb });
    }
    const links = await copierLinksOf(u.id);
    const lines = links.length
      ? links.map((l) => `${isLive(l.lastSeenAt) ? "✅" : "⚠️"} ${l.mt5Account} · ${l.riskMode === "percent" ? `${Number(l.riskPercent)}%` : `${Number(l.lotFixed)} lot`}${l.enabled ? "" : ms ? " · dijeda" : " · paused"}`)
      : [ms ? "Tiada terminal lagi. Ikut panduan pemasangan." : "No terminal yet. Follow the setup guide."];
    const text = `<b>${ms ? "Copier MT5" : "MT5 copier"}</b>\n\n${ms ? "Kunci" : "Key"}: <code>${lic.id}</code>\n\n${lines.join("\n")}`;
    return ctx.reply(text, { parse_mode: "HTML", reply_markup: kb });
  });

  bot.command("news", async (ctx) => {
    const ms = (await langOf(ctx)) === "ms";
    const { getHighImpact, fmtMyt } = await import("@/lib/news");
    const ev = (await getHighImpact().catch(() => [])).slice(0, 8);
    if (!ev.length) return ctx.reply(ms ? "Tiada berita impak tinggi USD dalam feed buat masa ini." : "No high-impact USD news in the feed right now.");
    const lines = ev.map((e) => `🔴 <b>${escapeHtml(e.title)}</b>\n${fmtMyt(e.date)} MYT${e.forecast ? ` · ${ms ? "ramalan" : "fcst"} ${escapeHtml(e.forecast)}` : ""}`);
    return ctx.reply(`${ms ? "<b>Berita impak tinggi minggu ini</b>" : "<b>High-impact news this week</b>"}\n\n${lines.join("\n\n")}\n\n<i>${ms ? "Elak entry baru 30 minit sebelum/selepas berita merah." : "Avoid new entries 30 min before/after red news."}</i>`, { parse_mode: "HTML" });
  });
  bot.command("language", async (ctx) => {
    await upsertTg(ctx);
    const arg = (ctx.match ?? "").toString().trim().toLowerCase();
    if (arg !== "ms" && arg !== "en") {
      return ctx.reply("/language ms: Bahasa Melayu\n/language en: English", { reply_markup: new InlineKeyboard().text("Bahasa Melayu", "lang:ms").text("English", "lang:en") });
    }
    await setLanguage(ctx.from!.id, arg);
    return ctx.reply(arg === "ms" ? "Bahasa ditukar ke Bahasa Melayu ✅" : "Language set to English ✅");
  });
  bot.callbackQuery(/^lang:(ms|en)$/, async (ctx) => {
    const code = ctx.match[1] as "ms" | "en";
    await setLanguage(ctx.from.id, code);
    await ctx.answerCallbackQuery({ text: code === "ms" ? "Bahasa Melayu ✅" : "English ✅" });
    await ctx.editMessageText(code === "ms" ? "Bahasa ditukar ke Bahasa Melayu ✅" : "Language set to English ✅").catch(() => {});
  });

  bot.command("mystats", async (ctx) => {
    await upsertTg(ctx);
    const ms = (await langOf(ctx)) === "ms";
    const [u] = await db.select().from(users).where(eq(users.telegramId, String(ctx.from!.id)));
    if (!u) return ctx.reply(T[ms ? "ms" : "en"].no_link);
    const { memberDashboard } = await import("@/lib/dashboard");
    const d = await memberDashboard(u.id);
    const s = d.stats;
    const pct = (v: number) => `${Math.round(v * 100)}%`;
    const r = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(2)}R`;
    const basis = d.basis === "followed" ? (ms ? `${d.followedCount} signal yang anda tanda` : `${d.followedCount} signals you marked`) : (ms ? "semua signal pelan anda" : "all signals on your plan");
    const text = ms
      ? `<b>Statistik saya</b> · ${tierLabel(d.tier)}\nAsas: ${basis}\n\nDitutup: <b>${s.n}</b>\nKadar menang: <b>${s.n ? pct(s.winRate) : "—"}</b>\nPurata R: <b>${s.n ? s.avgR.toFixed(2) : "—"}</b>\nJumlah R: <b>${s.n ? r(s.totalR) : "—"}</b>\nR bulan ini: <b>${s.n ? r(d.monthR) : "—"}</b>\nSedang berjalan: <b>${d.running}</b>`
      : `<b>My stats</b> · ${tierLabel(d.tier)}\nBasis: ${basis}\n\nClosed: <b>${s.n}</b>\nWin rate: <b>${s.n ? pct(s.winRate) : "—"}</b>\nAverage R: <b>${s.n ? s.avgR.toFixed(2) : "—"}</b>\nTotal R: <b>${s.n ? r(s.totalR) : "—"}</b>\nR this month: <b>${s.n ? r(d.monthR) : "—"}</b>\nRunning: <b>${d.running}</b>`;
    await ctx.reply(text, { parse_mode: "HTML", reply_markup: new InlineKeyboard().url(ms ? "Buka dashboard" : "Open dashboard", `${BRAND.siteUrl}/dashboard`) });
  });

  bot.command("leaderboard", async (ctx) => {
    await upsertTg(ctx);
    const ms = (await langOf(ctx)) === "ms";
    const [u] = await db.select().from(users).where(eq(users.telegramId, String(ctx.from!.id)));
    const { referralLeaderboard } = await import("@/lib/dashboard");
    const lb = await referralLeaderboard(10, u?.id);
    const medal = (i: number) => (i === 1 ? "🥇" : i === 2 ? "🥈" : i === 3 ? "🥉" : `${i}.`);
    const lines = lb.top.map((r) => `${medal(r.rank)} ${escapeHtml(r.label)} — <b>${r.activated}</b>${u && r.userId === u.id ? (ms ? " (anda)" : " (you)") : ""}`);
    const mine = lb.mine ? (ms ? `\n\nKedudukan anda: <b>#${lb.mine.rank}</b> daripada ${lb.total}` : `\n\nYour rank: <b>#${lb.mine.rank}</b> of ${lb.total}`) : (ms ? "\n\nBelum ada rujukan aktif." : "\n\nNo active referrals yet.");
    const link = u?.referralCode ? `\n${ms ? "Link rujukan anda" : "Your referral link"}: ${BRAND.siteUrl}/?ref=${u.referralCode}` : `\n${ms ? "Pautkan akaun web untuk dapat link rujukan." : "Link your web account to get a referral link."}`;
    await ctx.reply(`<b>${ms ? "Papan pendahulu rujukan" : "Referral leaderboard"}</b>\n${ms ? "Rakan yang aktifkan pangkat dikira." : "Friends who activated a rank count."}\n\n${lines.join("\n") || "—"}${mine}${link}`, { parse_mode: "HTML", link_preview_options: { is_disabled: true } });
  });

  bot.command("support", async (ctx) => ctx.reply(`${T[await langOf(ctx)].support} ${BRAND.telegram.support}`));
  bot.command("help", async (ctx) => ctx.reply(T[await langOf(ctx)].help));

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
    const t = T[await langOf(ctx)];
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
