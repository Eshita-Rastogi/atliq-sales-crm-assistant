"use client";

import Link from "next/link";
import { useState } from "react";
import { useAppState } from "./AppState";
import { CompleteDialog } from "./CompleteDialog";
import { DraftButton } from "./DraftButton";
import type { RadarItem, Stage } from "@/lib/types";
import { OWNER_COLOR, TYPE_LABEL, TYPE_STYLE, fmtDate, initials } from "@/lib/format";

const LATER = [
  { label: "Tomorrow (11 Jul)", date: "2026-07-11" },
  { label: "In 3 days (13 Jul)", date: "2026-07-13" },
  { label: "Next week (17 Jul)", date: "2026-07-17" },
];

// Compact follow-up row: one line by default, click to see the evidence and act.
export function FollowUpRow({ r, nextStep, showCompany = true, stage = "Contacted" }: { r: RadarItem; nextStep?: string; showCompany?: boolean; stage?: Stage }) {
  const { done, snoozed, snooze, undo, outcomes, remindAt, setRemind, leadEdits } = useAppState();
  const [open, setOpen] = useState(false);
  const [completing, setCompleting] = useState(false);
  const isDone = !!done[r.signal_id];
  const closed = isDone || !!snoozed[r.signal_id];
  const outcome = outcomes[r.signal_id];
  const curStage = leadEdits[r.account_id]?.stage || stage;

  return (
    <div className={closed ? "opacity-70" : ""}>
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          onClick={() => (isDone ? undo(r.signal_id) : setCompleting(true))}
          title={isDone ? "Reopen" : "Mark done"}
          className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border text-[11px] ${
            isDone ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 text-transparent hover:border-emerald-500 hover:text-emerald-500"
          }`}
        >
          ✓
        </button>
        <button onClick={() => setOpen(!open)} className="min-w-0 flex-1 text-left">
          <div className={`truncate text-sm ${isDone ? "text-slate-500 line-through" : "text-slate-900"}`}>{r.title}</div>
          <div className="flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
            {showCompany && <span className="font-medium text-slate-700">{r.company}</span>}
            <span className={`rounded px-1 ${TYPE_STYLE[r.type]}`}>{TYPE_LABEL[r.type]}</span>
            {outcome && <span className="text-emerald-700">· {outcome.action} on {fmtDate(outcome.date)}</span>}
            {snoozed[r.signal_id] && !isDone && <span className="text-slate-600">· 😴 snoozed until {fmtDate(snoozed[r.signal_id].slice(0, 10))}</span>}
            {remindAt[r.signal_id] && !isDone && <span className="text-indigo-600">· ⏰ reminder {fmtDate(remindAt[r.signal_id])}</span>}
          </div>
        </button>
        <div className="shrink-0 text-right text-xs">
          {isDone ? (
            <span className="font-medium text-emerald-600">Done</span>
          ) : r.days_overdue > 0 ? (
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
            “{r.quote}”
            {r.doc_id && (
              <>
                {" "}—{" "}
                <Link className="not-italic text-indigo-600 hover:underline" href={`/docs/${encodeURIComponent(r.doc_id)}`}>source</Link>
              </>
            )}
          </blockquote>
          {outcome?.note && <div className="text-xs text-emerald-800">Note: {outcome.note}</div>}
          {nextStep && !isDone && (
            <div className="text-xs text-slate-700">
              <span className="font-medium text-indigo-700">✦ Suggested next step:</span> {nextStep}
            </div>
          )}
          <div className="text-[11px] text-slate-500">
            Priority because: {r.reason}
            {r.needs_review && <span className="ml-2 rounded bg-slate-200 px-1 text-slate-700">date unclear — please check</span>}
          </div>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {!isDone && <button className="btn-primary" onClick={() => setCompleting(true)}>Mark done ✓</button>}
            {r.doc_id && !isDone && <DraftButton signalId={r.signal_id} />}
            {!closed && (
              <select className="btn" value="" onChange={(e) => e.target.value && snooze(r.signal_id, e.target.value)} aria-label="Snooze">
                <option value="">😴 Snooze until…</option>
                {LATER.map((l) => <option key={l.date} value={l.date}>{l.label}</option>)}
              </select>
            )}
            {!isDone && (
              <select className="btn" value="" onChange={(e) => e.target.value && setRemind(r.signal_id, e.target.value)} aria-label="Remind me">
                <option value="">⏰ Remind me…</option>
                {LATER.map((l) => <option key={l.date} value={l.date}>{l.label}</option>)}
              </select>
            )}
            {closed && <button className="btn" onClick={() => undo(r.signal_id)}>Reopen</button>}
            {showCompany && (
              <Link href={r.account_id.startsWith("added-") ? `/leads/added?id=${r.account_id}` : `/leads/${encodeURIComponent(r.account_id)}`} className="btn">Open lead →</Link>
            )}
          </div>
          <p className="text-[10px] text-slate-400">Snooze hides it until the date · Remind me keeps it on your list and pings you on the date.</p>
        </div>
      )}
      {completing && <CompleteDialog item={r} stage={curStage} onClose={() => setCompleting(false)} />}
    </div>
  );
}
