import { createWebhookHandler } from "@/bot";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!token || !secret) return new Response("bot not configured", { status: 503 });
  const handler = createWebhookHandler(token, secret);
  try {
    return await handler(req);
  } catch (e) {
    // Always 200 after auth passed: Telegram retries non-2xx forever and would replay the update.
    console.error("[telegram-webhook]", e);
    return new Response("ok");
  }
}
