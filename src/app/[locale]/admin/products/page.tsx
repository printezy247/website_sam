import { desc } from "drizzle-orm";
import { db } from "@/db";
import { products } from "@/db/schema";
import { adminUpsertProduct } from "@/lib/actions";
export const dynamic = "force-dynamic";
const inp = "rounded-md bg-surface border border-border px-3 py-2 text-sm w-full";
function Form({ p }: { p?: typeof products.$inferSelect }) {
  return (
    <form action={adminUpsertProduct} className="glass rounded-xl p-4 grid gap-2 md:grid-cols-4 text-sm">
      {p && <input type="hidden" name="id" value={p.id} />}
      <input name="slug" defaultValue={p?.slug} required placeholder="slug" className={inp} />
      <input name="name" defaultValue={p?.name} required placeholder="Name" className={inp} />
      <select name="type" defaultValue={p?.type ?? "ebook"} className={inp}><option value="ebook">ebook</option><option value="tv_indicator">tv_indicator</option><option value="mt5_indicator">mt5_indicator</option><option value="copier">copier</option></select>
      <select name="billing" defaultValue={p?.billing ?? "one_time"} className={inp}><option value="one_time">one_time</option><option value="monthly">monthly</option><option value="lifetime">lifetime</option></select>
      <input name="priceCents" type="number" defaultValue={p?.priceCents ?? 0} placeholder="price cents" className={inp} />
      <select name="ebookTier" defaultValue={p?.ebookTier ?? ""} className={inp}><option value="">ebook tier: none</option><option value="free">Free (snippet, $0)</option><option value="standard">Standard ($19, in General)</option><option value="premium">Premium ($49, in A-Team)</option></select>
      <select name="language" defaultValue={p?.language ?? ""} className={inp}><option value="">language: both</option><option value="en">English</option><option value="ms">Bahasa Melayu</option></select>
      <select name="tierIncluded" defaultValue={p?.tierIncluded ?? ""} className={inp}><option value="">included rank: auto from ebook tier / none</option><option value="free">General (free)</option><option value="pro">A-Team (pro)</option><option value="elite">Rambo (elite)</option></select>
      <input name="stripePriceId" defaultValue={p?.stripePriceId ?? ""} placeholder="Stripe price id (optional)" className={inp} />
      <input name="filePath" defaultValue={p?.filePath ?? ""} placeholder="file: name.pdf in UPLOAD_DIR, https://url, or tg:<file_id>" className={inp} />
      <input name="description" defaultValue={p?.description ?? ""} placeholder="Description" className={`${inp} md:col-span-3`} />
      <label className="flex items-center gap-2"><input type="checkbox" name="active" defaultChecked={p?.active ?? true} /> active <button className="ml-auto rounded-md bg-gold text-black font-semibold px-4 py-1.5">{p ? "Save" : "Create"}</button></label>
    </form>
  );
}
export default async function AdminProducts() {
  const rows = await db.select().from(products).orderBy(desc(products.createdAt));
  return (
    <div className="space-y-6">
      <h2 className="font-semibold">New product</h2><Form />
      <h2 className="font-semibold">Products</h2>
      {rows.map((p) => <Form key={p.id} p={p} />)}
    </div>
  );
}
