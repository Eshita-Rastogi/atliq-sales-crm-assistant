import { NextResponse } from "next/server";
import { REFERENCE_DATE, resolveDue } from "@/lib/dates";
import { EXTRACT_MODEL, chatJSON, hasKey } from "@/lib/llm";
import { CAPTURE_SYSTEM } from "@/lib/prompts";

export const runtime = "nodejs";

interface Capture {
  company?: string;
  contact_name?: string;
  contact_email?: string;
  source?: string;
  service?: string;
  value_usd?: number | null;
  owner?: string;
  summary?: string;
  follow_ups?: { title?: string; quote?: string; due_phrase?: string }[];
}

const norm = (s: string) =>
  s.toLowerCase().replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/[‐-―]/g, "-").replace(/\s+/g, " ").trim();

// AI quick-capture: pasted email / note / card text -> pre-filled lead form + follow-ups.
export async function POST(req: Request) {
  if (!hasKey()) return NextResponse.json({ error: "AI is not configured (GROQ_API_KEY missing)." }, { status: 503 });
  const { text } = await req.json().catch(() => ({ text: "" }));
  const t = String(text || "").trim().slice(0, 6000);
  if (t.length < 20) return NextResponse.json({ error: "Paste a bit more text (an email, note or card)." }, { status: 400 });
  try {
    const out = await chatJSON<Capture>({ model: EXTRACT_MODEL, system: CAPTURE_SYSTEM, user: t, maxTokens: 2500 });
    // Grounding: the email must appear in the text; follow-up quotes must be verbatim.
    const email = out.contact_email && t.toLowerCase().includes(out.contact_email.toLowerCase()) ? out.contact_email : "";
    const follow = (out.follow_ups || [])
      .filter((f) => f.quote && f.title && norm(t).includes(norm(f.quote).replace(/^["']|["']$/g, "")))
      .map((f) => {
        const due = resolveDue(f.due_phrase || "", REFERENCE_DATE, "client_ask");
        return { title: f.title!, quote: f.quote!, due_date: due.date, due_reason: due.reason, needs_review: due.needs_review };
      });
    return NextResponse.json({
      company: out.company || "",
      contact_name: out.contact_name || "",
      contact_email: email,
      source: out.source || "",
      service: out.service || "",
      value_usd: typeof out.value_usd === "number" ? out.value_usd : null,
      owner: ["Bhavin", "Dhaval", "Karandeep", "Jay"].includes(out.owner || "") ? out.owner : "",
      summary: out.summary || "",
      follow_ups: follow,
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "AI error" }, { status: 502 });
  }
}
