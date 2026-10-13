"use client";

import Link from "next/link";
import type { LeadRow } from "./LeadTable";
import { STAGES } from "@/lib/types";
import { OWNER_COLOR, STAGE_BAR, fmtDate, initials, money } from "@/lib/format";

// Clean stage board: one card per deal with just what you need to decide where to look.
export function PipelineBoard({ rows }: { rows: LeadRow[] }) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-3">
      {STAGES.map((s) => {
        const col = rows.filter((c) => c.ai_stage === s).sort((a, b) => (b.value || 0) - (a.value || 0));
        const total = col.reduce((t, c) => t + (c.value || 0), 0);
        return (
          <div key={s} className="w-60 shrink-0">
            <div className="mb-2 px-1">
              <div className={`mb-2 h-1 rounded ${STAGE_BAR[s]}`} />
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-semibold text-slate-800">{s}</span>
                <span className="text-xs text-slate-500">{col.length} · {money(total)}</span>
              </div>
            </div>
            <div className="space-y-2">
              {col.map((c) => (
                <Link key={c.id} href={c.href || `/leads/${encodeURIComponent(c.id)}`} className="card block p-3 transition hover:border-indigo-300 hover:shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-sm font-medium leading-snug text-slate-900">{c.company}</div>
                    <span
                      title={c.owner || "No owner"}
                      className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10px] font-semibold text-white ${c.owner ? OWNER_COLOR[c.owner] || "bg-slate-400" : "bg-rose-400"}`}
                    >
                      {c.owner ? initials(c.owner) : "?"}
                    </span>
                  </div>
                  <div className="mt-1 text-xs font-semibold text-slate-700">{money(c.value)}</div>
                  <div className="mt-2 text-xs">
                    {c.overdue > 0 ? (
                      <span className="font-medium text-rose-600">● {c.overdue} follow-up{c.overdue > 1 ? "s" : ""} overdue</span>
                    ) : c.next_due ? (
                      <span className="text-amber-700">● Next: {fmtDate(c.next_due)}</span>
                    ) : (
                      <span className="text-slate-400">No open follow-ups</span>
                    )}
                  </div>
                  {c.added && <div className="mt-1.5 text-[11px] font-medium text-emerald-700">Added in app</div>}
                  {!c.in_crm && <div className="mt-1.5 text-[11px] font-medium text-amber-700">Not in CRM yet</div>}
                </Link>
              ))}
              {col.length === 0 && <div className="rounded-lg border border-dashed border-slate-200 p-3 text-center text-xs text-slate-400">No deals</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
