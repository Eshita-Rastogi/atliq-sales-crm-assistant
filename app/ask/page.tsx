"use client";

import Link from "next/link";
import { useState } from "react";

interface Turn {
  q: string;
  answer?: string;
  sources?: string[];
  unverified?: string[];
  error?: string;
}

const SUGGESTED = [
  "Where does the Meridian deal stand, and what is waiting on us?",
  "Which deals have a client deadline in July?",
  "What did Priya at Acme ask for, and was it done?",
  "Who referred Citywide Diagnostics?",
  "Which lost deals have come back?",
  "Send the SOW to ShopSwift for me.",
];

export default function AskPage() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function ask(question: string) {
    if (!question.trim()) {
      setErr("Type a question first.");
      return;
    }
    setErr("");
    setBusy(true);
    setQ("");
    setTurns((t) => [...t, { q: question }]);
    try {
      const r = await fetch("/api/ask", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question }) });
      const j = await r.json();
      setTurns((t) => t.map((x, i) => (i === t.length - 1 ? (r.ok ? { ...x, ...j } : { ...x, error: j.error }) : x)));
    } catch {
      setTurns((t) => t.map((x, i) => (i === t.length - 1 ? { ...x, error: "Network error" } : x)));
    } finally {
      setBusy(false);
    }
  }

  const render = (text: string) =>
    text.split(/(\[[^\]]+\])/g).map((p, i) => {
      const m = p.match(/^\[([^\]]+)\]$/);
      if (!m) return <span key={i}>{p}</span>;
      const id = m[1].trim();
      if (/^CRM L-\d{4}$/.test(id)) return <span key={i} className="chip mx-0.5 border-slate-200 bg-slate-50 text-slate-600">{id}</span>;
      return (
        <Link key={i} href={`/docs/${encodeURIComponent(id)}`} className="chip mx-0.5 border-indigo-200 bg-indigo-50 text-indigo-700 hover:underline">
          {id}
        </Link>
      );
    });

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Ask the pipeline</h1>
        <p className="text-sm text-slate-500">
          Answers come only from the CRM, emails and meeting notes, with every fact cited. If the data doesn&apos;t say, the assistant says “Not found in the data”.
        </p>
      </div>

      <div className="space-y-3">
        {turns.map((t, i) => (
          <div key={i} className="space-y-2">
            <div className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-sm bg-indigo-600 px-3 py-2 text-sm text-white">{t.q}</div>
            <div className="card w-fit max-w-[95%] p-3 text-sm leading-relaxed text-slate-800">
              {t.error ? (
                <span className="text-rose-600">{t.error}</span>
              ) : t.answer ? (
                <>
                  <div className="whitespace-pre-wrap">{render(t.answer)}</div>
                  {t.unverified && t.unverified.length > 0 && (
                    <div className="mt-2 text-[11px] text-amber-700">⚠ Citation not found in the data: {t.unverified.join(", ")} — treat that part with caution.</div>
                  )}
                </>
              ) : (
                <span className="animate-pulse text-slate-500">Reading the pipeline…</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {turns.length === 0 && (
        <div className="grid gap-2 sm:grid-cols-2">
          {SUGGESTED.map((s) => (
            <button key={s} onClick={() => ask(s)} className="card p-3 text-left text-sm text-slate-700 hover:border-indigo-300">{s}</button>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(q);
        }}
        className="sticky bottom-4 flex gap-2"
      >
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setErr("");
          }}
          placeholder="Ask about any deal, client or follow-up…"
          className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm"
        />
        <button disabled={busy} className="rounded-lg bg-indigo-600 px-4 text-sm font-medium text-white disabled:opacity-50">Ask</button>
      </form>
      {err && <div className="text-[13px] text-rose-600">{err}</div>}
    </div>
  );
}
