import { NextResponse } from "next/server";
import { resolveDue } from "@/lib/dates";
import { EXTRACT_MODEL, chatJSON, hasKey } from "@/lib/llm";
import { MOM_SYSTEM } from "@/lib/prompts";

export const runtime = "nodejs";

interface Mom {
  title?: string;
  summary?: string;
  highlights?: string[];
  budget_usd?: number | null;
  decision_maker?: string;
  actions?: { title?: string; owner?: string; quote?: string; due_phrase?: string }[];
}

const norm = (s: string) =>
  s.toLowerCase().replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/[‐-―]/g, "-").replace(/\s+/g, " ").trim();

// Live MOM capture: raw notes -> summary, highlights and follow-ups (quotes verified, dates in code).
export async function POST(req: Request) {
  if (!hasKey()) return NextResponse.json({ error: "AI is not configured (GROQ_API_KEY missing)." }, { status: 503 });
  const { notes, company, date } = await req.json().catch(() => ({}));
  const t = String(notes || "").trim().slice(0, 8000);
  const meetingDate = /^\d{4}-\d{2}-\d{2}$/.test(String(date)) ? String(date) : "2026-07-10";
  if (t.length < 15) return NextResponse.json({ error: "Add a few lines of notes first." }, { status: 400 });
  try {
    const out = await chatJSON<Mom>({
      model: EXTRACT_MODEL,
      system: MOM_SYSTEM,
      user: `Client: ${company || "unknown"}\nMeeting date: ${meetingDate}\n---\n${t}`,
      maxTokens: 3000,
    });
    const actions = (out.actions || [])
      .filter((a) => a.title && a.quote && norm(t).includes(norm(a.quote).replace(/^["']|["']$/g, "")))
      .map((a) => {
        const due = resolveDue(a.due_phrase || "", meetingDate, "meeting_action");
        return {
          title: a.title!,
          owner: ["Bhavin", "Dhaval", "Karandeep", "Jay", "Pranav", "Ayush"].includes(a.owner || "") ? a.owner! : "",
          quote: a.quote!,
          due_date: due.date,
          needs_review: due.needs_review,
        };
      });
    return NextResponse.json({
      title: out.title || "Meeting notes",
      summary: out.summary || "",
      highlights: (out.highlights || []).slice(0, 4),
      budget_usd: typeof out.budget_usd === "number" ? out.budget_usd : null,
      decision_maker: out.decision_maker || "",
      actions,
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "AI error" }, { status: 502 });
  }
}
