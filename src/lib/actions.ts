"use server";
import { revalidatePath } from "next/cache";
import { eq, desc } from "drizzle-orm";
import { auth, requireAdmin } from "@/auth";
import { db } from "@/db";
import { ibAccounts, signals, signalEvents, tvAccessRequests, users } from "@/db/schema";
import { approveIbAccount, rejectIbAccount } from "@/lib/ib";
import { fanoutSignal, fanoutUpdate } from "@/lib/signals-fanout";
import { grantEntitlement } from "@/lib/entitlements";
import { BRAND } from "@/config/brand";
import type { TierKey } from "@/config/tiers";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

export async function submitIbVerification(fd: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("unauthenticated");
  const accountNo = str(fd, "accountNo");
  if (!/^\d{5,12}$/.test(accountNo)) throw new Error("invalid account number");
  const [u] = await db.select().from(users).where(eq(users.id, session.user.id));
  await db.insert(ibAccounts).values({
    userId: session.user.id, telegramId: u?.telegramId ?? undefined, region: str(fd, "region") || "my", accountNo,
    fullName: str(fd, "fullName"), balanceUsd: str(fd, "balance") || null, status: "pending",
  }).onConflictDoUpdate({ target: [ibAccounts.broker, ibAccounts.accountNo], set: { userId: session.user.id, fullName: str(fd, "fullName"), balanceUsd: str(fd, "balance") || null, status: "pending" } });
  revalidatePath("/account");
}

export async function unlinkTelegram() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("unauthenticated");
  await db.update(users).set({ telegramId: null, tgUsername: null }).where(eq(users.id, session.user.id));
  revalidatePath("/", "layout");
}

export async function requestTvAccess(fd: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("unauthenticated");
  await db.insert(tvAccessRequests).values({ userId: session.user.id, tvUsername: str(fd, "tvUsername") });
  revalidatePath("/account");
}

// ---- admin ----
export async function adminCreateSignal(fd: FormData) {
  if (!(await requireAdmin())) throw new Error("forbidden");
  const [s] = await db.insert(signals).values({
    instrument: str(fd, "instrument") || "XAUUSD", type: str(fd, "type") || "intraday", side: str(fd, "side"), entry: str(fd, "entry"), sl: str(fd, "sl"),
    tp1: str(fd, "tp1") || null, tp2: str(fd, "tp2") || null, tp3: str(fd, "tp3") || null, note: str(fd, "note") || null,
    visibility: str(fd, "visibility") || "pro", newsLockout: fd.get("newsLockout") === "on",
  }).returning();
  await fanoutSignal(s.id).catch((e) => console.error(e));
  revalidatePath("/admin/signals");
}

export async function adminUpdateSignal(fd: FormData) {
  if (!(await requireAdmin())) throw new Error("forbidden");
  const id = str(fd, "id"); const status = str(fd, "status");
  const resultR = str(fd, "resultR"); const resultPips = str(fd, "resultPips");
  const closing = ["tp1", "tp2", "tp3", "sl", "be", "closed"].includes(status);
  await db.update(signals).set({
    status, resultR: resultR || null, resultPips: resultPips || null, closedAt: closing ? new Date() : null,
  }).where(eq(signals.id, id));
  const text = str(fd, "text") || `${status.toUpperCase()}${resultR ? ` · ${Number(resultR) >= 0 ? "+" : ""}${resultR}R` : ""}`;
  await db.insert(signalEvents).values({ signalId: id, type: status, text });
  await fanoutUpdate(id, text).catch((e) => console.error(e));
  revalidatePath("/admin/signals"); revalidatePath("/results");
}

export async function adminApproveIb(fd: FormData) {
  if (!(await requireAdmin())) throw new Error("forbidden");
  const dep = str(fd, "depositUsd");
  await approveIbAccount(str(fd, "id"), dep ? Number(dep) : undefined);
  revalidatePath("/admin/ib");
}
export async function adminRejectIb(fd: FormData) {
  if (!(await requireAdmin())) throw new Error("forbidden");
  await rejectIbAccount(str(fd, "id"), str(fd, "note") || undefined);
  revalidatePath("/admin/ib");
}
export async function adminGrant(fd: FormData) {
  if (!(await requireAdmin())) throw new Error("forbidden");
  const days = Number(str(fd, "days") || 30);
  await grantEntitlement({ userId: str(fd, "userId"), tierKey: str(fd, "tier") as TierKey, source: "manual", expiresAt: new Date(Date.now() + days * 864e5) });
  revalidatePath("/admin/users");
}
export async function listPendingIb() {
  return db.select().from(ibAccounts).where(eq(ibAccounts.status, "pending")).orderBy(desc(ibAccounts.createdAt));
}

// ---- P1 ----
import { redirect } from "next/navigation";
import { broadcasts } from "@/db/schema";
import { parseCsv, pickHfmColumns } from "@/lib/csv";
import { sendBroadcast } from "@/lib/broadcast";

export async function adminImportHfmCsv(fd: FormData) {
  if (!(await requireAdmin())) throw new Error("forbidden");
  const file = fd.get("file");
  if (!(file instanceof File)) throw new Error("no file");
  const rows = parseCsv(await file.text());
  let matched = 0, approved = 0, refreshed = 0;
  const unmatched: string[] = [];
  if (rows.length) {
    const cols = pickHfmColumns(rows[0]);
    if (!cols.account) redirect(`/admin/ib/import?r=${encodeURIComponent("No account/login column found. Headers: " + Object.keys(rows[0]).join(", "))}`);
    for (const r of rows) {
      const acc = (r[cols.account] ?? "").replace(/\D/g, "");
      if (!acc) continue;
      const dep = Number((r[cols.deposit ?? ""] ?? r[cols.balance ?? ""] ?? "0").replace(/[^0-9.]/g, "")) || 0;
      const [ib] = await db.select().from(ibAccounts).where(eq(ibAccounts.accountNo, acc));
      if (!ib) { unmatched.push(acc); continue; }
      matched++;
      if (ib.status === "pending") { const res = await approveIbAccount(ib.id, dep); if (res.ok) approved++; }
      else { await db.update(ibAccounts).set({ depositUsd: String(dep) }).where(eq(ibAccounts.id, ib.id)); refreshed++; }
    }
  }
  revalidatePath("/admin/ib");
  redirect(`/admin/ib/import?r=${encodeURIComponent(`rows=${rows.length} matched=${matched} approved=${approved} refreshed=${refreshed}\nunmatched (first 20): ${unmatched.slice(0, 20).join(", ")}`)}`);
}

export async function adminCreateBroadcast(fd: FormData) {
  if (!(await requireAdmin())) throw new Error("forbidden");
  const tiers = fd.getAll("tiers").map(String).filter(Boolean);
  const sched = str(fd, "scheduledAt");
  await db.insert(broadcasts).values({ textMs: str(fd, "textMs"), textEn: str(fd, "textEn"), segment: { tiers }, scheduledAt: sched ? new Date(sched + "Z") : null });
  revalidatePath("/admin/broadcasts");
}
export async function adminSendBroadcast(fd: FormData) {
  if (!(await requireAdmin())) throw new Error("forbidden");
  await sendBroadcast(str(fd, "id"));
  revalidatePath("/admin/broadcasts");
}

// ---- P2 ----
import { products as productsTable, tvAccessRequests as tvTable } from "@/db/schema";
import { EBOOK_TIERS, ebookTierOf } from "@/config/tiers";
import { sendHtml } from "@/lib/telegram";

export async function adminTvDecision(fd: FormData) {
  if (!(await requireAdmin())) throw new Error("forbidden");
  const id = str(fd, "id"); const status = str(fd, "status") === "granted" ? "granted" : "rejected";
  const [r] = await db.update(tvTable).set({ status }).where(eq(tvTable.id, id)).returning();
  if (r) {
    const [u] = await db.select().from(users).where(eq(users.id, r.userId));
    if (u?.telegramId) await sendHtml(u.telegramId, status === "granted"
      ? `✅ TradingView access granted for <b>${r.tvUsername}</b>. Open the indicator from your Invite-only scripts.`
      : `❌ TradingView request for <b>${r.tvUsername}</b> was rejected. Check the username and try again from /account.`).catch(() => {});
  }
  revalidatePath("/admin/tv");
}

export async function adminUpsertProduct(fd: FormData) {
  if (!(await requireAdmin())) throw new Error("forbidden");
  const type = str(fd, "type");
  const ebookTier = type === "ebook" ? ebookTierOf(str(fd, "ebookTier")) : null;
  // An ebook tier decides which rank includes it unless the admin picked a rank explicitly.
  const tierIncluded = str(fd, "tierIncluded") || (ebookTier ? EBOOK_TIERS[ebookTier].includedIn : null);
  const row = {
    slug: str(fd, "slug"), name: str(fd, "name"), type, billing: str(fd, "billing"),
    priceCents: Number(str(fd, "priceCents") || 0), tierIncluded, ebookTier,
    stripePriceId: str(fd, "stripePriceId") || null, filePath: str(fd, "filePath") || null,
    description: str(fd, "description") || null, active: fd.get("active") === "on",
  };
  const id = str(fd, "id");
  if (id) await db.update(productsTable).set(row).where(eq(productsTable.id, id));
  else await db.insert(productsTable).values(row);
  revalidatePath("/admin/products"); revalidatePath("/products");
}

// ---- P3: education ----
import { articles as articlesTable } from "@/db/schema";
import { announceArticle, generateArticle } from "@/lib/articles";

export async function adminGenerateArticle(fd: FormData) {
  if (!(await requireAdmin())) throw new Error("forbidden");
  let msg: string;
  try {
    const row = await generateArticle(str(fd, "topic") || undefined);
    if (fd.get("announce") === "on") await announceArticle(row.id).catch(() => {});
    msg = `published: ${row.titleEn} (/education/${row.slug})`;
  } catch (e) { msg = `error: ${(e as Error).message}`; }
  revalidatePath("/education");
  redirect(`/admin/articles?r=${encodeURIComponent(msg)}`);
}
export async function adminToggleArticle(fd: FormData) {
  if (!(await requireAdmin())) throw new Error("forbidden");
  const id = str(fd, "id");
  const [a] = await db.select().from(articlesTable).where(eq(articlesTable.id, id));
  if (a) await db.update(articlesTable).set({ published: !a.published }).where(eq(articlesTable.id, id));
  revalidatePath("/education"); revalidatePath("/admin/articles");
}

// ---- member dashboard ----
export async function toggleFollowSignal(fd: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("unauthenticated");
  const { toggleFollow } = await import("@/lib/dashboard");
  await toggleFollow(session.user.id, str(fd, "signalId"));
  revalidatePath("/", "layout");
}

// ---- weekly recap ----
export async function adminBuildRecap(fd: FormData) {
  if (!(await requireAdmin())) throw new Error("forbidden");
  const { buildRecap, postRecap, weekStartOf } = await import("@/lib/recap");
  const weeksAgo = Number(str(fd, "weeksAgo") || 1);
  const r = await buildRecap(weekStartOf(new Date(), weeksAgo), true);
  if (fd.get("post") === "on") await postRecap(r.id);
  revalidatePath("/", "layout");
}

// ---- manual article CMS ----
export async function adminSaveArticle(fd: FormData) {
  if (!(await requireAdmin())) throw new Error("forbidden");
  const { slugify } = await import("@/lib/articles");
  const id = str(fd, "id");
  const titleEn = str(fd, "titleEn"), titleMs = str(fd, "titleMs") || titleEn;
  if (!titleEn && !titleMs) throw new Error("title required");
  const bodyEn = str(fd, "bodyEn"), bodyMs = str(fd, "bodyMs") || bodyEn;
  const plain = (md: string) => md.replace(/^#+\s.*$/gm, " ").replace(/[*_`>#-]+/g, " ").replace(/\s+/g, " ").trim();
  const row = {
    titleEn: titleEn || titleMs, titleMs, excerptEn: str(fd, "excerptEn") || plain(bodyEn || bodyMs).slice(0, 157) + "…", excerptMs: str(fd, "excerptMs") || plain(bodyMs || bodyEn).slice(0, 157) + "…",
    bodyEn: bodyEn || bodyMs, bodyMs, category: str(fd, "category") || "mindset", topicKey: str(fd, "topicKey") || "manual",
    readMinutes: Math.min(30, Math.max(1, Number(str(fd, "readMinutes")) || Math.ceil((bodyEn || bodyMs).split(/\s+/).length / 200))),
    published: fd.get("published") === "on", model: null as string | null,
  };
  let slug = str(fd, "slug") || slugify(row.titleEn) || `article-${Date.now().toString(36)}`;
  slug = slugify(slug) || slug;
  const [clash] = await db.select({ id: articlesTable.id }).from(articlesTable).where(eq(articlesTable.slug, slug));
  if (clash && clash.id !== id) slug = `${slug}-${Date.now().toString(36)}`;
  const pub = str(fd, "publishedAt");
  const publishedAt = pub && !Number.isNaN(Date.parse(pub)) ? new Date(pub) : undefined;
  let saved: { id: string };
  if (id) [saved] = await db.update(articlesTable).set({ ...row, slug, ...(publishedAt ? { publishedAt } : {}) }).where(eq(articlesTable.id, id)).returning({ id: articlesTable.id });
  else [saved] = await db.insert(articlesTable).values({ ...row, slug, ...(publishedAt ? { publishedAt } : {}) }).returning({ id: articlesTable.id });
  if (fd.get("announce") === "on" && row.published) await announceArticle(saved.id).catch(() => {});
  revalidatePath("/", "layout");
  redirect(`/admin/articles/edit?id=${saved.id}&r=${encodeURIComponent("saved")}`);
}

export async function adminDeleteArticle(fd: FormData) {
  if (!(await requireAdmin())) throw new Error("forbidden");
  await db.delete(articlesTable).where(eq(articlesTable.id, str(fd, "id")));
  revalidatePath("/", "layout");
  redirect("/admin/articles?r=deleted");
}

/** Fill the missing language (title/excerpt/body) from the one that is written, using the configured LLM. */
export async function adminTranslateArticle(fd: FormData) {
  if (!(await requireAdmin())) throw new Error("forbidden");
  const id = str(fd, "id");
  const [a] = await db.select().from(articlesTable).where(eq(articlesTable.id, id));
  if (!a) throw new Error("not found");
  const { generateJson, llmConfigured } = await import("@/lib/llm");
  if (!llmConfigured()) redirect(`/admin/articles/edit?id=${id}&r=${encodeURIComponent("error: no LLM key set")}`);
  const from = fd.get("from") === "ms" ? "ms" : "en";
  const src = from === "ms" ? { title: a.titleMs, excerpt: a.excerptMs, body: a.bodyMs } : { title: a.titleEn, excerpt: a.excerptEn, body: a.bodyEn };
  const target = from === "ms" ? "English" : "Bahasa Melayu (natural Malaysian register, keep trading terms like entry, stop loss, take profit in English)";
  let msg = "translated";
  try {
    const { json } = await generateJson<{ title: string; excerpt: string; body: string }>({
      system: `You translate trading-education articles for ${BRAND.name}. Translate faithfully into ${target}. Keep markdown structure (H2 headings, lists, bold). Education only, no promises. Return JSON {"title","excerpt","body"}.`,
      user: `TITLE: ${src.title}\n\nEXCERPT: ${src.excerpt}\n\nBODY:\n${src.body}`,
      schema: { type: "object", properties: { title: { type: "string" }, excerpt: { type: "string" }, body: { type: "string" } }, required: ["title", "excerpt", "body"] }, maxTokens: 6000,
    });
    const set = from === "ms" ? { titleEn: json.title, excerptEn: json.excerpt.slice(0, 160), bodyEn: json.body } : { titleMs: json.title, excerptMs: json.excerpt.slice(0, 160), bodyMs: json.body };
    await db.update(articlesTable).set(set).where(eq(articlesTable.id, id));
  } catch (e) { msg = `error: ${(e as Error).message}`; }
  revalidatePath("/", "layout");
  redirect(`/admin/articles/edit?id=${id}&r=${encodeURIComponent(msg)}`);
}
