import { count, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { entitlements, ibAccounts, signals, telegramAccounts, users } from "@/db/schema";
import { StatTile } from "@/components/StatTile";
export const dynamic = "force-dynamic";
export default async function AdminHome() {
  const [[u], [tg], [pend], [ent], [sig], camp] = await Promise.all([
    db.select({ n: count() }).from(users), db.select({ n: count() }).from(telegramAccounts),
    db.select({ n: count() }).from(ibAccounts).where(eq(ibAccounts.status, "pending")),
    db.select({ n: count() }).from(entitlements).where(eq(entitlements.status, "active")),
    db.select({ n: count() }).from(signals).where(eq(signals.status, "running")),
    db.select({ campaign: telegramAccounts.campaign, n: count() }).from(telegramAccounts).groupBy(telegramAccounts.campaign).orderBy(sql`count(*) desc`).limit(10),
  ]);
  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatTile label="Users" value={String(u.n)} /><StatTile label="Telegram starts" value={String(tg.n)} />
        <StatTile label="Pending IB" value={String(pend.n)} /><StatTile label="Active entitlements" value={String(ent.n)} /><StatTile label="Running signals" value={String(sig.n)} />
      </div>
      <h2 className="mt-8 font-semibold">Starts by campaign</h2>
      <table className="mt-2 text-sm"><tbody>{camp.map((c) => <tr key={c.campaign ?? "-"}><td className="pr-6 py-1 text-muted">{c.campaign ?? "(none)"}</td><td className="font-mono">{c.n}</td></tr>)}</tbody></table>
    </div>
  );
}
