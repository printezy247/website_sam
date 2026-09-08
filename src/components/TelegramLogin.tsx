"use client";
import { useEffect, useRef } from "react";

/** Telegram Login Widget. Injected client-side so React does not hoist the script out of place. */
export function TelegramLogin({ botUsername, authUrl }: { botUsername: string; authUrl: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || el.childElementCount) return;
    const s = document.createElement("script");
    s.src = "https://telegram.org/js/telegram-widget.js?22";
    s.async = true;
    s.setAttribute("data-telegram-login", botUsername);
    s.setAttribute("data-size", "large");
    s.setAttribute("data-auth-url", authUrl);
    s.setAttribute("data-request-access", "write");
    el.appendChild(s);
    return () => { el.innerHTML = ""; };
  }, [botUsername, authUrl]);
  return <div ref={ref} className="min-h-10" />;
}
