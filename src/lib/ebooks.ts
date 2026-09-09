import { and, asc, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { products } from "@/db/schema";

export type Locale = "ms" | "en";
export type Ebook = typeof products.$inferSelect;
const asLocale = (v?: string | null): Locale => (v === "en" ? "en" : "ms");
const langRank = (loc: Locale) => (l: string | null) => (l === loc ? 0 : l ? 2 : 1);
const TIER_ORDER = { free: 0, standard: 1, premium: 2 } as const;

/** Every active ebook, reader's language first, then the other language, then untagged; Free → Standard → Premium inside each. */
export async function ebookCatalog(locale?: string | null) {
  const loc = asLocale(locale); const rank = langRank(loc);
  const rows = await db.select().from(products).where(and(eq(products.active, true), eq(products.type, "ebook"))).orderBy(asc(products.createdAt)).catch(() => [] as Ebook[]);
  const tier = (t: string | null) => TIER_ORDER[(t ?? "premium") as keyof typeof TIER_ORDER] ?? 3;
  return rows.sort((a, b) => rank(a.language) - rank(b.language) || tier(a.ebookTier) - tier(b.ebookTier));
}

/** Active Free tier ebooks, the reader's language first, then the other language, then untagged. */
export async function freeEbooks(locale?: string | null) {
  return (await ebookCatalog(locale)).filter((p) => p.ebookTier === "free");
}

/** The one Free ebook handed to leads and to the bot's /ebook: first match for the language. */
export async function leadEbook(locale?: string | null) {
  return (await freeEbooks(locale))[0] ?? null;
}

/** The same title in the other language, if linked. */
export async function ebookTwin(p: { pairSlug: string | null }) {
  if (!p.pairSlug) return null;
  const [t] = await db.select().from(products).where(and(eq(products.slug, p.pairSlug), eq(products.active, true))).catch(() => []);
  return t ?? null;
}

const words = (s: string) => new Set(s.toLowerCase().replace(/[^a-z0-9]+/g, " ").split(" ").filter((w) => w.length >= 4));

/**
 * Keep EN/MS twins linked both ways after an admin save.
 * No twin chosen: pick the ebook in the other language with the same tier, no twin yet, and a shared word of 4+ letters in the name.
 * Then write the reciprocal link and clear a previous twin that no longer points here.
 */
export async function linkEbookTwin(row: { id: string; slug: string; type: string; language: string | null; ebookTier: string | null; name: string; pairSlug: string | null }) {
  if (row.type !== "ebook" || !row.language) return;
  let pair = row.pairSlug;
  if (!pair) {
    const other = row.language === "en" ? "ms" : "en";
    const mine = words(row.name);
    const cands = await db.select().from(products).where(and(eq(products.type, "ebook"), eq(products.language, other), ne(products.id, row.id)));
    pair = cands.find((c) => !c.pairSlug && c.ebookTier === row.ebookTier && [...words(c.name)].some((w) => mine.has(w)))?.slug ?? null;
    if (pair) await db.update(products).set({ pairSlug: pair }).where(eq(products.id, row.id));
  }
  // clear stale reciprocal links, then set the new one
  await db.update(products).set({ pairSlug: null }).where(and(eq(products.pairSlug, row.slug), ne(products.slug, pair ?? "")));
  if (pair) await db.update(products).set({ pairSlug: row.slug }).where(eq(products.slug, pair));
}

/** Active Free ebooks grouped by language, for the landing page deck. Untagged rows are dropped: a deck is one language. */
export async function freeEbooksByLanguage() {
  const rows = await freeEbooks("ms");
  const byLang = (l: Locale) => rows.filter((p) => p.language === l).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  return { ms: byLang("ms"), en: byLang("en") };
}
