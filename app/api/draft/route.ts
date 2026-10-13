import { NextResponse } from "next/server";
import { REASON_MODEL, chat, hasKey } from "@/lib/llm";
import { DRAFT_SYSTEM } from "@/lib/prompts";
import { model } from "@/lib/model";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!hasKey()) return NextResponse.json({ error: "AI is not configured (GROQ_API_KEY missing)." }, { status: 503 });
  const { signalId } = await req.json().catch(() => ({ signalId: "" }));
  const s = model.signals.find((x) => x.id === signalId);
  if (!s) return NextResponse.json({ error: "Unknown item" }, { status: 404 });
  const a = model.accounts.find((x) => x.id === s.account_id);
  const doc = model.docs.find((d) => d.id === s.doc_id);
  const open = model.signals.filter((x) => x.account_id === s.account_id && x.status === "open").map((x) => `- ${x.title} ("${x.quote}")`);
  const owner = s.owner || a?.owner || "the AtliQ team";
  try {
    const text = await chat({
      model: REASON_MODEL,
      system: DRAFT_SYSTEM,
      user: [
        `From: ${owner} (AtliQ Technologies)`,
        `To: ${a?.contact_name || "the client contact"} at ${a?.company || "the client"}`,
        `Action to address: ${s.title}`,
        `Other open items on this account:\n${open.join("\n")}`,
        `THREAD:\n${doc?.text || ""}`,
      ].join("\n\n"),
      maxTokens: 1500,
      temperature: 0.2,
      effort: "medium",
    });
    const body = text.replace(/\*\*/g, "").replace(/^subject:.*\n+/i, "").trim();
    const subjectLine = (doc?.text.match(/\*\*Subject:\*\*\s*(.+)/)?.[1] || a?.company || "Follow-up").replace(/^(RE:\s*)+/i, "");
    const tbd = [...body.matchAll(/\[TBD:?\s*([^\]]*)\]/g)].map((m) => m[1]);
    // Code check: every number, amount or date written outside a [TBD] must already appear in the thread.
    const thread = (doc?.text || "").toLowerCase();
    const outside = body.replace(/\[TBD[^\]]*\]/g, "");
    const facts = [...new Set(outside.match(/\$?\d[\d,.]*\s*(k|%|weeks?|days?|months?)?/gi) || [])].map((x) => x.trim());
    const unverified = facts.filter((f) => !thread.includes(f.toLowerCase()));
    return NextResponse.json({ subject: `Re: ${subjectLine}`, body, tbd, unverified });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "AI error" }, { status: 502 });
  }
}
