"use client";

import { useAppState } from "./AppState";

// HAX G15 — granular feedback on any AI output. Votes feed the AI quality log.
export function Rate({ id, kind, dark = false }: { id: string; kind: string; dark?: boolean }) {
  const { feedback, rate } = useAppState();
  const v = feedback[id]?.vote;
  const base = dark ? "text-white/70 hover:text-white" : "text-slate-400 hover:text-slate-700";
  return (
    <span className="inline-flex items-center gap-1 text-xs" title="Was this AI suggestion useful?">
      <button aria-label="Helpful" onClick={() => rate(id, kind, "up")} className={v === "up" ? (dark ? "text-white" : "text-emerald-600") : base}>👍</button>
      <button aria-label="Not helpful" onClick={() => rate(id, kind, "down")} className={v === "down" ? (dark ? "text-white" : "text-rose-600") : base}>👎</button>
      {v && <span className={dark ? "text-white/80" : "text-slate-500"}>thanks</span>}
    </span>
  );
}
