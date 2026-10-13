import { NextResponse } from "next/server";
import { hasKey } from "@/lib/llm";

export const runtime = "nodejs";

const MAX_BYTES = 4 * 1024 * 1024; // Vercel free tier caps request bodies at ~4.5 MB (~10-15 min of compressed audio)
const MODEL = process.env.GROQ_STT_MODEL || "whisper-large-v3-turbo";

// Meeting recording -> text with Whisper (Groq). The transcript then goes through the same MOM step.
export async function POST(req: Request) {
  if (!hasKey()) return NextResponse.json({ error: "AI is not configured (GROQ_API_KEY missing)." }, { status: 503 });
  const form = await req.formData().catch(() => null);
  const file = form?.get("audio");
  if (!(file instanceof Blob) || file.size === 0) return NextResponse.json({ error: "No audio received." }, { status: 400 });
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Recording is too long for the prototype (max ~10-15 minutes). Split it, or use the meeting bot in production." }, { status: 413 });
  }
  const name = (file as File).name || "meeting.webm";
  const out = new FormData();
  out.append("file", file, name);
  out.append("model", MODEL);
  out.append("response_format", "json");
  out.append("language", "en");
  try {
    const r = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
      body: out,
    });
    if (!r.ok) return NextResponse.json({ error: `Transcription failed (${r.status}): ${(await r.text()).slice(0, 200)}` }, { status: 502 });
    const j = await r.json();
    return NextResponse.json({ text: String(j.text || "").trim(), model: MODEL });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Transcription error" }, { status: 502 });
  }
}
