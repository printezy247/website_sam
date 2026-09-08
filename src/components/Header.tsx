import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { BRAND, botDeepLink } from "@/config/brand";
import { auth } from "@/auth";
import { Glyph } from "@/components/Glyph";

export async function Header() {
  const t = await getTranslations("nav");
  const locale = await getLocale();
  const session = await auth().catch(() => null);
  const other = locale === "ms" ? "en" : "ms";
  return (
    <header className="sticky top-0 z-40 glass border-x-0 border-t-0">
      <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <Glyph size={30} />
          <span>{BRAND.name}<span className="text-gold">.</span></span>
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-sm text-muted">
          <Link href="/results" className="hover:text-fg">{t("results")}</Link>
          <Link href="/education" className="hover:text-fg">{t("education")}</Link>
          <Link href="/pricing" className="hover:text-fg">{t("pricing")}</Link>
          <Link href="/products" className="hover:text-fg">{t("products")}</Link>
          {session?.user && <Link href="/dashboard" className="hover:text-fg">{t("dashboard")}</Link>}
          <Link href={session?.user ? "/account" : "/signin"} className="hover:text-fg">{session?.user ? t("account") : t("signin")}</Link>
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/" locale={other} className="text-xs uppercase text-muted hover:text-fg px-2 py-1 rounded border border-border">{other}</Link>
          <a href={botDeepLink("site_header")} className="hidden sm:inline-flex items-center rounded-md bg-gold text-black text-sm font-semibold px-3 py-1.5 hover:bg-gold-2">{t("cta")}</a>
        </div>
      </div>
    </header>
  );
}
