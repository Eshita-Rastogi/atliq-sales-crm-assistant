"use client";

import { useAppState } from "./AppState";
import { FollowUpRow } from "./FollowUpRow";
import type { Stage } from "@/lib/types";
import { fmtDate } from "@/lib/format";

/** Follow-ups created in the app (logged meetings) for this lead. */
export function LiveFollowUps({ accountId, stage }: { accountId: string; stage: Stage }) {
  const { customItems } = useAppState();
  const items = customItems.filter((i) => i.account_id === accountId);
  if (!items.length) return null;
  return (
    <>
      {items.map((r) => <FollowUpRow key={r.signal_id} r={r} showCompany={false} stage={stage} />)}
    </>
  );
}

/** Meeting notes logged in the app, newest first, shown at the top of the Activity timeline. */
export function LiveMeetings({ accountId }: { accountId: string }) {
  const { meetings } = useAppState();
  const mine = meetings.filter((m) => m.account_id === accountId);
  if (!mine.length) return null;
  return (
    <>
      {mine.map((m) => (
        <div key={m.id} className="relative pl-6">
          <span className="absolute left-0 top-1.5 grid h-4 w-4 place-items-center rounded-full bg-emerald-500 text-[9px] text-white">M</span>
          <div className="card border-emerald-200 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-slate-500">{fmtDate(m.date)}</span>
              <span className="chip border-transparent bg-emerald-50 text-emerald-700">Meeting MOM · logged by {m.by}</span>
              <span className="text-sm font-medium text-slate-900">{m.title}</span>
            </div>
            <p className="mt-1.5 text-sm text-slate-700">{m.summary}</p>
            {m.highlights.length > 0 && (
              <ul className="mt-1.5 flex flex-wrap gap-1.5">{m.highlights.map((h) => <li key={h} className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{h}</li>)}</ul>
            )}
            <details className="mt-2 text-xs">
              <summary className="cursor-pointer text-indigo-600">Show original notes</summary>
              <p className="mt-1 whitespace-pre-wrap rounded bg-slate-50 p-2 text-slate-700">{m.notes}</p>
            </details>
          </div>
        </div>
      ))}
    </>
  );
}
