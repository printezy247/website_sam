// External cron (or Railway cron via curl) can hit this to tally running signals against live candles.
import { evaluateRunningSignals } from "@/lib/evaluate";
import { ensureAutoSignal } from "@/lib/auto-signal";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") ?? new URL(req.url).searchParams.get("key");
  if (secret && auth !== `Bearer ${secret}` && auth !== secret) return new Response("unauthorized", { status: 401 });
  const r = await evaluateRunningSignals({ force: true });
  const auto = await ensureAutoSignal(true).catch(() => null);
  return Response.json({ ...r, autoSignal: auto ? auto.id : null });
}
