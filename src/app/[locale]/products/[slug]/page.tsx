import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { db } from "@/db";
import { products } from "@/db/schema";
import { eq } from "drizzle-orm";
import { JsonLd, absUrl, localePath, pageMetadata } from "@/lib/seo";
import { BRAND } from "@/config/brand";
export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const [p] = await db.select().from(products).where(eq(products.slug, slug)).catch(() => []);
  if (!p) return {};
  return pageMetadata({ locale, path: `/products/${slug}`, title: p.name, description: p.description ?? "" });
}

export default async function Product({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params; setRequestLocale(locale);
  const t = await getTranslations("products");
  const [p] = await db.select().from(products).where(eq(products.slug, slug)).catch(() => []);
  if (!p) notFound();
  const ld = { "@context": "https://schema.org", "@type": "Product", name: p.name, description: p.description ?? undefined, url: absUrl(localePath(locale, `/products/${p.slug}`)), brand: { "@type": "Brand", name: BRAND.name }, offers: { "@type": "Offer", price: (p.priceCents / 100).toFixed(2), priceCurrency: "USD", availability: "https://schema.org/InStock", url: absUrl(localePath(locale, `/products/${p.slug}`)) } };
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <JsonLd data={ld} />
      <div className="text-xs uppercase text-muted">{p.type.replace("_", " ")}</div>
      <h1 className="mt-1 text-4xl font-semibold tracking-tight">{p.name}</h1>
      <p className="mt-4 text-muted text-lg">{p.description}</p>
      <div className="mt-8 glass rounded-2xl p-6 flex items-center justify-between">
        <div className="font-mono text-2xl">{p.priceCents ? `$${p.priceCents / 100}` : "Free"}<span className="text-sm text-muted font-sans"> {p.billing === "monthly" ? t("monthly") : p.billing === "lifetime" ? t("lifetime") : t("one_time")}</span></div>
        <Link href={`/account?product=${p.slug}`} className="rounded-md bg-gold text-black font-semibold px-5 py-2.5">{t("buy")}</Link>
      </div>
    </div>
  );
}
