import { getTranslations } from "next-intl/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { signals } from "@/db/schema";
import { SignalCard } from "@/components/SignalCard";
import { ensureAutoSignal } from "@/lib/auto-signal";

/** Latest running public XAUUSD setup (auto-created from live data when none is running). */
export async function LiveSignalCard() {
  const t = await getTranslations("hero");
  await ensureAutoSignal().catch((e) => console.error("[auto-signal]", e));
  const [running] = await db.select().from(signals).where(eq(signals.status, "running")).orderBy(desc(signals.publishedAt)).limit(1).catch(() => []);
  const [latest] = running ? [running] : await db.select().from(signals).where(eq(signals.visibility, "public")).orderBy(desc(signals.publishedAt)).limit(1).catch(() => []);
  if (!latest) return null;
  return (
    <div>
      <SignalCard s={{ ...latest, publishedAt: latest.publishedAt }} live={latest.status === "running"} />
      <p className="mt-2 text-xs text-muted">{t("live_note")}</p>
    </div>
  );
}
