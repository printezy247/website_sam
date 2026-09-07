import { getTranslations } from "next-intl/server";
import { botDeepLink } from "@/config/brand";
export async function StickyCta() {
  const t = await getTranslations("cta_bar");
  return (
    <div className="fixed bottom-0 inset-x-0 z-40 md:hidden glass border-x-0 border-b-0 px-4 py-3 flex items-center justify-between gap-3">
      <span className="text-sm">{t("text")}</span>
      <a href={botDeepLink("site_sticky")} className="rounded-md bg-gold text-black text-sm font-semibold px-4 py-2">{t("button")}</a>
    </div>
  );
}
