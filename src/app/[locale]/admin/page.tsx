import { count, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { entitlements, ibAccounts, signals, telegramAccounts, users } from "@/db/schema";
import { StatTile } from "@/components/StatTile";
import { latestRecap } from "@/lib/recap";
import { adminBuildRecap } from "@/lib/actions";
import { llmLabel } from "@/lib/llm";
export const dynamic = "force-dynamic";
export default async function AdminHome() {
  const [[u], [tg], [pend], [ent], [sig], camp] = await Promise.all([
    db.select({ n: count() }).from(users), db.select({ n: count() }).from(telegramAccounts),
    db.select({ n: count() }).from(ibAccounts).where(eq(ibAccounts.status, "pending")),
    db.select({ n: count() }).from(entitlements).where(eq(entitlements.status, "active")),
    db.select({ n: count() }).from(signals).where(eq(signals.status, "running")),
    db.select({ campaign: telegramAccounts.campaign, n: count() }).from(telegramAccounts).groupBy(telegramAccounts.campaign).orderBy(sql`count(*) desc`).limit(10),
  ]);
  const recap = await latestRecap();
  return (
    <div>
      <section className="glass rounded-2xl p-5 mb-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="font-semibold">Weekly recap</h2><p className="text-xs text-muted">Auto-built and posted to the public channel every Monday by the jobs cron. LLM: {llmLabel()}.</p></div>
          <form action={adminBuildRecap} className="flex items-center gap-2 text-sm">
            <select name="weeksAgo" className="rounded-md bg-surface border border-border px-2 py-1.5"><option value="1">Last week</option><option value="0">This week so far</option><option value="2">2 weeks ago</option></select>
            <label className="flex items-center gap-1"><input type="checkbox" name="post" /> Post to channel</label>
            <button className="rounded-md bg-gold text-black font-semibold px-3 py-1.5">Build</button>
          </form>
        </div>
        {recap && <div className="mt-4 text-sm"><div className="text-xs text-muted font-mono">{recap.weekStart} · {recap.model ?? "template"} · {recap.postedAt ? `posted ${recap.postedAt.toISOString().slice(0, 16)}` : "not posted"}</div><p className="mt-2">{recap.textMs}</p><p className="mt-2 text-muted">{recap.textEn}</p></div>}
      </section>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatTile label="Users" value={String(u.n)} /><StatTile label="Telegram starts" value={String(tg.n)} />
        <StatTile label="Pending IB" value={String(pend.n)} /><StatTile label="Active entitlements" value={String(ent.n)} /><StatTile label="Running signals" value={String(sig.n)} />
      </div>
      <h2 className="mt-8 font-semibold">Starts by campaign</h2>
      <table className="mt-2 text-sm"><tbody>{camp.map((c) => <tr key={c.campaign ?? "-"}><td className="pr-6 py-1 text-muted">{c.campaign ?? "(none)"}</td><td className="font-mono">{c.n}</td></tr>)}</tbody></table>
    </div>
  );
}
