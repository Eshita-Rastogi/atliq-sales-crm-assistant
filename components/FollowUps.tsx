"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { inView, useAppState } from "./AppState";
import { FollowUpRow } from "./FollowUpRow";
import type { RadarItem, SignalType, Stage } from "@/lib/types";
import { money } from "@/lib/format";

const TODAY = "2026-07-10";
const WEEK_END = "2026-07-17";

const TYPES: { key: string; label: string; types: SignalType[] }[] = [
  { key: "all", label: "All types", types: [] },
  { key: "follow", label: "Follow-ups & promises", types: ["client_ask", "atliq_promise", "meeting_action"] },
  { key: "deadline", label: "Client deadlines", types: ["client_deadline"] },
  { key: "growth", label: "Growth & referrals", types: ["cross_sell", "referral", "new_lead"] },
  { key: "revisit", label: "Revisits", types: ["revisit"] },
];

const BUCKETS = [
  { key: "overdue", label: "Overdue", tone: "text-rose-600", test: (r: RadarItem) => r.days_overdue > 0 },
  { key: "today", label: "Due today", tone: "text-amber-600", test: (r: RadarItem) => r.days_overdue === 0 && r.due_date === TODAY },
  { key: "week", label: "This week", tone: "text-amber-600", test: (r: RadarItem) => r.days_overdue === 0 && !!r.due_date && r.due_date > TODAY && r.due_date <= WEEK_END },
  { key: "later", label: "Later", tone: "text-slate-600", test: (r: RadarItem) => r.days_overdue === 0 && (!r.due_date || r.due_date > WEEK_END) },
];

export function FollowUps({ items: baseItems, nextSteps, values, stages }: { items: RadarItem[]; nextSteps: Record<string, string>; values: Record<string, number | null>; stages: Record<string, Stage> }) {
  let items = baseItems;
  const params = useSearchParams();
  const when = params.get("when");
  const { owner, done, snoozed, customItems } = useAppState();
  items = [...customItems, ...items];
  const [group, setGroup] = useState<"time" | "lead">("time");
  const [sort, setSort] = useState<"priority" | "due">("priority");
  const [type, setType] = useState("all");
  const [showClosed, setShowClosed] = useState(false);

  const t = TYPES.find((x) => x.key === type)!;
  const scoped = items.filter((r) => inView(owner, r.owner) && (!t.types.length || t.types.includes(r.type)));
  const visible = scoped.filter((r) => showClosed || (!done[r.signal_id] && !snoozed[r.signal_id]));
  const sorter = sort === "priority" ? (a: RadarItem, b: RadarItem) => b.score - a.score : (a: RadarItem, b: RadarItem) => (a.due_date || "9999").localeCompare(b.due_date || "9999");
  const buckets = BUCKETS.filter((b) => !when || b.key === when || (when === "week" && b.key === "today"));

  const byLead = Object.values(
    visible.reduce<Record<string, RadarItem[]>>((m, r) => ((m[r.account_id] ||= []).push(r), m), {}),
  ).sort((a, b) => (sort === "priority" ? Math.max(...b.map((x) => x.score)) - Math.max(...a.map((x) => x.score)) : (a.map((x) => x.due_date || "9999").sort()[0]).localeCompare(b.map((x) => x.due_date || "9999").sort()[0])));

  const seg = (on: boolean) => `rounded-md px-3 py-1.5 ${on ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100"}`;

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Follow-ups</h1>
        <p className="text-sm text-slate-500">Every client ask, promise, deadline and revisit found in emails and meeting notes. Tick to mark done; click a row to see the source and draft a reply.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg border border-slate-300 bg-white p-0.5 text-xs">
          <button className={seg(group === "time")} onClick={() => setGroup("time")}>By time</button>
          <button className={seg(group === "lead")} onClick={() => setGroup("lead")}>By lead</button>
        </div>
        <label className="flex items-center gap-1.5 text-xs text-slate-600">
          Sort
          <select value={sort} onChange={(e) => setSort(e.target.value as "priority" | "due")} className="rounded-md border border-slate-300 bg-white px-2 py-1">
            <option value="priority">Priority (deadline, value, waiting)</option>
            <option value="due">Due date</option>
          </select>
        </label>
        <select value={type} onChange={(e) => setType(e.target.value)} className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs">
          {TYPES.map((x) => <option key={x.key} value={x.key}>{x.label}</option>)}
        </select>
        <label className="ml-auto flex items-center gap-1 text-xs text-slate-500">
          <input type="checkbox" checked={showClosed} onChange={(e) => setShowClosed(e.target.checked)} /> Show done / snoozed
        </label>
      </div>

      {when && group === "time" && (
        <div className="flex items-center gap-2 text-xs text-slate-600">
          Showing <b>{when === "overdue" ? "overdue" : "due this week"}</b> only
          <Link href="/follow-ups" className="rounded-full border border-slate-300 px-2 py-0.5 hover:bg-slate-100">Show all ×</Link>
        </div>
      )}

      {group === "time" ? (
        buckets.map((b) => {
          const rows = visible.filter(b.test).sort(sorter);
          if (!rows.length && when) return <div key={b.key} className="card p-6 text-center text-sm text-slate-500">Nothing {b.label.toLowerCase()}.</div>;
          if (!rows.length) return null;
          return (
            <section key={b.key}>
              <h2 className={`mb-2 text-sm font-semibold ${b.tone}`}>{b.label} <span className="font-normal text-slate-400">({rows.length})</span></h2>
              <div className="card divide-y divide-slate-100">
                {rows.map((r) => <FollowUpRow key={r.signal_id} r={r} nextStep={nextSteps[r.account_id]} stage={stages[r.account_id]} />)}
              </div>
            </section>
          );
        })
      ) : (
        <div className="space-y-4">
          {byLead.map((rows) => {
            const r0 = rows[0];
            const od = rows.filter((r) => r.days_overdue > 0).length;
            return (
              <section key={r0.account_id} className="card overflow-hidden">
                <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50 px-4 py-2.5">
                  <Link href={`/leads/${encodeURIComponent(r0.account_id)}`} className="font-semibold text-slate-900 hover:text-indigo-700">{r0.company}</Link>
                  <span className="text-xs text-slate-500">{money(values[r0.account_id] ?? null)}</span>
                  {od > 0 && <span className="text-xs font-medium text-rose-600">{od} overdue</span>}
                  <span className="ml-auto text-xs text-slate-400">{rows.length} item{rows.length > 1 ? "s" : ""}</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {[...rows].sort(sorter).map((r) => <FollowUpRow key={r.signal_id} r={r} nextStep={nextSteps[r.account_id]} showCompany={false} stage={stages[r.account_id]} />)}
                </div>
              </section>
            );
          })}
        </div>
      )}
      {visible.length === 0 && <div className="card p-6 text-center text-sm text-slate-500">No follow-ups in this view.</div>}
    </div>
  );
}
