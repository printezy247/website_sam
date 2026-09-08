"use client";
import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";

/** Product page bar that slides in once the main buy box scrolls out of view. */
export function StickyBuyBar({ name, price, note, href, label }: { name: string; price: string; note?: string; href: string; label: string }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const target = document.getElementById("buy-box");
    if (!target) return;
    const io = new IntersectionObserver(([e]) => setShow(!e.isIntersecting), { threshold: 0 });
    io.observe(target);
    return () => io.disconnect();
  }, []);
  return (
    <div className={`fixed inset-x-0 bottom-0 z-50 transition-transform duration-300 ${show ? "translate-y-0" : "translate-y-full"}`}>
      <div className="glass border-x-0 border-b-0 px-4 py-3">
        <div className="mx-auto max-w-6xl flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="font-semibold truncate">{name}</div>
            {note && <div className="text-xs text-muted truncate">{note}</div>}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="font-mono text-lg">{price}</span>
            <Link href={href} className="rounded-md bg-gold text-black font-semibold px-5 py-2 text-sm">{label}</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
