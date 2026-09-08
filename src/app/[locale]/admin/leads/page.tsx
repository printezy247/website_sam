import { desc } from "drizzle-orm";
import { db } from "@/db";
import { leads } from "@/db/schema";
import { emailConfigured } from "@/lib/email";
export const dynamic = "force-dynamic";
export default async function AdminLeads() {
  const rows = await db.select().from(leads).orderBy(desc(leads.createdAt)).limit(500);
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between"><h2 className="font-semibold">Leads ({rows.length})</h2><span className="text-xs text-muted">{emailConfigured() ? "Resend: on" : "Resend: RESEND_API_KEY unset, emails skipped"}</span></div>
      <div className="overflow-x-auto glass rounded-xl">
        <table className="w-full text-sm"><thead><tr className="text-left text-muted text-xs uppercase"><th className="p-3">Email</th><th className="p-3">Name</th><th className="p-3">Locale</th><th className="p-3">Source</th><th className="p-3">Drip step</th><th className="p-3">Created</th></tr></thead>
          <tbody>{rows.map((l) => <tr key={l.id} className="border-t border-border"><td className="p-3">{l.email}</td><td className="p-3">{l.name ?? "-"}</td><td className="p-3">{l.locale}</td><td className="p-3">{l.source ?? "-"}</td><td className="p-3 font-mono">{l.step >= 99 ? "member" : l.step}</td><td className="p-3 font-mono text-xs">{l.createdAt.toISOString().slice(0, 10)}</td></tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}
