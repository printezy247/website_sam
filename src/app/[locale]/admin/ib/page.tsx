import { desc } from "drizzle-orm";
import { db } from "@/db";
import { ibAccounts } from "@/db/schema";
import { adminApproveIb, adminRejectIb } from "@/lib/actions";
export const dynamic = "force-dynamic";
const inp = "rounded-md bg-surface border border-border px-3 py-2 text-sm";
export default async function AdminIb() {
  const rows = await db.select().from(ibAccounts).orderBy(desc(ibAccounts.createdAt)).limit(100);
  return (
    <div className="space-y-3">
      <h2 className="font-semibold">IB verifications</h2>
      <p className="text-xs text-muted">Deposit band: $0 → Free · ≥$100 → Pro · ≥$500 → Elite. Approve sets a 30-day IB entitlement and DMs a single-use group link.</p>
      {rows.map((r) => (
        <div key={r.id} className="glass rounded-xl p-4 grid gap-2 md:grid-cols-5 items-center text-sm">
          <div><div className="font-mono">{r.accountNo}</div><div className="text-muted text-xs">{r.fullName} · {r.region} · tg {r.telegramId ?? "-"}</div></div>
          <div className="text-muted text-xs">balance ${r.balanceUsd ?? "?"}<br />{r.status}{r.depositUsd ? ` · $${r.depositUsd}` : ""}{r.screenshotPath?.startsWith("tg:") ? " · 📷 in admin chat" : ""}</div>
          <form action={adminApproveIb} className="flex gap-2"><input type="hidden" name="id" value={r.id} /><input name="depositUsd" placeholder={`deposit (${r.balanceUsd ?? 0})`} className={inp} /><button className="rounded-md bg-win/20 text-win px-3">Approve</button></form>
          <form action={adminRejectIb} className="flex gap-2"><input type="hidden" name="id" value={r.id} /><input name="note" placeholder="reason" className={inp} /><button className="rounded-md bg-loss/20 text-loss px-3">Reject</button></form>
          <div className="text-xs text-muted">{r.createdAt.toISOString().slice(0, 10)}</div>
        </div>
      ))}
    </div>
  );
}
