import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { BRAND } from "@/config/brand";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { RiskBanner } from "@/components/RiskBanner";
import { Ticker } from "@/components/Ticker";
import { StickyCta } from "@/components/StickyCta";
import "../globals.css";

const sans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const mono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: `${BRAND.name} · Gold (XAUUSD) signals`, template: `%s · ${BRAND.name}` },
  description: BRAND.tagline,
  metadataBase: new URL(BRAND.siteUrl),
};

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
        <NextIntlClientProvider>
          <Ticker />
          <Header />
          <RiskBanner />
          <main className="flex-1 pb-20 md:pb-0">{children}</main>
          <Footer />
          <StickyCta />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
