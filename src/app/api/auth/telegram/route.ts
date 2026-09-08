// Telegram Login Widget callback: verifies the hash, links/creates the user, and opens an Auth.js DB session.
import { createHash, createHmac } from "node:crypto";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { sessions, telegramAccounts, users } from "@/db/schema";
import { BRAND } from "@/config/brand";

export async function GET(req: Request) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return new Response("bot not configured", { status: 503 });
  const url = new URL(req.url);
  const data: Record<string, string> = {};
  url.searchParams.forEach((v, k) => { if (k !== "locale") data[k] = v; });
  const hash = data.hash; delete data.hash;
  const check = Object.keys(data).sort().map((k) => `${k}=${data[k]}`).join("\n");
  const secret = createHash("sha256").update(token).digest();
  const expected = createHmac("sha256", secret).update(check).digest("hex");
  if (!hash || expected !== hash) return new Response("bad hash", { status: 401 });
  if (Date.now() / 1000 - Number(data.auth_date) > 600) return new Response("expired", { status: 401 });

  const tgId = data.id;
  let [u] = await db.select().from(users).where(eq(users.telegramId, tgId));
  if (!u) {
    [u] = await db.insert(users).values({ telegramId: tgId, tgUsername: data.username, name: [data.first_name, data.last_name].filter(Boolean).join(" ") }).returning();
    await db.update(telegramAccounts).set({ userId: u.id }).where(eq(telegramAccounts.telegramId, tgId));
  }
  const sessionToken = crypto.randomUUID();
  const expires = new Date(Date.now() + 30 * 864e5);
  await db.insert(sessions).values({ sessionToken, userId: u.id, expires });
  const locale = url.searchParams.get("locale") ?? "ms";
  const res = NextResponse.redirect(`${BRAND.siteUrl}/${locale}/account`);
  const secure = BRAND.siteUrl.startsWith("https");
  res.cookies.set(secure ? "__Secure-authjs.session-token" : "authjs.session-token", sessionToken, { httpOnly: true, secure, sameSite: "lax", path: "/", expires });
  return res;
}
