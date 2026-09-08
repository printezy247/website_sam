import { desc } from "drizzle-orm";
import { db } from "@/db";
import { broadcasts } from "@/db/schema";
import { adminCreateBroadcast, adminSendBroadcast } from "@/lib/actions";
export const dynamic = "force-dynamic";
const inp = "rounded-md bg-surface border border-border px-3 py-2 text-sm w-full";
export default async function Broadcasts() {
  const rows = await db.select().from(broadcasts).orderBy(desc(broadcasts.createdAt)).limit(30);
  return (
    <div className="space-y-8">
      <form action={adminCreateBroadcast} className="glass rounded-2xl p-5 grid gap-3 md:grid-cols-2">
        <h2 className="md:col-span-2 font-semibold">New broadcast</h2>
        <textarea name="textMs" required rows={5} placeholder="Teks Bahasa Melayu (HTML ok: <b>, <a>)" className={inp} />
        <textarea name="textEn" required rows={5} placeholder="English text" className={inp} />
        <label className="text-sm">Tiers (empty = everyone linked)
          <select name="tiers" multiple className={`${inp} h-24`}><option>public</option><option>free</option><option>pro</option><option>elite</option></select></label>
        <label className="text-sm">Schedule (UTC, optional)<input type="datetime-local" name="scheduledAt" className={inp} /></label>
        <button className="md:col-span-2 rounded-md bg-gold text-black font-semibold py-2">Save</button>
      </form>
      <div className="space-y-2">
        {rows.map((b) => (
          <div key={b.id} className="glass rounded-xl p-4 text-sm grid gap-2 md:grid-cols-4 items-center">
            <div className="md:col-span-2 line-clamp-2">{b.textMs}</div>
            <div className="text-xs text-muted">{JSON.stringify(b.segment ?? {})}<br />{b.sentAt ? `sent ${b.sentCount} · ${b.sentAt.toISOString().slice(0, 16)}` : b.scheduledAt ? `scheduled ${b.scheduledAt.toISOString().slice(0, 16)}` : "draft"}</div>
            {!b.sentAt && <form action={adminSendBroadcast}><input type="hidden" name="id" value={b.id} /><button className="rounded-md border border-border px-3 py-1.5 hover:border-gold/50">Send now</button></form>}
          </div>
        ))}
      </div>
    </div>
  );
}
