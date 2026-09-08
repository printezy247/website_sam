"use client";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { BRAND, botDeepLink } from "@/config/brand";

/** Floating support panel: quick answers + Telegram handoff with page context. */
export function SupportChat() {
  const t = useTranslations("support");
  const tf = useTranslations("faq");
  const locale = useLocale();
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState<number | null>(null);
  const page = (path ?? "/").replace(/^\/(en|ms)/, "") || "/";
  const ctxText = encodeURIComponent(`${locale === "ms" ? "Hai, saya ada soalan tentang" : "Hi, I have a question about"} ${BRAND.siteUrl}${page}`);
  const tgSupport = BRAND.telegram.support && BRAND.telegram.support !== "https://t.me/" ? `${BRAND.telegram.support}?text=${ctxText}` : null;
  const botLink = botDeepLink(`support_${page.replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "") || "home"}`);
  return (
    <>
      <button onClick={() => setOpen((v) => !v)} aria-label={t("open")} className="fixed bottom-20 md:bottom-6 right-4 z-40 size-12 rounded-full bg-gold text-black shadow-lg hover:bg-gold-2 flex items-center justify-center text-xl">
        {open ? "×" : "💬"}
      </button>
      {open && (
        <div className="fixed bottom-36 md:bottom-20 right-4 z-40 w-[min(92vw,360px)] glass rounded-2xl p-4 shadow-2xl">
          <div className="font-semibold">{t("title")}</div>
          <p className="text-xs text-muted mt-1">{t("subtitle")}</p>
          <ul className="mt-3 space-y-1">
            {[1, 2, 3, 4].map((i) => (
              <li key={i}>
                <button onClick={() => setQ(q === i ? null : i)} className="w-full text-left text-sm rounded-md border border-border px-3 py-2 hover:border-gold/50">{tf(`q${i}`)}</button>
                {q === i && <p className="text-xs text-muted px-3 py-2">{tf(`a${i}`)}</p>}
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap gap-2">
            <a href={tgSupport ?? botLink} target="_blank" rel="noopener" className="flex-1 text-center rounded-md bg-gold text-black text-sm font-semibold px-3 py-2">{t("human")}</a>
            <a href={botLink} target="_blank" rel="noopener" className="flex-1 text-center rounded-md border border-border text-sm px-3 py-2 hover:border-gold/50">{t("bot")}</a>
          </div>
          <p className="mt-2 text-[11px] text-muted">{t("hours")}</p>
        </div>
      )}
    </>
  );
}
