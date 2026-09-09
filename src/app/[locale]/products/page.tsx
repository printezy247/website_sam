import { getTranslations, setRequestLocale } from "next-intl/server";
import { pageMetadata } from "@/lib/seo";
import { Link } from "@/i18n/navigation";
import { db } from "@/db";
import { products } from "@/db/schema";
import { eq } from "drizzle-orm";
import { EbookTierBadge } from "@/components/EbookTierBadge";
export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "seo" });
  return pageMetadata({ locale, path: "/products", title: t("products_title"), description: t("products_description") });
}

export default async function Products({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ filter?: string }> }) {
  const { locale } = await params; setRequestLocale(locale);
  const { filter = "all" } = await searchParams;
  const t = await getTranslations("products");
  const tt = await getTranslations("tiers");
  const all = await db.select().from(products).where(eq(products.active, true)).catch(() => []);
  const rows = filter === "ebook" ? all.filter((p) => p.type === "ebook") : filter === "tools" ? all.filter((p) => p.type !== "ebook") : all;
  const order = { free: 0, standard: 1, premium: 2 } as const;
  const langRank = (l: string | null) => (l === locale ? 0 : l ? 2 : 1);
  rows.sort((a, b) => langRank(a.language) - langRank(b.language) || (order[(a.ebookTier ?? "premium") as keyof typeof order] ?? 3) - (order[(b.ebookTier ?? "premium") as keyof typeof order] ?? 3));
  const bySlug = new Map(all.map((p) => [p.slug, p]));
  const tabs = [["all", t("filter_all")], ["ebook", t("filter_ebook")], ["tools", t("filter_tools")]] as const;
  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <h1 className="text-4xl font-semibold tracking-tight">{t("title")}</h1>
      <p className="text-muted mt-2">{t("subtitle")}</p>
      <div className="mt-6 inline-flex rounded-lg border border-border p-1 text-sm">
        {tabs.map(([k, label]) => (
          <Link key={k} href={k === "all" ? "/products" : `/products?filter=${k}`} className={`rounded-md px-3 py-1.5 ${filter === k ? "bg-gold text-black font-semibold" : "text-muted hover:text-fg"}`}>{label}</Link>
        ))}
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {rows.map((p) => { const twin = p.pairSlug ? bySlug.get(p.pairSlug) : undefined; return (
          <div key={p.id} className="flex flex-col gap-1">
          <Link href={`/products/${p.slug}`} className="glass lux rounded-2xl p-5 flex flex-col flex-1">
            <div className="flex items-center justify-between"><span className="text-xs uppercase text-muted">{p.type.replace("_", " ")}{p.language && <span className="ml-2 border border-border rounded px-1 py-px text-[10px]">{p.language}</span>}</span><EbookTierBadge tier={p.ebookTier} /></div>
            <div className="mt-1 font-semibold text-lg">{p.name}</div>
            <p className="mt-2 text-sm text-muted flex-1">{p.description}</p>
            <div className="mt-4 flex items-center justify-between">
              <span className="font-mono">{p.priceCents ? `$${p.priceCents / 100}` : "$0"}<span className="text-xs text-muted"> {p.billing === "monthly" ? t("monthly") : p.billing === "lifetime" ? t("lifetime") : t("one_time")}</span></span>
              {p.tierIncluded && <span className="text-[11px] text-gold border border-gold/30 rounded px-1.5 py-0.5">{t("included", { tier: tt(p.tierIncluded as "free") })}</span>}
            </div>
          </Link>
          {twin && <Link href={`/products/${twin.slug}`} locale={twin.language === "en" ? "en" : "ms"} className="text-xs text-muted hover:text-gold px-2">{t(twin.language === "en" ? "twin_en" : "twin_ms")}: {twin.name}</Link>}
          </div>
        ); })}
      </div>
    </div>
  );
}
