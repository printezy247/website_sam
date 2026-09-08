import { eq } from "drizzle-orm";
import { db } from "@/db";
import { articles } from "@/db/schema";
import { CATEGORIES } from "@/lib/articles";
import { llmConfigured } from "@/lib/llm";
import { adminDeleteArticle, adminSaveArticle, adminTranslateArticle } from "@/lib/actions";
import { Link } from "@/i18n/navigation";
export const dynamic = "force-dynamic";
const inp = "w-full rounded-md bg-surface border border-border px-3 py-2 text-sm";
const ta = `${inp} font-mono min-h-[360px]`;

export default async function EditArticle({ searchParams }: { searchParams: Promise<{ id?: string; r?: string }> }) {
  const { id, r } = await searchParams;
  const [a] = id ? await db.select().from(articles).where(eq(articles.id, id)) : [];
  const llm = llmConfigured();
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="font-semibold">{a ? "Edit article" : "New article"}</h2><p className="text-xs text-muted">{"Markdown body. Use `## Heading` sections; a section titled \"Checklist\" / \"Senarai semak\" becomes interactive checkboxes on the site. Write one language and press \"Fill EN/MS with AI\" for the other."}</p></div>
        <div className="flex gap-2 text-sm">
          <Link href="/admin/articles" className="rounded-md border border-border px-3 py-1.5">← All articles</Link>
          {a && <a href={`/education/${a.slug}`} target="_blank" className="rounded-md border border-border px-3 py-1.5 hover:border-gold/50">Preview ↗</a>}
        </div>
      </div>
      {r && <p className={`glass rounded-xl p-3 text-sm ${r.startsWith("error") ? "text-loss" : "text-win"}`}>{decodeURIComponent(r)}</p>}

      <form action={adminSaveArticle} className="space-y-5">
        {a && <input type="hidden" name="id" value={a.id} />}
        <div className="grid gap-3 md:grid-cols-4">
          <label className="text-xs text-muted">Category<select name="category" defaultValue={a?.category ?? "mindset"} className={inp}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></label>
          <label className="text-xs text-muted">Read minutes<input name="readMinutes" type="number" min={1} max={30} defaultValue={a?.readMinutes ?? ""} placeholder="auto" className={inp} /></label>
          <label className="text-xs text-muted">Slug<input name="slug" defaultValue={a?.slug ?? ""} placeholder="auto from English title" className={inp} /></label>
          <label className="text-xs text-muted">Publish date<input name="publishedAt" type="datetime-local" defaultValue={a ? a.publishedAt.toISOString().slice(0, 16) : ""} className={inp} /></label>
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          <section className="glass rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between"><h3 className="font-semibold">🇲🇾 Bahasa Melayu</h3>{a && llm && <button formAction={adminTranslateArticle} name="from" value="en" className="text-xs rounded-md border border-gold/50 text-gold px-2 py-1">Fill MS from EN with AI</button>}</div>
            <input name="titleMs" defaultValue={a?.titleMs ?? ""} placeholder="Tajuk" className={inp} />
            <input name="excerptMs" defaultValue={a?.excerptMs ?? ""} placeholder="Ringkasan satu ayat (maks 160 aksara)" maxLength={160} className={inp} />
            <textarea name="bodyMs" defaultValue={a?.bodyMs ?? ""} placeholder={"## Masalah\n\n…\n\n## Senarai semak\n- …"} className={ta} />
          </section>
          <section className="glass rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between"><h3 className="font-semibold">🇬🇧 English</h3>{a && llm && <button formAction={adminTranslateArticle} name="from" value="ms" className="text-xs rounded-md border border-gold/50 text-gold px-2 py-1">Fill EN from MS with AI</button>}</div>
            <input name="titleEn" defaultValue={a?.titleEn ?? ""} placeholder="Title" className={inp} />
            <input name="excerptEn" defaultValue={a?.excerptEn ?? ""} placeholder="One-sentence excerpt (max 160 chars)" maxLength={160} className={inp} />
            <textarea name="bodyEn" defaultValue={a?.bodyEn ?? ""} placeholder={"## The problem\n\n…\n\n## Checklist\n- …"} className={ta} />
          </section>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" name="published" defaultChecked={a ? a.published : true} /> Published</label>
          <label className="flex items-center gap-2"><input type="checkbox" name="announce" /> Post to public channel on save</label>
          <button className="rounded-md bg-gold text-black font-semibold px-5 py-2">{a ? "Save changes" : "Create article"}</button>
          {a && <span className="text-xs text-muted">{a.model ? `AI draft (${a.model})` : "manual"} · created {a.createdAt.toISOString().slice(0, 10)}</span>}
        </div>
      </form>
      {a && (
        <form action={adminDeleteArticle} className="pt-4 border-t border-border">
          <input type="hidden" name="id" value={a.id} />
          <button className="text-sm text-loss underline">Delete this article permanently</button>
        </form>
      )}
    </div>
  );
}
