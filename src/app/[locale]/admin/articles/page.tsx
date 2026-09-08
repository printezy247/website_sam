import { desc } from "drizzle-orm";
import { db } from "@/db";
import { articles } from "@/db/schema";
import { TOPICS } from "@/lib/articles";
import { llmConfigured, llmLabel } from "@/lib/llm";
import { adminGenerateArticle, adminToggleArticle } from "@/lib/actions";
export const dynamic = "force-dynamic";
export default async function AdminArticles({ searchParams }: { searchParams: Promise<{ r?: string }> }) {
  const { r } = await searchParams;
  const rows = await db.select().from(articles).orderBy(desc(articles.publishedAt)).limit(100);
  const configured = llmConfigured();
  return (
    <div className="space-y-6">
      <form action={adminGenerateArticle} className="glass rounded-2xl p-5 flex flex-wrap items-end gap-3">
        <div className="w-full"><h2 className="font-semibold">Generate article</h2><p className="text-xs text-muted">Daily job publishes one automatically at 03:00 UTC. Provider: {llmLabel()}. {configured ? "Key configured." : "No LLM key set (GEMINI_API_KEY recommended, free): generation disabled."}</p></div>
        <label className="text-sm">Topic<select name="topic" className="block rounded-md bg-surface border border-border px-3 py-2 text-sm"><option value="">(auto: least recent)</option>{TOPICS.map((t) => <option key={t.key} value={t.key}>{t.key} · {t.category}</option>)}</select></label>
        <label className="text-sm flex items-center gap-2"><input type="checkbox" name="announce" defaultChecked /> post to public channel</label>
        <button disabled={!configured} className="rounded-md bg-gold text-black font-semibold px-4 py-2 disabled:opacity-40">Generate now (~1 min)</button>
      </form>
      {r && <pre className="glass rounded-xl p-4 text-xs whitespace-pre-wrap">{decodeURIComponent(r)}</pre>}
      <div className="space-y-2">
        {rows.map((a) => (
          <div key={a.id} className="glass rounded-xl p-4 text-sm grid gap-2 md:grid-cols-4 items-center">
            <div className="md:col-span-2"><a className="hover:text-gold" href={`/education/${a.slug}`} target="_blank">{a.titleEn}</a><div className="text-xs text-muted">{a.titleMs}</div></div>
            <div className="text-xs text-muted">{a.category} · {a.topicKey} · {a.publishedAt.toISOString().slice(0, 10)} · {a.published ? "live" : "hidden"}</div>
            <form action={adminToggleArticle}><input type="hidden" name="id" value={a.id} /><button className="rounded-md border border-border px-3 py-1.5 hover:border-gold/50">{a.published ? "Hide" : "Publish"}</button></form>
          </div>
        ))}
      </div>
    </div>
  );
}
