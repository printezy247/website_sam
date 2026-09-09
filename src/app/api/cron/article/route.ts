// Manual article run: GET /api/cron/article?key=<CRON_SECRET>  (add &wait=1 to block until it is published)
// Always generates (skips the 20h guard) unless &force=0. Same auth as /api/cron/evaluate.
import { ensureDailyArticle } from "@/lib/articles";
import { llmConfigured, llmLabel } from "@/lib/llm";
export const dynamic = "force-dynamic";
export const maxDuration = 300;
export async function GET(req: Request) {
  const url = new URL(req.url);
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") ?? url.searchParams.get("key");
  if (secret && auth !== `Bearer ${secret}` && auth !== secret) return new Response("unauthorized", { status: 401 });
  if (!llmConfigured()) return Response.json({ ok: false, error: "no LLM key set" }, { status: 503 });
  const force = url.searchParams.get("force") !== "0";
  const run = ensureDailyArticle(force);
  if (url.searchParams.get("wait") === "1") {
    const row = await run.catch((e) => ({ error: String(e) }));
    return Response.json(row && "slug" in row ? { ok: true, slug: row.slug, model: row.model, provider: llmLabel() } : { ok: false, ...row });
  }
  void run.catch((e) => console.error("[cron] article", e));
  return Response.json({ ok: true, started: true, force, provider: llmLabel(), hint: "check /education in ~1 min, or add &wait=1" });
}
