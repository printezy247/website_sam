import type { MetadataRoute } from "next";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { articles, products } from "@/db/schema";
import { routing } from "@/i18n/routing";
import { absUrl, localePath } from "@/lib/seo";

export const dynamic = "force-dynamic";

const STATIC: { path: string; priority: number; freq: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
  { path: "/", priority: 1, freq: "daily" },
  { path: "/pricing", priority: 0.9, freq: "weekly" },
  { path: "/results", priority: 0.9, freq: "daily" },
  { path: "/education", priority: 0.8, freq: "daily" },
  { path: "/products", priority: 0.7, freq: "weekly" },
  { path: "/legal/risk", priority: 0.2, freq: "yearly" },
  { path: "/legal/terms", priority: 0.2, freq: "yearly" },
  { path: "/legal/privacy", priority: 0.2, freq: "yearly" },
  { path: "/legal/ib-disclosure", priority: 0.2, freq: "yearly" },
];

function entries(path: string, priority: number, freq: MetadataRoute.Sitemap[number]["changeFrequency"], lastModified?: Date): MetadataRoute.Sitemap {
  const languages = Object.fromEntries(routing.locales.map((l) => [l, absUrl(localePath(l, path))]));
  return routing.locales.map((l) => ({
    url: absUrl(localePath(l, path)), priority, changeFrequency: freq, lastModified,
    alternates: { languages: { ...languages, "x-default": languages[routing.defaultLocale] } },
  }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [arts, prods] = await Promise.all([
    db.select({ slug: articles.slug, at: articles.publishedAt }).from(articles).where(eq(articles.published, true)).orderBy(desc(articles.publishedAt)).limit(1000).catch(() => []),
    db.select({ slug: products.slug }).from(products).where(eq(products.active, true)).catch(() => []),
  ]);
  return [
    ...STATIC.flatMap((s) => entries(s.path, s.priority, s.freq)),
    ...arts.flatMap((a) => entries(`/education/${a.slug}`, 0.6, "monthly", a.at)),
    ...prods.flatMap((p) => entries(`/products/${p.slug}`, 0.6, "monthly")),
  ];
}
