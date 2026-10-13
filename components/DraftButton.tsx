"use client";

import { useState } from "react";

interface Draft {
  subject: string;
  body: string;
  tbd: string[];
  unverified?: string[];
}

// Generates a follow-up draft. The assistant has no send capability — the seller copies it.
export function DraftButton({ signalId, label = "Draft reply" }: { signalId: string; label?: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  async function run() {
    setOpen(true);
    if (draft) return;
    setLoading(true);
    setError("");
    try {
      const r = await fetch("/api/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signalId }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Draft failed");
      setDraft(j);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Draft failed");
    } finally {
      setLoading(false);
    }
  }

  const highlighted = (draft?.body || "").split(/(\[TBD[^\]]*\])/g);

  return (
    <>
      <button onClick={run} className="btn">✎ {label}</button>
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-xl card p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">AI draft — review before sending</h3>
              <button className="text-slate-400 hover:text-slate-700" onClick={() => setOpen(false)}>✕</button>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Built only from facts in the thread. Anything missing is marked <span className="rounded bg-amber-100 px-1 text-amber-800">[TBD]</span>. The assistant cannot send email — copy it into your own mail.
            </p>
            {loading && <div className="mt-4 animate-pulse text-sm text-slate-500">Drafting…</div>}
            {error && <div className="mt-4 rounded bg-rose-50 p-2 text-sm text-rose-700">{error}</div>}
            {draft && (
              <div className="mt-4 space-y-3">
                <div className="text-sm"><span className="text-slate-500">Subject: </span>{draft.subject}</div>
                <div className="whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm leading-relaxed">
                  {highlighted.map((p, i) =>
                    p.startsWith("[TBD") ? <mark key={i} className="rounded bg-amber-100 px-0.5 text-amber-800">{p}</mark> : <span key={i}>{p}</span>,
                  )}
                </div>
                {draft.unverified && draft.unverified.length > 0 && (
                  <div className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs text-amber-800">
                    ⚠ Not found in the thread — check before sending: {draft.unverified.join(", ")}
                  </div>
                )}
                <div className="flex justify-end gap-2">
                  <button
                    className="btn-primary"
                    onClick={() => {
                      navigator.clipboard.writeText(`Subject: ${draft.subject}\n\n${draft.body}`);
                      setCopied(true);
                    }}
                  >
                    {copied ? "Copied ✓" : "Copy to my email"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
