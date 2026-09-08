import { getTranslations, setRequestLocale } from "next-intl/server";
import { pageMetadata } from "@/lib/seo";
import { Link } from "@/i18n/navigation";
import { listArticles, CATEGORIES, CATEGORY_EMOJI } from "@/lib/articles";
import { ArticleSearch } from "@/components/ArticleSearch";
export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "seo" });
  return pageMetadata({ locale, path: "/education", title: t("education_title"), description: t("education_description") });
}

export default async function Education({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ c?: string }> }) {
  const { locale } = await params; setRequestLocale(locale);
  const { c } = await searchParams;
  const t = await getTranslations("education");
  const rows = await listArticles(40, c).catch(() => []);
  const ms = locale === "ms";
  const fresh = Date.now() - 48 * 36e5;
  return (
    <div className="mx-auto max-w-5xl px-4 py-16">
      <h1 className="text-4xl font-semibold tracking-tight">{t("title")}</h1>
      <p className="text-muted mt-2">{t("subtitle")}</p>
      <div className="mt-6 flex flex-wrap items-center gap-2 text-sm">
        <Link href="/education" className={`px-3 py-1 rounded border ${!c ? "border-gold text-gold" : "border-border"}`}>{t("all")}</Link>
        {CATEGORIES.map((cat) => <Link key={cat} href={`/education?c=${cat}`} className={`px-3 py-1 rounded border ${c === cat ? "border-gold text-gold" : "border-border"}`}>{CATEGORY_EMOJI[cat]} {t(`cat_${cat}`)}</Link>)}
        <div className="sm:ml-auto w-full sm:w-auto"><ArticleSearch placeholder={t("search")} /></div>
      </div>
      {rows.length === 0 && <p className="mt-10 text-muted">{t("empty")}</p>}
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {rows.map((a, i) => (
          <Link key={a.id} href={`/education/${a.slug}`} data-article={`${a.titleMs} ${a.titleEn} ${a.excerptMs} ${a.excerptEn}`.toLowerCase()} className={`group glass rounded-2xl p-6 hover:border-gold/40 hover:-translate-y-0.5 transition flex flex-col ${i === 0 && !c ? "md:col-span-2 glow-gold" : ""}`}>
            <div className="flex items-center gap-2 text-xs uppercase text-gold">{CATEGORY_EMOJI[a.category]} {t(`cat_${a.category}`)} · ⏱ {a.readMinutes} min{a.publishedAt.getTime() > fresh && <span className="ml-auto rounded bg-gold text-black px-1.5 py-0.5 text-[10px] font-semibold">{t("new")}</span>}</div>
            <h2 className={`mt-2 font-semibold ${i === 0 && !c ? "text-2xl" : "text-lg"}`}>{ms ? a.titleMs : a.titleEn}</h2>
            <p className="mt-2 text-muted text-sm flex-1">{ms ? a.excerptMs : a.excerptEn}</p>
            <div className="mt-3 text-xs text-muted">{a.publishedAt.toISOString().slice(0, 10)}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
