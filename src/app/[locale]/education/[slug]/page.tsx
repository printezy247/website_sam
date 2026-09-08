import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { and, desc, eq, gt, lt, ne } from "drizzle-orm";
import { Link } from "@/i18n/navigation";
import { db } from "@/db";
import { articles } from "@/db/schema";
import { extractHeadings, renderMarkdown } from "@/lib/markdown";
import { CATEGORY_EMOJI } from "@/lib/articles";
import { BRAND, botDeepLink } from "@/config/brand";
import { JsonLd, absUrl, localePath, pageMetadata } from "@/lib/seo";
import { ArticleEnhancer } from "@/components/ArticleEnhancer";
export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const [a] = await db.select().from(articles).where(eq(articles.slug, slug)).catch(() => []);
  if (!a) return {};
  return pageMetadata({ locale, path: `/education/${slug}`, title: locale === "ms" ? a.titleMs : a.titleEn, description: locale === "ms" ? a.excerptMs : a.excerptEn, type: "article", publishedTime: a.publishedAt.toISOString() });
}
export default async function Article({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params; setRequestLocale(locale);
  const t = await getTranslations("education");
  const [a] = await db.select().from(articles).where(eq(articles.slug, slug)).catch(() => []);
  if (!a || !a.published) notFound();
  const ms = locale === "ms";
  const [[prev], [next], related] = await Promise.all([
    db.select({ slug: articles.slug, titleMs: articles.titleMs, titleEn: articles.titleEn }).from(articles).where(and(eq(articles.published, true), lt(articles.publishedAt, a.publishedAt))).orderBy(desc(articles.publishedAt)).limit(1),
    db.select({ slug: articles.slug, titleMs: articles.titleMs, titleEn: articles.titleEn }).from(articles).where(and(eq(articles.published, true), gt(articles.publishedAt, a.publishedAt))).orderBy(articles.publishedAt).limit(1),
    db.select({ slug: articles.slug, titleMs: articles.titleMs, titleEn: articles.titleEn, readMinutes: articles.readMinutes, category: articles.category }).from(articles).where(and(eq(articles.published, true), eq(articles.category, a.category), ne(articles.id, a.id))).orderBy(desc(articles.publishedAt)).limit(3),
  ]);
  const body = ms ? a.bodyMs : a.bodyEn;
  const toc = extractHeadings(body);
  const url = absUrl(localePath(locale, `/education/${a.slug}`));
  const shareText = encodeURIComponent(ms ? a.titleMs : a.titleEn);
  const ld = { "@context": "https://schema.org", "@type": "Article", headline: ms ? a.titleMs : a.titleEn, description: ms ? a.excerptMs : a.excerptEn, datePublished: a.publishedAt.toISOString(), inLanguage: ms ? "ms-MY" : "en", articleSection: a.category, author: { "@type": "Organization", name: BRAND.name }, publisher: { "@type": "Organization", name: BRAND.name, url: BRAND.siteUrl }, mainEntityOfPage: url };
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 lg:grid lg:grid-cols-[1fr_260px] lg:gap-12">
      <article className="max-w-3xl">
        <JsonLd data={ld} />
        <Link href="/education" className="text-sm text-muted hover:text-gold">← {t("title")}</Link>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full border border-gold/40 text-gold px-2.5 py-0.5 uppercase tracking-wide">{CATEGORY_EMOJI[a.category] ?? "📘"} {t(`cat_${a.category}`)}</span>
          <span className="text-muted">⏱ {a.readMinutes} min · {a.publishedAt.toISOString().slice(0, 10)}</span>
          {a.model ? <span className="text-muted/70">✦ {t("ai_written")}</span> : <span className="text-muted/70">✍️ {t("by_brand", { brand: BRAND.name })}</span>}
        </div>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight leading-tight">{ms ? a.titleMs : a.titleEn}</h1>
        <p className="mt-4 text-lg text-muted">{ms ? a.excerptMs : a.excerptEn}</p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <ArticleEnhancer slug={a.slug} labels={{ copy: t("copy_link"), copied: t("copied"), done: t("checklist_done") }} />
          <a href={`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${shareText}`} target="_blank" rel="noopener" className="text-xs rounded-md border border-border px-3 py-1.5 hover:border-gold/50">Telegram</a>
          <a href={`https://wa.me/?text=${shareText}%20${encodeURIComponent(url)}`} target="_blank" rel="noopener" className="text-xs rounded-md border border-border px-3 py-1.5 hover:border-gold/50">WhatsApp</a>
        </div>
        {toc.length > 2 && (
          <details className="lg:hidden mt-6 glass rounded-xl p-4 text-sm">
            <summary className="cursor-pointer font-medium">{t("toc")}</summary>
            <ol className="mt-2 space-y-1 text-muted list-decimal list-inside">{toc.map((h) => <li key={h.id}><a href={`#${h.id}`} className="hover:text-gold">{h.text}</a></li>)}</ol>
          </details>
        )}
        <div id="article-body" className="prose-sam mt-8" dangerouslySetInnerHTML={{ __html: renderMarkdown(body) }} />
        <div className="mt-10 rounded-xl border border-border bg-surface-2/60 p-4 text-xs text-muted">⚠️ {t("risk_note")}</div>
        <div className="mt-8 glass rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4 glow-gold">
          <div><div className="font-semibold">{t("cta_title")}</div><div className="text-sm text-muted">{t("cta_body")}</div></div>
          <a href={botDeepLink(`edu_${a.topicKey}`)} className="rounded-md bg-gold text-black font-semibold px-5 py-2.5">{t("cta_button")}</a>
        </div>
        <nav className="mt-8 grid gap-3 sm:grid-cols-2 text-sm">
          {prev ? <Link href={`/education/${prev.slug}`} className="glass rounded-xl p-4 hover:border-gold/40"><div className="text-xs text-muted">← {t("prev")}</div><div className="mt-1 font-medium">{ms ? prev.titleMs : prev.titleEn}</div></Link> : <span />}
          {next && <Link href={`/education/${next.slug}`} className="glass rounded-xl p-4 hover:border-gold/40 text-right"><div className="text-xs text-muted">{t("next")} →</div><div className="mt-1 font-medium">{ms ? next.titleMs : next.titleEn}</div></Link>}
        </nav>
      </article>
      <aside className="hidden lg:block">
        <div className="sticky top-24 space-y-6">
          {toc.length > 1 && (
            <div>
              <div className="text-xs uppercase tracking-wide text-muted mb-2">{t("toc")}</div>
              <ol className="space-y-1.5 text-sm border-l border-border">{toc.map((h) => <li key={h.id}><a href={`#${h.id}`} className="block pl-3 text-muted hover:text-gold hover:border-l hover:border-gold -ml-px">{h.text}</a></li>)}</ol>
            </div>
          )}
          {related.length > 0 && (
            <div>
              <div className="text-xs uppercase tracking-wide text-muted mb-2">{t("related")}</div>
              <ul className="space-y-2 text-sm">{related.map((r) => <li key={r.slug}><Link href={`/education/${r.slug}`} className="block glass rounded-lg p-3 hover:border-gold/40"><div className="font-medium leading-snug">{ms ? r.titleMs : r.titleEn}</div><div className="text-[11px] text-muted mt-1">⏱ {r.readMinutes} min</div></Link></li>)}</ul>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
