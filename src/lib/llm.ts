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

const GEMINI_NATIVE = "https://generativelanguage.googleapis.com/v1beta";
let geminiModelsCache: { at: number; models: string[] } | null = null;

/** Ask Gemini which models this key can use (native ListModels). Newest "flash" text models first; cached 1h. */
export async function discoverGeminiModels(key: string): Promise<string[]> {
  if (geminiModelsCache && Date.now() - geminiModelsCache.at < 36e5) return geminiModelsCache.models;
  try {
    const r = await fetch(`${GEMINI_NATIVE}/models?pageSize=200&key=${encodeURIComponent(key)}`, { signal: AbortSignal.timeout(15_000) });
    if (!r.ok) return [];
    const j = (await r.json()) as { models?: { name: string; supportedGenerationMethods?: string[] }[] };
    const ok = (j.models ?? [])
      .filter((m) => (m.supportedGenerationMethods ?? []).includes("generateContent"))
      .map((m) => m.name.replace(/^models\//, ""))
      .filter((n) => /gemini/.test(n) && !/(image|tts|audio|live|embedding|vision|thinking-exp|exp|preview-0)/i.test(n));
    const score = (n: string) => (/flash/.test(n) ? 100 : 0) + (/lite/.test(n) ? -20 : 0) + (parseFloat(n.match(/gemini-(\d+(?:\.\d+)?)/)?.[1] ?? "0") * 10) + (/latest/.test(n) ? 1 : 0);
    const models = [...new Set(ok)].sort((a, b) => score(b) - score(a));
    geminiModelsCache = { at: Date.now(), models };
    return models;
  } catch { return []; }
}

/** Native Gemini generateContent fallback (used when the OpenAI-compatible route 404s). */
async function geminiNative<T>(key: string, model: string, args: { system: string; user: string; schema: Record<string, unknown>; maxTokens?: number }): Promise<{ json: T; model: string }> {
  const r = await fetch(`${GEMINI_NATIVE}/models/${model}:generateContent?key=${encodeURIComponent(key)}`, {
    method: "POST", headers: { "content-type": "application/json" }, signal: AbortSignal.timeout(120_000),
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: `${args.system}\n\nRespond with ONLY a JSON object matching this JSON Schema:\n${JSON.stringify(args.schema)}` }] },
      contents: [{ role: "user", parts: [{ text: args.user }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: args.maxTokens ?? 6000, responseMimeType: "application/json" },
    }),
  });
  const body = await r.text();
  if (!r.ok) throw new Error(`gemini native ${model}: ${r.status} ${body.slice(0, 200)}`);
  const j = JSON.parse(body) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  const text = j.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  return { json: extractJson<T>(text), model: `gemini/${model}` };
}

/** Call an OpenAI-compatible chat endpoint and return { json, model }. Tries fallback models on 404/400 model errors. */
export async function generateJson<T>(args: { system: string; user: string; schema: Record<string, unknown>; maxTokens?: number }): Promise<{ json: T; model: string }> {
  const p = llmProvider();
  if (p === "anthropic") return generateWithAnthropic<T>(args);
  const spec = PROVIDERS[p];
  const key = process.env[spec.keyEnv];
  if (!key) throw new Error(`${spec.keyEnv} not set`);
  let models = process.env.LLM_MODEL ? [process.env.LLM_MODEL, ...spec.models] : spec.models;
  if (p === "gemini") {
    const found = await discoverGeminiModels(key);
    if (found.length) models = [...new Set([...(process.env.LLM_MODEL ? [process.env.LLM_MODEL] : []), ...found.slice(0, 4), ...spec.models])];
  }
  let lastErr = "";
  let sawNotFound = false;
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
    const raw = await r.text();
    let j: { choices?: { message?: { content?: string } }[]; error?: { message?: string } } = {};
    try { j = JSON.parse(raw); } catch { /* non-JSON body (HTML 404 etc.) */ }
    if (!r.ok) {
      lastErr = `${p} ${model}: ${r.status} ${(j.error?.message ?? raw.replace(/\s+/g, " ")).slice(0, 200)}`.trim();
      if (r.status === 404 || /model|not found|decommission/i.test(j.error?.message ?? "")) { sawNotFound = true; continue; } // try next model
      throw new Error(lastErr);
    }
    const text = j.choices?.[0]?.message?.content ?? "";
    return { json: extractJson<T>(text), model: `${p}/${model}` };
  }
  // OpenAI-compatible route rejected every model: for Gemini, fall back to the native API with a discovered model.
  if (p === "gemini" && sawNotFound) {
    const found = await discoverGeminiModels(key);
    const model = process.env.LLM_MODEL ?? found[0] ?? spec.models[1];
    return geminiNative<T>(key, model, args);
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
