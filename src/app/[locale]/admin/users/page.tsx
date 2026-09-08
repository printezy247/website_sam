import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { entitlements, users } from "@/db/schema";
import { adminGrant } from "@/lib/actions";
export const dynamic = "force-dynamic";
const inp = "rounded-md bg-surface border border-border px-3 py-2 text-sm";
export default async function AdminUsers() {
  const rows = await db.select({ u: users, e: entitlements }).from(users).leftJoin(entitlements, eq(entitlements.userId, users.id)).orderBy(desc(users.createdAt)).limit(200);
  const byUser = new Map<string, { u: typeof users.$inferSelect; ents: (typeof entitlements.$inferSelect)[] }>();
  for (const r of rows) { const cur = byUser.get(r.u.id) ?? { u: r.u, ents: [] }; if (r.e) cur.ents.push(r.e); byUser.set(r.u.id, cur); }
  return (
    <div className="space-y-3">
      <h2 className="font-semibold">Users & entitlements</h2>
      {[...byUser.values()].map(({ u, ents }) => (
        <div key={u.id} className="glass rounded-xl p-4 grid gap-2 md:grid-cols-4 items-center text-sm">
          <div>{u.email ?? u.name ?? u.id}<div className="text-muted text-xs">{u.role} · tg {u.tgUsername ?? u.telegramId ?? "-"}</div></div>
          <div className="text-xs text-muted">{ents.filter((e) => e.status === "active").map((e) => `${e.tierKey}/${e.source}${e.expiresAt ? "→" + e.expiresAt.toISOString().slice(0, 10) : ""}`).join(", ") || "none"}</div>
          <form action={adminGrant} className="flex gap-2 md:col-span-2"><input type="hidden" name="userId" value={u.id} />
            <select name="tier" className={inp}><option value="free">General</option><option value="pro">A-Team</option><option value="elite">Rambo</option></select>
            <input name="days" defaultValue="30" className={`${inp} w-20`} /><button className="rounded-md border border-border px-3">Grant</button></form>
        </div>
      ))}
    </div>
  );
}
