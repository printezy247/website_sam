import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { tvAccessRequests, users } from "@/db/schema";
import { adminTvDecision } from "@/lib/actions";
export const dynamic = "force-dynamic";
export default async function AdminTv() {
  const rows = await db.select({ r: tvAccessRequests, u: users }).from(tvAccessRequests).innerJoin(users, eq(users.id, tvAccessRequests.userId)).orderBy(desc(tvAccessRequests.createdAt)).limit(100);
  return (
    <div className="space-y-3">
      <h2 className="font-semibold">TradingView access requests</h2>
      <p className="text-xs text-muted">Grant in TradingView first (script → Manage access → add username), then mark granted here. The member gets a Telegram DM if linked.</p>
      {rows.map(({ r, u }) => (
        <div key={r.id} className="glass rounded-xl p-4 grid gap-2 md:grid-cols-4 items-center text-sm">
          <div className="font-mono">{r.tvUsername}</div>
          <div className="text-muted text-xs">{u.email ?? u.tgUsername ?? u.id}<br />{r.status} · {r.createdAt.toISOString().slice(0, 10)}</div>
          {r.status === "pending" ? (
            <div className="flex gap-2 md:col-span-2">
              <form action={adminTvDecision}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="status" value="granted" /><button className="rounded-md bg-win/20 text-win px-3 py-1.5">Mark granted</button></form>
              <form action={adminTvDecision}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="status" value="rejected" /><button className="rounded-md bg-loss/20 text-loss px-3 py-1.5">Reject</button></form>
            </div>
          ) : <div className="text-xs text-muted md:col-span-2">done</div>}
        </div>
      ))}
    </div>
  );
}
