import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { BRAND } from "@/config/brand";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "copier" });
  return pageMetadata({ locale, path: "/copier", title: t("page_title"), description: t("page_intro") });
}

/** Step by step setup for the MT5 copier, written for someone who has never opened MetaEditor. */
export default async function CopierGuide({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params; setRequestLocale(locale);
  const t = await getTranslations("copier");
  const steps = [1, 2, 3, 4, 5, 6].map((n) => ({ n, title: t(`step${n}_t`), body: t(`step${n}_b`) }));

  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-4xl font-semibold tracking-tight">{t("page_title")}</h1>
      <p className="text-muted mt-2">{t("page_intro")}</p>

      <ol className="mt-10 space-y-4">
        {steps.map((s) => (
          <li key={s.n} className="glass lux rounded-2xl p-5 flex gap-4">
            <span className="font-display text-3xl text-gold leading-none">{String(s.n).padStart(2, "0")}</span>
            <div>
              <h2 className="font-semibold">{s.title}</h2>
              <p className="text-sm text-muted mt-1">{s.body}</p>
              {s.n === 3 && <p className="mt-2 font-mono text-sm text-gold break-all">{BRAND.siteUrl}</p>}
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {(["check", "vps"] as const).map((k) => (
          <section key={k} className="glass lux rounded-2xl p-5">
            <h2 className="font-semibold">{t(`${k}_t`)}</h2>
            <p className="text-sm text-muted mt-1">{t(`${k}_b`)}</p>
          </section>
        ))}
      </div>

      <section className="glass rounded-2xl p-5 mt-4 border-loss/30">
        <h2 className="font-semibold">{t("risk_t")}</h2>
        <p className="text-sm text-muted mt-1">{t("risk_b")}</p>
      </section>

      <Link href="/account" className="btn-gold rounded-md px-5 py-2.5 inline-block mt-8 text-sm">{t("key")}</Link>
    </div>
  );
}
