"use client";

import Link from "next/link";
import { useState } from "react";
import { useAppState } from "./AppState";
import { DraftButton } from "./DraftButton";
import type { RadarItem, SignalType } from "@/lib/types";
import { OWNER_COLOR, TYPE_LABEL, TYPE_STYLE, fmtDate, initials } from "@/lib/format";

const FILTERS: { key: string; label: string; types: SignalType[] }[] = [
  { key: "all", label: "All", types: [] },
  { key: "follow", label: "Follow-ups", types: ["client_ask", "atliq_promise", "meeting_action"] },
  { key: "deadline", label: "Client deadlines", types: ["client_deadline"] },
  { key: "growth", label: "Growth & referrals", types: ["cross_sell", "referral", "new_lead"] },
  { key: "revisit", label: "Revisits", types: ["revisit"] },
];

export function TodayList({ items, nextActions }: { items: RadarItem[]; nextActions: Record<string, string> }) {
  const { owner, done, snoozed, markDone, snooze, undo } = useAppState();
  const [filter, setFilter] = useState("all");
  const [showClosed, setShowClosed] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const f = FILTERS.find((x) => x.key === filter)!;
  const scoped = items.filter((r) => (owner === "All" || r.owner === owner) && (!f.types.length || f.types.includes(r.type)));
  const active = scoped.filter((r) => !done[r.signal_id] && !snoozed[r.signal_id]);
  const closed = scoped.filter((r) => done[r.signal_id] || snoozed[r.signal_id]);
  const overdue = active.filter((r) => r.days_overdue > 0).length;
  const week = active.filter((r) => r.days_overdue === 0 && r.due_date && r.due_date <= "2026-07-17").length;
  const review = active.filter((r) => r.needs_review).length;
  const firstOpen = new Set<string>();
  const lead = active.filter((r) => {
    if (firstOpen.has(r.account_id)) return false;
    firstOpen.add(r.account_id);
    return true;
  });
  const more = (id: string) => active.filter((r) => r.account_id === id).length - 1;
  const shown = showClosed ? closed : showAll ? active : lead;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Today — what needs you</h1>
        <p className="text-sm text-slate-500">
          Every client ask, promise, deadline and growth signal found in emails and notes, ranked by urgency, value and time waiting. Ranking is calculated by rules, not AI — the reason is always shown.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3 max-w-xl">
        <Stat label="Overdue" value={overdue} tone="rose" />
        <Stat label="Due in next 7 days" value={week} tone="amber" />
        <Stat label="Needs a human check" value={review} tone="slate" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((x) => (
          <button key={x.key} onClick={() => setFilter(x.key)} className={`rounded-full border px-3 py-1 text-xs ${filter === x.key ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-300 bg-white text-slate-600"}`}>
            {x.label}
          </button>
        ))}
        {!showClosed && (
          <label className="ml-auto flex items-center gap-1 text-xs text-slate-600">
            <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} />
            Show every item ({active.length}) instead of top item per account ({lead.length})
          </label>
        )}
        <button onClick={() => setShowClosed(!showClosed)} className="text-xs text-slate-500 underline">
          {showClosed ? "← Back to open items" : `Done / snoozed (${closed.length})`}
        </button>
      </div>

      <ol className="space-y-2">
        {shown.map((r, i) => (
          <li key={r.signal_id} className={`card p-4 ${r.days_overdue > 0 ? "border-l-4 border-l-rose-400" : ""}`}>
            <div className="flex flex-wrap items-start gap-3">
              <div className="w-6 pt-0.5 text-sm font-semibold text-slate-400">{i + 1}</div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/accounts/${encodeURIComponent(r.account_id)}`} className="font-semibold text-slate-900 hover:text-indigo-700">
                    {r.company}
                  </Link>
                  <span className={`chip border-transparent ${TYPE_STYLE[r.type]}`}>{TYPE_LABEL[r.type]}</span>
                  {r.days_overdue > 0 ? (
                    <span className="chip border-rose-200 bg-rose-50 text-rose-700">Overdue {r.days_overdue}d</span>
                  ) : r.due_date ? (
                    <span className="chip border-amber-200 bg-amber-50 text-amber-700">Due {fmtDate(r.due_date)}</span>
                  ) : null}
                  {r.needs_review && <span className="chip border-slate-300 bg-slate-50 text-slate-600" title="Date or value was ambiguous">Check date</span>}
                </div>
                <div className="mt-1 text-sm text-slate-800">{r.title}</div>
                <blockquote className="quote mt-2">
                  “{r.quote}” —{" "}
                  <Link className="not-italic text-indigo-600 hover:underline" href={`/docs/${encodeURIComponent(r.doc_id)}`}>
                    {r.doc_id}
                  </Link>
                </blockquote>
                {nextActions[r.account_id] && (
                  <div className="mt-2 text-xs text-slate-600">
                    <span className="font-medium text-indigo-700">✦ Next best step:</span> {nextActions[r.account_id]}
                  </div>
                )}
                <div className="mt-2 text-[11px] text-slate-500">
                  Why it ranks here: {r.reason}
                  {!showAll && !showClosed && more(r.account_id) > 0 && (
                    <Link href={`/accounts/${encodeURIComponent(r.account_id)}`} className="ml-2 text-indigo-600 hover:underline">
                      +{more(r.account_id)} more for this account
                    </Link>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className={`grid h-7 w-7 place-items-center rounded-full text-[10px] font-semibold text-white ${OWNER_COLOR[r.owner] || "bg-slate-400"}`} title={r.owner}>
                  {r.owner === "Unassigned" ? "?" : initials(r.owner)}
                </span>
                {showClosed ? (
                  <button className="btn" onClick={() => undo(r.signal_id)}>Reopen</button>
                ) : (
                  <div className="flex flex-wrap justify-end gap-1">
                    <DraftButton signalId={r.signal_id} />
                    <button className="btn" onClick={() => snooze(r.signal_id)}>Snooze</button>
                    <button className="btn-primary" onClick={() => markDone(r.signal_id)}>Done ✓</button>
                  </div>
                )}
              </div>
            </div>
          </li>
        ))}
        {shown.length === 0 && <li className="card p-6 text-center text-sm text-slate-500">Nothing here — you&apos;re on top of it.</li>}
      </ol>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: "rose" | "amber" | "slate" }) {
  const c = { rose: "text-rose-600", amber: "text-amber-600", slate: "text-slate-700" }[tone];
  return (
    <div className="card px-4 py-3">
      <div className={`text-2xl font-semibold ${c}`}>{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}
