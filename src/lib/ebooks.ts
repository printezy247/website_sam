import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { products } from "@/db/schema";

export type Locale = "ms" | "en";
const asLocale = (v?: string | null): Locale => (v === "en" ? "en" : "ms");

/** Active Free tier ebooks, the reader's language first, then the other language, then untagged. */
export async function freeEbooks(locale?: string | null) {
  const loc = asLocale(locale);
  const rows = await db.select().from(products).where(and(eq(products.active, true), eq(products.type, "ebook"), eq(products.ebookTier, "free"))).orderBy(asc(products.createdAt)).catch(() => []);
  const rank = (l: string | null) => (l === loc ? 0 : l ? 2 : 1);
  return rows.sort((a, b) => rank(a.language) - rank(b.language));
}

/** The one Free ebook handed to leads and to the bot's /ebook: first match for the language. */
export async function leadEbook(locale?: string | null) {
  return (await freeEbooks(locale))[0] ?? null;
}
