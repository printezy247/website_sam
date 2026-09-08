import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { Link } from "@/i18n/navigation";
import { db } from "@/db";
import { articles } from "@/db/schema";
import { renderMarkdown } from "@/lib/markdown";
import { botDeepLink } from "@/config/brand";
export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const [a] = await db.select().from(articles).where(eq(articles.slug, slug)).catch(() => []);
  if (!a) return {};
  return { title: locale === "ms" ? a.titleMs : a.titleEn, description: locale === "ms" ? a.excerptMs : a.excerptEn };
}
export default async function Article({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params; setRequestLocale(locale);
  const t = await getTranslations("education");
  const [a] = await db.select().from(articles).where(eq(articles.slug, slug)).catch(() => []);
  if (!a || !a.published) notFound();
  const ms = locale === "ms";
  return (
    <article className="mx-auto max-w-3xl px-4 py-16">
      <Link href="/education" className="text-sm text-muted hover:text-gold">← {t("title")}</Link>
      <div className="mt-4 text-xs uppercase text-gold">{t(`cat_${a.category}`)} · {a.readMinutes} min · {a.publishedAt.toISOString().slice(0, 10)}</div>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight leading-tight">{ms ? a.titleMs : a.titleEn}</h1>
      <p className="mt-4 text-lg text-muted">{ms ? a.excerptMs : a.excerptEn}</p>
      <div className="prose-sam mt-8" dangerouslySetInnerHTML={{ __html: renderMarkdown(ms ? a.bodyMs : a.bodyEn) }} />
      <div className="mt-12 glass rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4">
        <div><div className="font-semibold">{t("cta_title")}</div><div className="text-sm text-muted">{t("cta_body")}</div></div>
        <a href={botDeepLink(`edu_${a.topicKey}`)} className="rounded-md bg-gold text-black font-semibold px-5 py-2.5">{t("cta_button")}</a>
      </div>
    </article>
  );
}
