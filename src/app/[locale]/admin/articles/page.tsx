import { desc } from "drizzle-orm";
import { db } from "@/db";
import { articles } from "@/db/schema";
import { TOPICS } from "@/lib/articles";
import { llmConfigured, llmInventory, llmLabel } from "@/lib/llm";
import { adminGenerateArticle, adminToggleArticle } from "@/lib/actions";
import { Link } from "@/i18n/navigation";
export const dynamic = "force-dynamic";
export default async function AdminArticles({ searchParams }: { searchParams: Promise<{ r?: string }> }) {
  const { r } = await searchParams;
  const rows = await db.select().from(articles).orderBy(desc(articles.publishedAt)).limit(100);
  const configured = llmConfigured();
  const inventory = await llmInventory().catch(() => []);
  return (
    <div className="space-y-6">
      <form action={adminGenerateArticle} className="glass rounded-2xl p-5 flex flex-wrap items-end gap-3">
        <div className="w-full"><h2 className="font-semibold">Generate article</h2><p className="text-xs text-muted">Daily job publishes one automatically at 03:00 UTC. Provider: {llmLabel()}. {configured ? "Key configured." : "No LLM key set (GEMINI_API_KEY recommended, free): generation disabled."}</p></div>
        <label className="text-sm">Topic<select name="topic" className="block rounded-md bg-surface border border-border px-3 py-2 text-sm"><option value="">(auto: least recent)</option>{TOPICS.map((t) => <option key={t.key} value={t.key}>{t.key} · {t.category}</option>)}</select></label>
        <label className="text-sm flex items-center gap-2"><input type="checkbox" name="announce" defaultChecked /> post to public channel</label>
        <button disabled={!configured} className="rounded-md bg-gold text-black font-semibold px-4 py-2 disabled:opacity-40">Generate now (~1 min)</button>
      </form>
      <div className="glass rounded-2xl p-5">
        <h2 className="font-semibold">LLM providers</h2>
        <p className="text-xs text-muted">Every key found is used in this order; the next one takes over when a provider fails. Models come from each provider&apos;s live list, best first. Pin with LLM_PROVIDER / LLM_MODEL.</p>
        {inventory.length === 0 ? <p className="mt-2 text-sm text-loss">No key set.</p> : (
          <ul className="mt-3 grid gap-2 md:grid-cols-2 text-xs">
            {inventory.map((x, i) => (
              <li key={x.provider} className="rounded-lg border border-border/70 p-3">
                <div className="font-semibold text-sm">{i + 1}. {x.provider} <span className="text-muted font-normal">{x.label}</span></div>
                <div className="mt-1 text-muted break-all">{x.models.join(" · ")}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="glass rounded-2xl p-5 flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="font-semibold">Write your own</h2><p className="text-xs text-muted">Create, edit or delete articles by hand. Markdown, both languages, AI can fill the other language.</p></div>
        <Link href="/admin/articles/edit" className="rounded-md bg-gold text-black font-semibold px-4 py-2">+ New article</Link>
      </div>
      {r && <pre className="glass rounded-xl p-4 text-xs whitespace-pre-wrap">{decodeURIComponent(r)}</pre>}
      <div className="space-y-2">
        {rows.map((a) => (
          <div key={a.id} className="glass rounded-xl p-4 text-sm grid gap-2 md:grid-cols-4 items-center">
            <div className="md:col-span-2"><a className="hover:text-gold" href={`/education/${a.slug}`} target="_blank">{a.titleEn}</a><div className="text-xs text-muted">{a.titleMs}</div></div>
            <div className="text-xs text-muted">{a.category} · {a.model ? "AI" : "manual"} · {a.publishedAt.toISOString().slice(0, 10)} · {a.published ? "live" : "hidden"}</div>
            <div className="flex gap-2"><Link href={`/admin/articles/edit?id=${a.id}`} className="rounded-md border border-gold/50 text-gold px-3 py-1.5">Edit</Link><form action={adminToggleArticle}><input type="hidden" name="id" value={a.id} /><button className="rounded-md border border-border px-3 py-1.5 hover:border-gold/50">{a.published ? "Hide" : "Publish"}</button></form></div>
          </div>
        ))}
      </div>
    </div>
  );
}
