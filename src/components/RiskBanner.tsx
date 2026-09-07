import { getTranslations } from "next-intl/server";
export async function RiskBanner() {
  const t = await getTranslations("risk");
  return (
    <div className="bg-surface-2 border-b border-border text-[11px] leading-snug text-muted">
      <p className="mx-auto max-w-6xl px-4 py-1.5">⚠️ {t("strip")}</p>
    </div>
  );
}
