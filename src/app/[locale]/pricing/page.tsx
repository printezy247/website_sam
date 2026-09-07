import { getTranslations, setRequestLocale } from "next-intl/server";
import { TierCards } from "@/components/TierCards";
export default async function Pricing({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params; setRequestLocale(locale);
  const t = await getTranslations("doors");
  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <h1 className="text-4xl font-semibold tracking-tight">{t("title")}</h1>
      <p className="text-muted mt-2 mb-10">{t("subtitle")}</p>
      <TierCards showMatrix />
    </div>
  );
}
