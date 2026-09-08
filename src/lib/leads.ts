import { and, eq, isNull, lte, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { leads, products, users } from "@/db/schema";
import { DRIP, emailConfigured, sendEmail } from "@/lib/email";
import { BRAND } from "@/config/brand";

const EBOOK_SLUG = "ebook-gold-starter";

export async function ebookUrlFor(leadId: string) {
  const [p] = await db.select().from(products).where(eq(products.slug, EBOOK_SLUG));
  if (p?.filePath && /^https?:\/\//.test(p.filePath)) return p.filePath;
  return `${BRAND.siteUrl}/api/leads/${leadId}/ebook`;
}

export async function captureLead(input: { email: string; name?: string; locale?: string; source?: string }) {
  const email = input.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("invalid email");
  const [row] = await db.insert(leads).values({ email, name: input.name?.trim() || null, locale: input.locale === "en" ? "en" : "ms", source: input.source?.slice(0, 64) || null })
    .onConflictDoUpdate({ target: leads.email, set: { name: sql`coalesce(excluded.name, ${leads.name})` } }).returning();
  if (row.step === 0) await sendDrip(row.id, 0).catch((e) => console.error("[leads] welcome", e));
  return row;
}

async function sendDrip(leadId: string, step: number) {
  const [l] = await db.select().from(leads).where(eq(leads.id, leadId));
  const d = DRIP.find((x) => x.step === step);
  if (!l || !d) return false;
  const locale = (l.locale === "en" ? "en" : "ms") as "ms" | "en";
  const name = l.name || (locale === "ms" ? "trader" : "trader");
  if (emailConfigured()) await sendEmail(l.email, d.subject[locale], d.html({ name, locale, ebookUrl: await ebookUrlFor(l.id) }));
  await db.update(leads).set({ step: step + 1, lastEmailAt: new Date() }).where(eq(leads.id, leadId));
  return true;
}

/** Cron: send the next drip step to leads whose delay has passed and who have not become paying/IB members. */
export async function runDrip() {
  if (!emailConfigured()) return 0;
  let sent = 0;
  for (const d of DRIP.filter((x) => x.step > 0)) {
    const cutoff = new Date(Date.now() - d.delayDays * 864e5);
    const due = await db.select().from(leads).where(and(eq(leads.step, d.step), or(isNull(leads.lastEmailAt), lte(leads.lastEmailAt, cutoff))));
    for (const l of due) {
      const [u] = await db.select({ id: users.id }).from(users).where(eq(users.email, l.email));
      if (u) { await db.update(leads).set({ step: 99 }).where(eq(leads.id, l.id)); continue; } // signed up: stop drip
      if (await sendDrip(l.id, d.step).catch((e) => { console.error("[drip]", e); return false; })) sent++;
    }
  }
  return sent;
}
