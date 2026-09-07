import { desc } from "drizzle-orm";
import { db } from "@/db";
import { signals } from "@/db/schema";
import { adminCreateSignal, adminUpdateSignal } from "@/lib/actions";
export const dynamic = "force-dynamic";
const inp = "rounded-md bg-surface border border-border px-3 py-2 text-sm";
export default async function AdminSignals() {
  const rows = await db.select().from(signals).orderBy(desc(signals.publishedAt)).limit(50);
  return (
    <div className="space-y-10">
      <form action={adminCreateSignal} className="glass rounded-2xl p-5 grid gap-3 md:grid-cols-4">
        <h2 className="md:col-span-4 font-semibold">Post signal</h2>
        <input name="instrument" defaultValue="XAUUSD" className={inp} />
        <select name="side" className={inp}><option value="buy">BUY</option><option value="sell">SELL</option></select>
        <select name="visibility" className={inp}><option value="pro">Pro + Elite</option><option value="elite">Elite only</option><option value="free">Free pick (all groups)</option><option value="public">Public (delayed/teaser)</option></select>
        <label className="text-sm flex items-center gap-2"><input type="checkbox" name="newsLockout" /> News lockout</label>
        <input name="entry" required placeholder="Entry" className={inp} /><input name="sl" required placeholder="SL" className={inp} />
        <input name="tp1" placeholder="TP1" className={inp} /><input name="tp2" placeholder="TP2" className={inp} /><input name="tp3" placeholder="TP3" className={inp} />
        <input name="note" placeholder="Note (optional)" className={`${inp} md:col-span-3`} />
        <button className="md:col-span-4 rounded-md bg-gold text-black font-semibold py-2">Publish + send to Telegram</button>
      </form>
      <div className="space-y-3">
        <h2 className="font-semibold">Recent</h2>
        {rows.map((s) => (
          <form key={s.id} action={adminUpdateSignal} className="glass rounded-xl p-4 grid gap-2 md:grid-cols-6 items-center text-sm">
            <input type="hidden" name="id" value={s.id} />
            <div className="font-mono">{s.instrument} <span className={s.side === "buy" ? "text-win" : "text-loss"}>{s.side.toUpperCase()}</span><div className="text-muted text-xs">{s.entry} / {s.sl}</div></div>
            <div className="text-muted text-xs">{s.publishedAt.toISOString().slice(0, 16).replace("T", " ")}<br />{s.visibility} · {s.status}</div>
            <select name="status" defaultValue={s.status} className={inp}>{["running", "tp1", "tp2", "tp3", "sl", "be", "closed"].map((x) => <option key={x}>{x}</option>)}</select>
            <input name="resultR" defaultValue={s.resultR ?? ""} placeholder="R" className={inp} />
            <input name="resultPips" defaultValue={s.resultPips ?? ""} placeholder="pips" className={inp} />
            <button className="rounded-md border border-border py-2 hover:border-gold/50">Update + notify</button>
          </form>
        ))}
      </div>
    </div>
  );
}
