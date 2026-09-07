import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { BRAND } from "@/config/brand";

export async function Footer() {
  const t = await getTranslations();
  return (
    <footer className="border-t border-border mt-24">
      <div className="mx-auto max-w-6xl px-4 py-10 grid gap-8 md:grid-cols-3 text-sm">
        <div>
          <div className="font-semibold">{BRAND.name}<span className="text-gold">.</span></div>
          <p className="mt-2 text-muted">{t("footer.rights")}</p>
          <p className="mt-2 text-muted">{t("risk.ib", { brand: BRAND.name })}</p>
        </div>
        <div>
          <div className="font-semibold mb-2">{t("footer.legal")}</div>
          <ul className="space-y-1 text-muted">
            <li><Link href="/legal/risk" className="hover:text-fg">{t("footer.risk")}</Link></li>
            <li><Link href="/legal/terms" className="hover:text-fg">{t("footer.terms")}</Link></li>
            <li><Link href="/legal/privacy" className="hover:text-fg">{t("footer.privacy")}</Link></li>
            <li><Link href="/legal/ib-disclosure" className="hover:text-fg">{t("footer.ib")}</Link></li>
          </ul>
        </div>
        <p className="text-xs text-muted leading-relaxed">{t("risk.strip")}</p>
      </div>
    </footer>
  );
}
