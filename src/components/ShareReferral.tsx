"use client";
import { useState } from "react";

export function ShareReferral({ url, text, labels }: { url: string; text: string; labels: { copy: string; copied: string; tg: string; wa: string } }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(url); setDone(true); setTimeout(() => setDone(false), 1500); } catch { /* clipboard blocked */ }
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      <code className="font-mono text-sm bg-surface-2 border border-border rounded px-2 py-1 break-all">{url}</code>
      <button onClick={copy} className="rounded-md bg-gold text-black text-sm font-semibold px-3 py-1.5">{done ? labels.copied : labels.copy}</button>
      <a href={`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`} target="_blank" rel="noopener" className="rounded-md border border-border text-sm px-3 py-1.5 hover:border-gold/50">{labels.tg}</a>
      <a href={`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`} target="_blank" rel="noopener" className="rounded-md border border-border text-sm px-3 py-1.5 hover:border-gold/50">{labels.wa}</a>
    </div>
  );
}
