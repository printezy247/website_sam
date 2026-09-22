// The daily jobs over HTTP, for hosts without a cron service (Vercel + cron-job.org).
// Call once a day: GET /api/cron/jobs?key=<CRON_SECRET>. Idempotent: each job checks its own guard.
import { runJobs } from "@/lib/jobs";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") ?? new URL(req.url).searchParams.get("key");
  if (secret && auth !== `Bearer ${secret}` && auth !== secret) return new Response("unauthorized", { status: 401 });
  try {
    const log = await runJobs();
    return Response.json({ ok: true, log });
  } catch (e) {
    console.error("[cron] jobs", e);
    return Response.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
