// Provider-agnostic JSON generation. Default: Google Gemini (free tier, OpenAI-compatible endpoint).
// Also: groq (Llama), openrouter (free models), anthropic (Claude SDK). Pick with LLM_PROVIDER.

export type Provider = "gemini" | "groq" | "openrouter" | "anthropic";

const PROVIDERS: Record<Exclude<Provider, "anthropic">, { url: string; keyEnv: string; models: string[]; headers?: Record<string, string> }> = {
  gemini: { url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", keyEnv: "GEMINI_API_KEY", models: ["gemini-3-flash", "gemini-2.5-flash"] },
  groq: { url: "https://api.groq.com/openai/v1/chat/completions", keyEnv: "GROQ_API_KEY", models: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"] },
  openrouter: { url: "https://openrouter.ai/api/v1/chat/completions", keyEnv: "OPENROUTER_API_KEY", models: ["meta-llama/llama-3.3-70b-instruct:free", "meta-llama/llama-4-maverick:free"], headers: { "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL ?? "", "X-Title": "Sam Trading" } },
};

export function llmProvider(): Provider {
  const p = (process.env.LLM_PROVIDER ?? "").toLowerCase() as Provider;
  if (p && (p === "anthropic" || p in PROVIDERS)) return p;
  if (process.env.GEMINI_API_KEY) return "gemini";
  if (process.env.GROQ_API_KEY) return "groq";
  if (process.env.OPENROUTER_API_KEY) return "openrouter";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  return "gemini";
}
export function llmConfigured() {
  const p = llmProvider();
  return Boolean(p === "anthropic" ? process.env.ANTHROPIC_API_KEY : process.env[PROVIDERS[p].keyEnv]);
}
export function llmLabel() {
  const p = llmProvider();
  return p === "anthropic" ? "anthropic / claude-opus-5" : `${p} / ${process.env.LLM_MODEL ?? PROVIDERS[p].models[0]}`;
}

/** Extract a JSON object from model text (tolerates ```json fences and leading prose). */
export function extractJson<T>(text: string): T {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = (fenced ? fenced[1] : text).trim();
  const start = body.indexOf("{"); const end = body.lastIndexOf("}");
  if (start < 0 || end < 0) throw new Error("no JSON object in model output");
  return JSON.parse(body.slice(start, end + 1)) as T;
}

/** Call an OpenAI-compatible chat endpoint and return { json, model }. Tries fallback models on 404/400 model errors. */
export async function generateJson<T>(args: { system: string; user: string; schema: Record<string, unknown>; maxTokens?: number }): Promise<{ json: T; model: string }> {
  const p = llmProvider();
  if (p === "anthropic") return generateWithAnthropic<T>(args);
  const spec = PROVIDERS[p];
  const key = process.env[spec.keyEnv];
  if (!key) throw new Error(`${spec.keyEnv} not set`);
  const models = process.env.LLM_MODEL ? [process.env.LLM_MODEL, ...spec.models] : spec.models;
  let lastErr = "";
  for (const model of models) {
    const r = await fetch(spec.url, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}`, ...(spec.headers ?? {}) },
      body: JSON.stringify({
        model, temperature: 0.7, max_tokens: args.maxTokens ?? 6000,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: `${args.system}\n\nRespond with ONLY a JSON object matching this JSON Schema:\n${JSON.stringify(args.schema)}` },
          { role: "user", content: args.user },
        ],
      }),
      signal: AbortSignal.timeout(120_000),
    });
    const j = (await r.json().catch(() => ({}))) as { choices?: { message?: { content?: string } }[]; error?: { message?: string } };
    if (!r.ok) {
      lastErr = `${p} ${model}: ${r.status} ${j.error?.message ?? ""}`.trim();
      if (r.status === 404 || /model|not found|decommission/i.test(j.error?.message ?? "")) continue; // try next model
      throw new Error(lastErr);
    }
    const text = j.choices?.[0]?.message?.content ?? "";
    return { json: extractJson<T>(text), model: `${p}/${model}` };
  }
  throw new Error(lastErr || `${p}: no model available`);
}

async function generateWithAnthropic<T>(args: { system: string; user: string; schema: Record<string, unknown>; maxTokens?: number }): Promise<{ json: T; model: string }> {
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic();
  const stream = client.beta.messages.stream({
    model: "claude-opus-5", max_tokens: Math.max(args.maxTokens ?? 6000, 8000),
    betas: ["server-side-fallback-2026-07-01"], fallbacks: "default",
    system: [{ type: "text", text: args.system, cache_control: { type: "ephemeral" } }],
    output_config: { effort: "high", format: { type: "json_schema", schema: args.schema } },
    messages: [{ role: "user", content: args.user }],
  });
  const msg = await stream.finalMessage();
  if (msg.stop_reason === "refusal") throw new Error(`refused: ${msg.stop_details?.explanation ?? ""}`);
  const text = msg.content.filter((b) => b.type === "text").map((b) => b.text).join("");
  return { json: extractJson<T>(text), model: msg.model };
}
