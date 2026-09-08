import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { BRAND } from "@/config/brand";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { RiskBanner } from "@/components/RiskBanner";
import { Ticker } from "@/components/Ticker";
import { StickyCta } from "@/components/StickyCta";
import { SupportChat } from "@/components/SupportChat";
import { JsonLd, absUrl, localePath, orgJsonLd, websiteJsonLd, OG_LOCALE } from "@/lib/seo";
import "../globals.css";

const sans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const mono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "seo" });
  const loc = (locale === "en" ? "en" : "ms") as keyof typeof OG_LOCALE;
  return {
    metadataBase: new URL(BRAND.siteUrl),
    title: { default: `${BRAND.name} · ${t("default_title")}`, template: `%s · ${BRAND.name}` },
    description: t("default_description"),
    applicationName: BRAND.name,
    keywords: ["XAUUSD", "gold signals", "signal emas", "HFM IB", "trading emas", "forex Malaysia"],
    alternates: { canonical: absUrl(localePath(locale)), languages: { ms: absUrl(localePath("ms")), en: absUrl(localePath("en")), "x-default": absUrl(localePath("ms")) } },
    openGraph: { type: "website", siteName: BRAND.name, locale: OG_LOCALE[loc], url: absUrl(localePath(locale)), title: `${BRAND.name} · ${t("default_title")}`, description: t("default_description") },
    twitter: { card: "summary_large_image" },
    robots: { index: true, follow: true },
  };
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  return (
    <html lang={locale} className={`${sans.variable} ${mono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-bg text-fg font-sans">
        <JsonLd data={orgJsonLd()} />
        <JsonLd data={websiteJsonLd(locale)} />
        <NextIntlClientProvider>
          <Ticker />
          <Header />
          <RiskBanner />
          <main className="flex-1 pb-20 md:pb-0">{children}</main>
          <Footer />
          <StickyCta />
          <SupportChat />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
