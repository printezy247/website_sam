"use client";
import { useState } from "react";
export function CheckoutButton({ body, label, className }: { body: Record<string, string>; label: string; className?: string }) {
  const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null);
  return (
    <div>
      <button disabled={busy} className={className ?? "rounded-md bg-gold text-black font-semibold px-4 py-2 disabled:opacity-50"} onClick={async () => {
        setBusy(true); setErr(null);
        const r = await fetch("/api/checkout", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
        const j = await r.json();
        if (j.url) window.location.href = j.url; else { setErr(j.error ?? "error"); setBusy(false); }
      }}>{busy ? "…" : label}</button>
      {err && <p className="text-xs text-loss mt-1">{err}</p>}
    </div>
  );
}
