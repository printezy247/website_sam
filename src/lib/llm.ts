// Provider-agnostic JSON generation over OpenAI-compatible chat endpoints, plus the Anthropic SDK.
// Providers: gemini, groq, openrouter, nvidia, moonshot, ollama, custom (LLM_BASE_URL), anthropic.
// Order: LLM_PROVIDER first, then every other provider with a key, as failover. LLM_MODEL pins a model on the first provider.

export type Provider = "gemini" | "groq" | "openrouter" | "nvidia" | "moonshot" | "ollama" | "custom" | "anthropic";
export type OpenAiProvider = Exclude<Provider, "anthropic">;

type Spec = { url: string; keyEnv: string; models: string[]; headers?: Record<string, string>; jsonMode?: boolean; free?: boolean };
const ollamaBase = (process.env.OLLAMA_BASE_URL ?? "https://ollama.com").replace(/\/+$/, "");
const customBase = (process.env.LLM_BASE_URL ?? "").replace(/\/+$/, "");
const PROVIDERS: Record<OpenAiProvider, Spec> = {
  gemini: { url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", keyEnv: "GEMINI_API_KEY", models: ["gemini-3.7-flash", "gemini-3-flash", "gemini-2.5-flash"], jsonMode: true },
  groq: { url: "https://api.groq.com/openai/v1/chat/completions", keyEnv: "GROQ_API_KEY", models: ["llama-3.3-70b-versatile", "openai/gpt-oss-120b", "llama-3.1-8b-instant"], jsonMode: true },
  openrouter: { url: "https://openrouter.ai/api/v1/chat/completions", keyEnv: "OPENROUTER_API_KEY", models: ["north/north-mini-code", "meta-llama/llama-3.3-70b-instruct:free", "deepseek/deepseek-chat-v3.1:free"], headers: { "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL ?? "", "X-Title": "SAMBANGGOLD" }, jsonMode: true, free: true },
  // NVIDIA NIM: free developer tier, OpenAI-compatible. Model ids are namespaced (vendor/model).
  nvidia: { url: "https://integrate.api.nvidia.com/v1/chat/completions", keyEnv: "NVIDIA_API_KEY", models: ["nvidia/nemotron-3.5-lightning-30b-a3b", "meta/llama-3.3-70b-instruct", "moonshotai/kimi-k2-instruct", "deepseek-ai/deepseek-v3.1"], jsonMode: false },
  // Moonshot Kimi (api.moonshot.ai). Set MOONSHOT_BASE_URL=https://api.moonshot.cn/v1 for the China endpoint.
  moonshot: { url: `${(process.env.MOONSHOT_BASE_URL ?? "https://api.moonshot.ai/v1").replace(/\/+$/, "")}/chat/completions`, keyEnv: "MOONSHOT_API_KEY", models: ["kimi-k3", "kimi-k2-0905-preview", "kimi-k2-turbo-preview"], jsonMode: true },
  // Ollama cloud (ollama.com, key from ollama.com/settings/keys) or a self-hosted server via OLLAMA_BASE_URL.
  ollama: { url: `${ollamaBase}/v1/chat/completions`, keyEnv: "OLLAMA_API_KEY", models: ["gpt-oss:120b", "deepseek-v3.1:671b", "kimi-k2:1t", "qwen3:235b", "gemma3:27b"], jsonMode: true },
  // Any other OpenAI-compatible server: LLM_BASE_URL=https://host/v1, LLM_API_KEY, LLM_MODEL.
  custom: { url: `${customBase}/chat/completions`, keyEnv: "LLM_API_KEY", models: [], jsonMode: true },
};
/** Per-provider pin: LLM_MODEL_NVIDIA="nemotron 3.5 lightning" (words, fuzzy) or an exact id. */
export function pinnedModel(p: Provider) { return process.env[`LLM_MODEL_${p.toUpperCase()}`]?.trim() || undefined; }
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
/** Resolve a pin against the live list: exact id, else every word of the pin appears in the id (newest/largest first), else the pin as typed. */
export function resolveModel(pin: string, found: string[]) {
  if (found.includes(pin)) return pin;
  const words = norm(pin).split(" ").filter(Boolean);
  const hits = found.filter((id) => { const n = norm(id); return words.every((w) => n.includes(w)); });
  return hits[0] ?? pin;
}
export const PROVIDER_ORDER: Provider[] = ["gemini", "ollama", "openrouter", "nvidia", "moonshot", "groq", "custom", "anthropic"];

function hasKey(p: Provider) {
  if (p === "anthropic") return Boolean(process.env.ANTHROPIC_API_KEY);
  if (p === "custom") return Boolean(customBase && process.env.LLM_API_KEY);
  if (p === "ollama") return Boolean(process.env.OLLAMA_API_KEY || process.env.OLLAMA_BASE_URL);
  return Boolean(process.env[PROVIDERS[p].keyEnv]);
}
/** Every provider with credentials, preferred one first. */
export function llmProviders(): Provider[] {
  const pinned = (process.env.LLM_PROVIDER ?? "").toLowerCase() as Provider;
  const rest = PROVIDER_ORDER.filter((p) => p !== pinned && hasKey(p));
  return pinned && PROVIDER_ORDER.includes(pinned) ? [pinned, ...rest] : rest;
}
export function llmProvider(): Provider { return llmProviders()[0] ?? "gemini"; }
export function llmConfigured() { return llmProviders().some(hasKey); }
export function llmLabel() {
  const ps = llmProviders();
  if (!ps.length) return "none";
  const p = ps[0];
  const first = p === "anthropic" ? "claude-opus-5" : process.env.LLM_MODEL ?? PROVIDERS[p].models[0] ?? "auto";
  return `${p} / ${first}${ps.length > 1 ? ` (+${ps.slice(1).join(", ")})` : ""}`;
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

const listCache = new Map<string, { at: number; models: string[] }>();
/** Ask an OpenAI-compatible provider which chat models exist; ranked for long bilingual JSON writing, cached 1h. */
export async function discoverOpenAiModels(p: OpenAiProvider, key: string): Promise<string[]> {
  const hit = listCache.get(p);
  if (hit && Date.now() - hit.at < 36e5) return hit.models;
  try {
    const base = PROVIDERS[p].url.replace(/\/chat\/completions$/, "");
    const r = await fetch(`${base}/models`, { headers: { authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(15_000) });
    if (!r.ok) return [];
    const j = (await r.json()) as { data?: { id: string; active?: boolean; pricing?: { prompt?: string } }[] };
    const bad = /(whisper|tts|guard|embed|vision|image|audio|moderation|rerank|allam|compound|safeguard|prompt-guard|reward|retriever|ocr|parse|speech|translate|nv-|clip|sd|flux|video|3d|classif|safety|-vl|vl-|omni|coder|math|code)/i;
    let ids = (j.data ?? []).filter((m) => m.active !== false && !bad.test(m.id)).map((m) => ({ id: m.id, free: m.pricing?.prompt === "0" || /:free$/.test(m.id) }));
    if (PROVIDERS[p].free) { const keep = new Set([...PROVIDERS[p].models, pinnedModel(p) ?? ""]); ids = ids.filter((m) => m.free || keep.has(m.id)); } // free routes, plus explicit picks
    const size = (id: string) => { const m = id.match(/(\d{2,3})b/i) ?? id.match(/(\d)t\b/i); return m ? (/t\b/i.test(m[0]) ? Number(m[1]) * 1000 : Number(m[1])) : /maverick|scout|gpt-oss|deepseek|qwen3|kimi|nemotron|mistral-large|glm/i.test(id) ? 70 : 10; };
    const score = (id: string) => (/llama|kimi|deepseek|gpt-oss|qwen3|nemotron/i.test(id) ? 30 : 0) + (/instruct|versatile|chat/i.test(id) ? 10 : 0) + Math.min(size(id), 200) + (/preview|exp|thinking|reasoning|r1|-mini|nano|lite|small|tiny|1b|3b|7b|8b/i.test(id) ? -15 : 0);
    const models = ids.map((m) => m.id).sort((a, b) => score(b) - score(a));
    listCache.set(p, { at: Date.now(), models });
    return models;
  } catch { return []; }
}

/** Providers with keys and the models each one exposes right now (for the admin panel). */
export async function llmInventory() {
  const out: { provider: Provider; label: string; models: string[]; pin?: string; uses: string; live: boolean }[] = [];
  for (const p of llmProviders()) {
    if (p === "anthropic") { out.push({ provider: p, label: "Anthropic SDK", models: ["claude-opus-5"], uses: "claude-opus-5", live: true }); continue; }
    const key = process.env[PROVIDERS[p].keyEnv] ?? "";
    const found = p === "gemini" ? await discoverGeminiModels(key) : await discoverOpenAiModels(p, key);
    const pin = pinnedModel(p);
    const uses = pin ? resolveModel(pin, found) : PROVIDERS[p].models.find((m) => found.includes(m)) ?? found[0] ?? PROVIDERS[p].models[0] ?? "(set LLM_MODEL_" + p.toUpperCase() + ")";
    out.push({ provider: p, label: PROVIDERS[p].url.replace(/\/(v1beta\/openai|openai\/v1|api\/v1|v1)?\/chat\/completions$/, ""), models: found.length ? found.slice(0, 12) : PROVIDERS[p].models, pin, uses, live: found.length > 0 });
  }
  return out;
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

/** Generate JSON. Walks every configured provider in order; within one, tries discovered models on model errors. */
export async function generateJson<T>(args: { system: string; user: string; schema: Record<string, unknown>; maxTokens?: number; provider?: Provider; model?: string }): Promise<{ json: T; model: string }> {
  const providers = args.provider ? [args.provider] : llmProviders();
  if (!providers.length) throw new Error("No LLM API key set (GEMINI_API_KEY, GROQ_API_KEY, NVIDIA_API_KEY, OPENROUTER_API_KEY, MOONSHOT_API_KEY, OLLAMA_API_KEY, LLM_BASE_URL+LLM_API_KEY or ANTHROPIC_API_KEY)");
  const errors: string[] = [];
  for (const [i, p] of providers.entries()) {
    try {
      if (p === "anthropic") return await generateWithAnthropic<T>(args);
      const pinned = args.model ?? (i === 0 ? process.env.LLM_MODEL : undefined);
      return await generateWithProvider<T>(p, args, pinned);
    } catch (e) {
      errors.push((e as Error).message);
      console.warn(`[llm] ${p} failed: ${(e as Error).message.slice(0, 200)}`);
    }
  }
  throw new Error(errors.join(" | "));
}

async function generateWithProvider<T>(p: OpenAiProvider, args: { system: string; user: string; schema: Record<string, unknown>; maxTokens?: number }, pinned?: string): Promise<{ json: T; model: string }> {
  const spec = PROVIDERS[p];
  const key = process.env[spec.keyEnv] ?? (p === "ollama" ? "ollama" : "");
  if (!key) throw new Error(`${spec.keyEnv} not set`);
  const found = p === "gemini" ? await discoverGeminiModels(key) : await discoverOpenAiModels(p, key);
  const pin = pinned ?? pinnedModel(p);
  const first = pin ? resolveModel(pin, found) : undefined;
  let models = first ? [first, ...spec.models] : spec.models;
  if (found.length) models = [...new Set([...(first ? [first] : []), ...spec.models.filter((m) => found.includes(m)), ...found.slice(0, 4), ...spec.models])];
  if (!models.length) throw new Error(`${p}: no model (set LLM_MODEL)`);
  let lastErr = "";
  let sawNotFound = false;
  for (const model of models) {
    const r = await fetch(spec.url, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}`, ...(spec.headers ?? {}) },
      body: JSON.stringify({
        model, temperature: 0.7, max_tokens: args.maxTokens ?? 6000,
        ...(spec.jsonMode ? { response_format: { type: "json_object" } } : {}),
        messages: [
          { role: "system", content: `${args.system}\n\nRespond with ONLY a JSON object matching this JSON Schema:\n${JSON.stringify(args.schema)}` },
          { role: "user", content: args.user },
        ],
      }),
      signal: AbortSignal.timeout(150_000),
    });
    const raw = await r.text();
    let j: { choices?: { message?: { content?: string } }[]; error?: { message?: string } } = {};
    try { j = JSON.parse(raw); } catch { /* non-JSON body (HTML 404 etc.) */ }
    if (!r.ok) {
      lastErr = `${p} ${model}: ${r.status} ${(j.error?.message ?? raw.replace(/\s+/g, " ")).slice(0, 200)}`.trim();
      if (r.status === 404 || r.status === 400 || r.status === 429 || /model|not found|decommission|unsupported|quota|rate/i.test(j.error?.message ?? "")) { sawNotFound = true; continue; } // try next model
      throw new Error(lastErr);
    }
    const text = j.choices?.[0]?.message?.content ?? "";
    try { return { json: extractJson<T>(text), model: `${p}/${model}` }; }
    catch (e) { lastErr = `${p} ${model}: bad JSON (${(e as Error).message})`; continue; }
  }
  // OpenAI-compatible route rejected every model: for Gemini, fall back to the native API with a discovered model.
  if (p === "gemini" && sawNotFound) {
    const model = pinned ?? found[0] ?? spec.models[1];
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
