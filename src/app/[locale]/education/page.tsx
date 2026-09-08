import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { listArticles, CATEGORIES } from "@/lib/articles";
export const dynamic = "force-dynamic";
export default async function Education({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ c?: string }> }) {
  const { locale } = await params; setRequestLocale(locale);
  const { c } = await searchParams;
  const t = await getTranslations("education");
  const rows = await listArticles(40, c).catch(() => []);
  const ms = locale === "ms";
  return (
    <div className="mx-auto max-w-5xl px-4 py-16">
      <h1 className="text-4xl font-semibold tracking-tight">{t("title")}</h1>
      <p className="text-muted mt-2">{t("subtitle")}</p>
      <div className="mt-6 flex flex-wrap gap-2 text-sm">
        <Link href="/education" className={`px-3 py-1 rounded border ${!c ? "border-gold text-gold" : "border-border"}`}>{t("all")}</Link>
        {CATEGORIES.map((cat) => <Link key={cat} href={`/education?c=${cat}`} className={`px-3 py-1 rounded border ${c === cat ? "border-gold text-gold" : "border-border"}`}>{t(`cat_${cat}`)}</Link>)}
      </div>
      {rows.length === 0 && <p className="mt-10 text-muted">{t("empty")}</p>}
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {rows.map((a, i) => (
          <Link key={a.id} href={`/education/${a.slug}`} className={`glass rounded-2xl p-6 hover:border-gold/40 flex flex-col ${i === 0 && !c ? "md:col-span-2 glow-gold" : ""}`}>
            <div className="text-xs uppercase text-gold">{t(`cat_${a.category}`)} · {a.readMinutes} min</div>
            <h2 className={`mt-2 font-semibold ${i === 0 && !c ? "text-2xl" : "text-lg"}`}>{ms ? a.titleMs : a.titleEn}</h2>
            <p className="mt-2 text-muted text-sm flex-1">{ms ? a.excerptMs : a.excerptEn}</p>
            <div className="mt-3 text-xs text-muted">{a.publishedAt.toISOString().slice(0, 10)}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
