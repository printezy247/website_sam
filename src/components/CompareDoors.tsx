import { getTranslations } from "next-intl/server";

/** Side-by-side comparison of the two doors (HFM IB vs own broker). */
export async function CompareDoors() {
  const t = await getTranslations("compare");
  const rows = ["fee", "requirement", "money", "cancel", "payment", "suits"] as const;
  return (
    <div className="mt-14">
      <h2 className="text-2xl font-semibold tracking-tight">{t("title")}</h2>
      <p className="text-muted mt-1">{t("subtitle")}</p>
      <div className="mt-6 overflow-x-auto glass rounded-2xl">
        <table className="w-full text-sm min-w-[560px]">
          <thead><tr className="text-left text-muted"><th className="p-4 font-normal"></th><th className="p-4 text-fg font-semibold">{t("a")}</th><th className="p-4 text-fg font-semibold">{t("b")}</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r} className="border-t border-border align-top">
                <td className="p-4 text-muted">{t(`${r}_label`)}</td>
                <td className="p-4">{t(`${r}_a`)}</td>
                <td className="p-4">{t(`${r}_b`)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
