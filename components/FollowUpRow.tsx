"use client";

import Link from "next/link";
import { useState } from "react";
import { useAppState } from "./AppState";
import { DraftButton } from "./DraftButton";
import type { RadarItem } from "@/lib/types";
import { OWNER_COLOR, TYPE_LABEL, TYPE_STYLE, fmtDate, initials } from "@/lib/format";

// Compact follow-up row: one line by default, click to see the evidence and act.
export function FollowUpRow({ r, nextStep, showCompany = true }: { r: RadarItem; nextStep?: string; showCompany?: boolean }) {
  const { done, snoozed, markDone, snooze, undo } = useAppState();
  const [open, setOpen] = useState(false);
  const closed = done[r.signal_id] || snoozed[r.signal_id];

  return (
    <div className={`${closed ? "opacity-60" : ""}`}>
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          onClick={() => (closed ? undo(r.signal_id) : markDone(r.signal_id))}
          title={closed ? "Reopen" : "Mark done"}
          className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border text-[11px] ${
            done[r.signal_id] ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 text-transparent hover:border-emerald-500 hover:text-emerald-500"
          }`}
        >
          ✓
        </button>
        <button onClick={() => setOpen(!open)} className="min-w-0 flex-1 text-left">
          <div className={`truncate text-sm ${done[r.signal_id] ? "text-slate-500 line-through" : "text-slate-900"}`}>{r.title}</div>
          <div className="flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
            {showCompany && <span className="font-medium text-slate-700">{r.company}</span>}
            <span className={`rounded px-1 ${TYPE_STYLE[r.type]}`}>{TYPE_LABEL[r.type]}</span>
            {snoozed[r.signal_id] && <span>· snoozed</span>}
          </div>
        </button>
        <div className="shrink-0 text-right text-xs">
          {r.days_overdue > 0 ? (
            <span className="font-medium text-rose-600">Overdue {r.days_overdue}d</span>
          ) : r.due_date ? (
            <span className="font-medium text-amber-600">Due {fmtDate(r.due_date)}</span>
          ) : (
            <span className="text-slate-400">No date</span>
          )}
        </div>
        <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10px] font-semibold text-white ${OWNER_COLOR[r.owner] || "bg-slate-400"}`} title={r.owner}>
          {r.owner === "Unassigned" ? "?" : initials(r.owner)}
        </span>
        <button onClick={() => setOpen(!open)} className="text-slate-400 hover:text-slate-700" aria-label="Details">
          {open ? "▴" : "▾"}
        </button>
      </div>
      {open && (
        <div className="space-y-2 border-t border-slate-100 bg-slate-50/60 px-4 py-3 pl-12">
          <blockquote className="quote">
            “{r.quote}” —{" "}
            <Link className="not-italic text-indigo-600 hover:underline" href={`/docs/${encodeURIComponent(r.doc_id)}`}>source</Link>
          </blockquote>
          {nextStep && (
            <div className="text-xs text-slate-700">
              <span className="font-medium text-indigo-700">✦ Suggested next step:</span> {nextStep}
            </div>
          )}
          <div className="text-[11px] text-slate-500">
            Priority because: {r.reason}
            {r.needs_review && <span className="ml-2 rounded bg-slate-200 px-1 text-slate-700">date unclear — please check</span>}
          </div>
          <div className="flex flex-wrap gap-1.5 pt-1">
            <DraftButton signalId={r.signal_id} />
            {!closed && <button className="btn" onClick={() => snooze(r.signal_id)}>Snooze</button>}
            {!closed && <button className="btn-primary" onClick={() => markDone(r.signal_id)}>Mark done ✓</button>}
            {showCompany && (
              <Link href={`/leads/${encodeURIComponent(r.account_id)}`} className="btn">Open lead →</Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
