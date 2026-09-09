// Manual article run: GET /api/cron/article?key=<CRON_SECRET>  (add &wait=1 to block until it is published)
// Always generates (skips the 20h guard) unless &force=0. Same auth as /api/cron/evaluate.
// &provider=nvidia&model=meta/llama-3.3-70b-instruct tests one provider/model (implies wait=1).
import { ensureDailyArticle, generateArticle } from "@/lib/articles";
import { llmConfigured, llmLabel, rawModels, type OpenAiProvider, type Provider } from "@/lib/llm";
export const dynamic = "force-dynamic";
export const maxDuration = 300;
export async function GET(req: Request) {
  const url = new URL(req.url);
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") ?? url.searchParams.get("key");
  if (secret && auth !== `Bearer ${secret}` && auth !== secret) return new Response("unauthorized", { status: 401 });
  if (!llmConfigured()) return Response.json({ ok: false, error: "no LLM key set" }, { status: 503 });
  const provider = url.searchParams.get("provider") as Provider | null;
  // &models=1 lists the raw ids the key can see, for choosing a pin.
  if (provider && provider !== "anthropic" && url.searchParams.get("models") === "1") return Response.json({ provider, ...(await rawModels(provider as OpenAiProvider)) });
  if (provider) {
    const t0 = Date.now();
    try {
      const row = await generateArticle(undefined, { provider, model: url.searchParams.get("model") ?? undefined });
      return Response.json({ ok: true, slug: row.slug, model: row.model, seconds: Math.round((Date.now() - t0) / 1000) });
    } catch (e) { return Response.json({ ok: false, error: String((e as Error).message) }, { status: 502 }); }
  }
  const force = url.searchParams.get("force") !== "0";
  const run = ensureDailyArticle(force);
  if (url.searchParams.get("wait") === "1") {
    const row = await run.catch((e) => ({ error: String(e) }));
    return Response.json(row && "slug" in row ? { ok: true, slug: row.slug, model: row.model, provider: llmLabel() } : { ok: false, ...row });
  }
  void run.catch((e) => console.error("[cron] article", e));
  return Response.json({ ok: true, started: true, force, provider: llmLabel(), hint: "check /education in ~1 min, or add &wait=1" });
}
