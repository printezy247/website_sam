"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

/** Sends one page-view beacon per path per browser session. Skips admin/account pages and bots. */
export function Track() {
  const path = usePathname();
  useEffect(() => {
    if (!path || /\/(admin|account|dashboard|api)(\/|$)/.test(path)) return;
    if (typeof navigator !== "undefined" && /bot|crawl|spider|headless/i.test(navigator.userAgent)) return;
    const key = `sam_v:${path}`;
    try { if (sessionStorage.getItem(key)) return; sessionStorage.setItem(key, "1"); } catch { /* ignore */ }
    const body = JSON.stringify({ path });
    if (navigator.sendBeacon) navigator.sendBeacon("/api/track", new Blob([body], { type: "application/json" }));
    else fetch("/api/track", { method: "POST", headers: { "content-type": "application/json" }, body, keepalive: true }).catch(() => {});
  }, [path]);
  return null;
}
