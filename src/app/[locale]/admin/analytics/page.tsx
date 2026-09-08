import { campaignFunnel, dailyVisits, topPaths } from "@/lib/analytics";
import { StatTile } from "@/components/StatTile";
export const dynamic = "force-dynamic";
const pct = (a: number, b: number) => (b ? `${((a / b) * 100).toFixed(1)}%` : "—");
export default async function AdminAnalytics() {
  const [rows, daily, paths] = await Promise.all([campaignFunnel(30), dailyVisits(14), topPaths(30)]);
  const tot = rows.reduce((s, r) => ({ visits: s.visits + r.visits, leads: s.leads + r.leads, tgStarts: s.tgStarts + r.tgStarts, signups: s.signups + r.signups, activations: s.activations + r.activations }), { visits: 0, leads: 0, tgStarts: 0, signups: 0, activations: 0 });
  const max = Math.max(1, ...daily.map((d) => d.n));
  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-semibold">Campaign analytics</h2>
        <p className="text-xs text-muted mt-1">Visits: last 30 days, first-party beacon (no cookies beyond the 30-day <code>camp</code> tag). Leads / Telegram starts / signups / activations: all-time by first-touch campaign. Tag links with <code>?ref=CODE</code>, <code>?utm_campaign=…</code>, <code>?utm_source=…</code> or <code>?c=…</code>.</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatTile label="Visits (30d)" value={String(tot.visits)} /><StatTile label="Leads" value={String(tot.leads)} sub={pct(tot.leads, tot.visits)} />
        <StatTile label="Telegram starts" value={String(tot.tgStarts)} /><StatTile label="Signups" value={String(tot.signups)} sub={pct(tot.signups, tot.visits)} />
        <StatTile label="Activations" value={String(tot.activations)} sub={pct(tot.activations, tot.signups)} />
      </div>
      <div className="glass rounded-2xl p-5">
        <h3 className="font-semibold mb-3">Daily visits (14d)</h3>
        <div className="flex items-end gap-1 h-28">{daily.map((d) => <div key={d.day} title={`${d.day}: ${d.n}`} className="flex-1 bg-gold/70 rounded-t" style={{ height: `${Math.max(2, (d.n / max) * 100)}%` }} />)}</div>
        <div className="flex justify-between text-[10px] text-muted mt-1 font-mono"><span>{daily[0]?.day}</span><span>{daily[daily.length - 1]?.day}</span></div>
      </div>
      <div className="overflow-x-auto glass rounded-2xl">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-muted text-xs uppercase"><th className="p-3">Campaign</th><th className="p-3 text-right">Visits</th><th className="p-3 text-right">Leads</th><th className="p-3 text-right">TG starts</th><th className="p-3 text-right">Signups</th><th className="p-3 text-right">Activations</th><th className="p-3 text-right">Visit→Signup</th><th className="p-3 text-right">Signup→Active</th></tr></thead>
          <tbody>{rows.map((r) => (
            <tr key={r.campaign} className="border-t border-border font-mono">
              <td className="p-3 font-sans">{r.campaign}</td><td className="p-3 text-right">{r.visits}</td><td className="p-3 text-right">{r.leads}</td><td className="p-3 text-right">{r.tgStarts}</td><td className="p-3 text-right">{r.signups}</td><td className="p-3 text-right text-gold">{r.activations}</td>
              <td className="p-3 text-right">{pct(r.signups, r.visits)}</td><td className="p-3 text-right">{pct(r.activations, r.signups)}</td>
            </tr>))}
            {!rows.length && <tr><td className="p-3 text-muted" colSpan={8}>No data yet.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="glass rounded-2xl p-5">
        <h3 className="font-semibold mb-2">Top pages (30d)</h3>
        <table className="text-sm"><tbody>{paths.map((p) => <tr key={p.path}><td className="pr-6 py-0.5 text-muted">{p.path}</td><td className="font-mono">{p.n}</td></tr>)}</tbody></table>
      </div>
    </div>
  );
}
