"use client";

import { useState } from "react";
import { useAppState } from "./AppState";
import { ACTIONS, suggestStage } from "@/lib/stage";
import { STAGES, type Stage } from "@/lib/types";

const TODAY = "2026-07-10";

// "Done — what did you do?": records the action and date, and moves the lead to the right stage.
export function CompleteDialog({
  item,
  stage,
  onClose,
}: {
  item: { signal_id: string; account_id: string; title: string; company: string };
  stage: Stage;
  onClose: () => void;
}) {
  const { completeFollowUp } = useAppState();
  const [action, setAction] = useState(ACTIONS[0].label);
  const [date, setDate] = useState(TODAY);
  const [note, setNote] = useState("");
  const [to, setTo] = useState<Stage>(suggestStage(ACTIONS[0].label, stage));
  const input = "w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm";

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md card p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="text-xs text-slate-500">{item.company}</div>
        <h3 className="text-lg font-semibold text-slate-900">Mark done: {item.title}</h3>
        <div className="mt-4 space-y-3">
          <label className="block text-xs text-slate-600">
            What did you do?
            <select
              className={input}
              value={action}
              onChange={(e) => {
                setAction(e.target.value);
                setTo(suggestStage(e.target.value, stage));
              }}
            >
              {ACTIONS.map((a) => <option key={a.label}>{a.label}</option>)}
            </select>
          </label>
          <label className="block text-xs text-slate-600">
            When?
            <input type="date" className={input} value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <label className="block text-xs text-slate-600">
            Note (optional)
            <input className={input} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Sent SOW v2 to Elena, she'll confirm by Friday" />
          </label>
          <label className="block text-xs text-slate-600">
            Lead stage
            <select className={input} value={to} onChange={(e) => setTo(e.target.value as Stage)}>
              {STAGES.map((s) => <option key={s} value={s}>{s === stage ? `${s} (no change)` : s}</option>)}
            </select>
            {to !== stage && <span className="mt-1 block text-indigo-700">Suggested move: {stage} → {to}</span>}
          </label>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button
            className="btn-primary"
            onClick={() => {
              completeFollowUp(item, { action, date, note, stage: to !== stage ? to : undefined });
              onClose();
            }}
          >
            Save
          </button>
        </div>
        <p className="mt-3 text-[11px] text-slate-400">Logged on the lead&apos;s activity with your name and date. The lead&apos;s last-contact date is updated.</p>
      </div>
    </div>
  );
}
