// Provider-agnostic LLM client. The prototype runs on Groq (OpenAI-compatible API);
// production per the PRD is Claude (Haiku for extraction, Opus for generation).

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

export const EXTRACT_MODEL = process.env.GROQ_EXTRACT_MODEL || "openai/gpt-oss-20b";
export const REASON_MODEL = process.env.GROQ_REASON_MODEL || "openai/gpt-oss-120b";

export function hasKey(): boolean {
  return Boolean(process.env.GROQ_API_KEY);
}

interface ChatOpts {
  model: string;
  system: string;
  user: string;
  json?: boolean;
  maxTokens?: number;
  temperature?: number;
  effort?: "low" | "medium" | "high";
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function chat({ model, system, user, json, maxTokens = 1500, temperature = 0, effort = "low" }: ChatOpts): Promise<string> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("GROQ_API_KEY is not set");
  for (let attempt = 0; attempt < 8; attempt++) {
    let res: Response;
    try {
      res = await fetch(GROQ_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        temperature,
        max_tokens: maxTokens,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        ...(json ? { response_format: { type: "json_object" } } : {}),
        // gpt-oss models reason before answering; keep it short and hide the reasoning text.
        ...(model.startsWith("openai/gpt-oss") ? { reasoning_effort: effort, include_reasoning: false } : {}),
      }),
      });
    } catch {
      // network hiccup (DNS, reset) — back off and retry
      await sleep(2 ** attempt * 2000);
      continue;
    }
    if (res.status === 429 || res.status >= 500) {
      const wait = Number(res.headers.get("retry-after")) || 2 ** attempt * 3;
      await sleep(Math.min(wait, 90) * 1000);
      continue;
    }
    if (!res.ok) throw new Error(`LLM error ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? "";
  }
  throw new Error("LLM rate limit: retries exhausted");
}

export async function chatJSON<T>(opts: ChatOpts): Promise<T> {
  const text = await chat({ ...opts, json: true });
  try {
    return JSON.parse(text) as T;
  } catch {
    const m = text.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]) as T;
    throw new Error("Model did not return valid JSON");
  }
}
