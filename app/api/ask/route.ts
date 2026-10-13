import { NextResponse } from "next/server";
import { REASON_MODEL, chat, hasKey } from "@/lib/llm";
import { ASK_SYSTEM } from "@/lib/prompts";
import { model } from "@/lib/model";

export const runtime = "nodejs";

// Grounded Q&A with lightweight retrieval: a compact line per CRM record and per document is
// always included; full text is added only for the few documents most relevant to the question.
// (Keeps each request under Groq's free-tier 8k tokens/minute. With a bigger budget the whole
// ~12k-token dataset fits in one prompt and no retrieval is needed.)
const MAX_DOCS = 4;
const MAX_DOC_CHARS = 2500;

function matchAccounts(q: string) {
  const words = q.toLowerCase().match(/[a-z0-9&]{4,}/g) || [];
  return {
    words,
    accounts: model.accounts.filter((a) =>
      words.some((w) => a.company.toLowerCase().split(/[^a-z0-9&]+/).some((t) => t.length >= 4 && (t.startsWith(w) || w.startsWith(t)))),
    ),
  };
}

function context(q: string): string {
  const { words, accounts } = matchAccounts(q);
  const ids = new Set(accounts.flatMap((a) => a.doc_ids));
  const top = model.docs
    .map((d) => ({ d, s: (ids.has(d.id) ? 10 : 0) + words.filter((w) => d.text.toLowerCase().includes(w)).length }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || b.d.date.localeCompare(a.d.date))
    .slice(0, MAX_DOCS)
    .map((x) => x.d);
  const topIds = new Set(top.map((d) => d.id));

  const crm = model.accounts
    .filter((a) => a.crm)
    .map((a) => {
      const c = a.crm!;
      const detail = accounts.includes(a)
        ? ` | contact ${c.contact_name} ${c.contact_email} | source ${c.source} | service ${c.service_interest || "-"} | created ${c.created_date} | next follow-up ${c.next_followup_date || "-"} | notes ${c.notes || "-"}`
        : "";
      return `[CRM ${c.lead_id}] ${c.company} | status ${c.status || "-"} | value ${c.est_value_usd ?? "-"} | owner ${c.owner || "-"} | last contact ${c.last_contact_date || "-"}${detail}`;
    })
    .join("\n");
  const summaries = model.docs
    .filter((d) => !topIds.has(d.id))
    .map((d) => `[${d.id}] ${(d.summary || d.title).slice(0, 170)}`)
    .join("\n");
  const full = top.map((d) => `=== [${d.id}] (${d.kind}, ${d.date})\n${d.text.slice(0, MAX_DOC_CHARS)}`).join("\n\n");
  return `CRM EXPORT\n${crm}\n\nOTHER DOCUMENTS (summaries)\n${summaries}\n\nMOST RELEVANT DOCUMENTS (full text)\n${full}`;
}

export async function POST(req: Request) {
  if (!hasKey()) return NextResponse.json({ error: "AI is not configured (GROQ_API_KEY missing)." }, { status: 503 });
  const { question } = await req.json().catch(() => ({ question: "" }));
  const q = String(question || "").trim().slice(0, 500);
  if (!q) return NextResponse.json({ error: "Ask a question first." }, { status: 400 });
  try {
    const answer = (
      await chat({
        model: REASON_MODEL,
        system: ASK_SYSTEM,
        user: `${context(q)}\n\nQUESTION: ${q}`,
        maxTokens: 900,
      })
    ).replace(/\*\*/g, "");
    const ids = new Set(model.docs.map((d) => d.id));
    const cited = [...new Set([...answer.matchAll(/\[([^\]]+)\]/g)].map((m) => m[1].trim()))];
    return NextResponse.json({
      answer,
      sources: cited.filter((c) => ids.has(c)),
      unverified: cited.filter((c) => !ids.has(c) && !/^CRM L-\d{4}$/.test(c.replace(/‑/g, "-"))),
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "AI error" }, { status: 502 });
  }
}
