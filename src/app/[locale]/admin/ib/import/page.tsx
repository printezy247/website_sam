import { adminImportHfmCsv } from "@/lib/actions";
export default async function ImportPage({ searchParams }: { searchParams: Promise<{ r?: string }> }) {
  const { r } = await searchParams;
  return (
    <div className="max-w-2xl space-y-4">
      <h2 className="font-semibold">Import HFM partner report (CSV)</h2>
      <p className="text-sm text-muted">Export clients from the HFM Partner Area as CSV. Columns detected by name: login/account, name, deposit, balance. Matching pending accounts are approved automatically by deposit band; verified accounts get their deposit refreshed.</p>
      <form action={adminImportHfmCsv} className="glass rounded-xl p-5 space-y-3">
        <input type="file" name="file" accept=".csv,text/csv" required className="block text-sm" />
        <button className="rounded-md bg-gold text-black font-semibold px-4 py-2">Import</button>
      </form>
      {r && <pre className="glass rounded-xl p-4 text-xs whitespace-pre-wrap">{decodeURIComponent(r)}</pre>}
    </div>
  );
}
