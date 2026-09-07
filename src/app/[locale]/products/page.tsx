import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { db } from "@/db";
import { products } from "@/db/schema";
import { eq } from "drizzle-orm";
export const dynamic = "force-dynamic";
export default async function Products({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params; setRequestLocale(locale);
  const t = await getTranslations("products");
  const tt = await getTranslations("tiers");
  const rows = await db.select().from(products).where(eq(products.active, true)).catch(() => []);
  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <h1 className="text-4xl font-semibold tracking-tight">{t("title")}</h1>
      <p className="text-muted mt-2">{t("subtitle")}</p>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {rows.map((p) => (
          <Link key={p.id} href={`/products/${p.slug}`} className="glass rounded-2xl p-5 hover:border-gold/40 flex flex-col">
            <div className="text-xs uppercase text-muted">{p.type.replace("_", " ")}</div>
            <div className="mt-1 font-semibold text-lg">{p.name}</div>
            <p className="mt-2 text-sm text-muted flex-1">{p.description}</p>
            <div className="mt-4 flex items-center justify-between">
              <span className="font-mono">{p.priceCents ? `$${p.priceCents / 100}` : "Free"}<span className="text-xs text-muted"> {p.billing === "monthly" ? t("monthly") : p.billing === "lifetime" ? t("lifetime") : t("one_time")}</span></span>
              {p.tierIncluded && <span className="text-[11px] text-gold border border-gold/30 rounded px-1.5 py-0.5">{t("included", { tier: tt(p.tierIncluded as "free") })}</span>}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
