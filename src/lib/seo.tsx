import type { Metadata } from "next";
import { BRAND } from "@/config/brand";
import { routing, type Locale } from "@/i18n/routing";

/** Public path for a locale under `localePrefix: "as-needed"` (default locale has no prefix). */
export function localePath(locale: string, path = "/") {
  const p = path === "/" ? "" : path;
  return locale === routing.defaultLocale ? (p || "/") : `/${locale}${p}`;
}

export function absUrl(path: string) {
  return new URL(path, BRAND.siteUrl).toString();
}

export const OG_LOCALE: Record<Locale, string> = { ms: "ms_MY", en: "en_US" };

export type PageMeta = {
  locale: string;
  /** Locale-less path, e.g. "/pricing". */
  path: string;
  title: string;
  description: string;
  type?: "website" | "article";
  image?: string;
  noindex?: boolean;
  publishedTime?: string;
};

/** Canonical + hreflang pair + Open Graph + Twitter for a page that exists in both locales. */
export function pageMetadata(o: PageMeta): Metadata {
  const canonical = absUrl(localePath(o.locale, o.path));
  const languages = Object.fromEntries(routing.locales.map((l) => [l, absUrl(localePath(l, o.path))]));
  const image = o.image ?? absUrl(localePath(o.locale, "/opengraph-image"));
  const loc = (o.locale as Locale) in OG_LOCALE ? (o.locale as Locale) : routing.defaultLocale;
  return {
    title: o.title,
    description: o.description,
    alternates: { canonical, languages: { ...languages, "x-default": languages[routing.defaultLocale] } },
    openGraph: {
      type: o.type ?? "website",
      siteName: BRAND.name,
      title: o.title,
      description: o.description,
      url: canonical,
      locale: OG_LOCALE[loc],
      alternateLocale: routing.locales.filter((l) => l !== loc).map((l) => OG_LOCALE[l]),
      images: [{ url: image, width: 1200, height: 630, alt: o.title }],
      ...(o.type === "article" && o.publishedTime ? { publishedTime: o.publishedTime } : {}),
    },
    twitter: { card: "summary_large_image", title: o.title, description: o.description, images: [image] },
    robots: o.noindex ? { index: false, follow: false } : { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large" } },
  };
}

/** Render a JSON-LD block. Data is our own, never user input. */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

export function orgJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: BRAND.name,
    url: BRAND.siteUrl,
    logo: absUrl("/icon.svg"),
    sameAs: [BRAND.telegram.publicChannel, `https://t.me/${BRAND.telegram.botUsername}`].filter((u) => u && u !== "https://t.me/"),
  };
}

export function websiteJsonLd(locale: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: BRAND.name,
    url: absUrl(localePath(locale)),
    inLanguage: locale === "ms" ? "ms-MY" : "en",
  };
}
