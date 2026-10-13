"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { inView, useAppState } from "./AppState";
import { LeadTable, type LeadRow } from "./LeadTable";
import { PipelineBoard } from "./PipelineBoard";
import { money } from "@/lib/format";
import { completeness } from "@/lib/stage";
import type { Stage } from "@/lib/types";

export interface LiveItem {
  signal_id: string;
  account_id: string;
  days_overdue: number;
  due_date: string | null;
  title: string;
}

const FILTERS = [
  { key: "all", label: "All", test: () => true },
  { key: "active", label: "Active deals", test: (r: LeadRow) => !["Won", "Lost"].includes(r.ai_stage) },
  { key: "overdue", label: "Has overdue follow-ups", test: (r: LeadRow) => r.overdue > 0 },
  { key: "untracked", label: "New / untracked", test: (r: LeadRow) => !r.in_crm || r.ai_stage === "New" || !!r.added },
  { key: "unassigned", label: "No owner", test: (r: LeadRow) => !r.owner },
  { key: "stale", label: "No contact in 14+ days", test: (r: LeadRow) => !["Won", "Lost"].includes(r.ai_stage) && (r.days == null || r.days >= 14) },
  { key: "dupes", label: "Possible duplicates", test: (r: LeadRow) => r.duplicate },
  { key: "incomplete", label: "Incomplete profiles", test: (r: LeadRow) => (r.profile ?? 100) < 70 },
];

export function LeadsView({ rows: baseRows, items: baseItems }: { rows: LeadRow[]; items: LiveItem[] }) {
  let items = baseItems;
  let rows = baseRows;
  const params = useSearchParams();
  const router = useRouter();
  const { owner, customLeads, customItems, merges, done, snoozed, leadEdits } = useAppState();
  items = [...items, ...customItems];
  const dropped = new Set(merges.map((m) => m.drop));
  const added: LeadRow[] = customLeads.map((c) => {
    const items = customItems.filter((i) => i.account_id === c.id && i.due_date).sort((a, b) => a.due_date!.localeCompare(b.due_date!));
    return {
      id: c.id, company: c.company, in_crm: true, source: c.source || "—", owner: c.owner, service: c.service,
      crm_stage: "New", ai_stage: "New", value: c.value, last_touch: c.created_at.slice(0, 10), days: 0,
      open: items.length, overdue: 0, next_due: items[0]?.due_date ?? null, next_title: items[0]?.title ?? "",
      duplicate: false, href: `/leads/added?id=${c.id}`, added: true,
    };
  });
  // Apply what the team did in the app: completed follow-ups, stage moves and edited details.
  rows = [...added, ...rows.filter((r) => !dropped.has(r.id))].map((r) => {
    if (r.added) return r;
    const e = leadEdits[r.id];
    const open = items.filter((i) => i.account_id === r.id && !done[i.signal_id] && !snoozed[i.signal_id]).sort((a, b) => (a.due_date || "9999").localeCompare(b.due_date || "9999"));
    const fields = { ...(r.fields || {}), ...(e?.fields || {}) };
    return {
      ...r,
      ai_stage: (e?.stage as Stage) || r.ai_stage,
      owner: fields.owner ?? r.owner,
      value: fields.est_value_usd ? Number(fields.est_value_usd) : r.value,
      open: open.length,
      overdue: open.filter((i) => i.days_overdue > 0).length,
      next_due: open[0]?.due_date ?? null,
      next_title: open[0]?.title ?? "",
      days: e?.last_contact ? 0 : r.days,
      fields,
      profile: completeness(fields).pct,
    };
  });
  const view = params.get("view") === "list" ? "list" : "board";
  const filter = FILTERS.find((f) => f.key === params.get("filter")) || FILTERS[0];
  // Untracked and unassigned leads have no owner yet — always show them so someone picks them up.
  const scoped = rows.filter((r) => inView(owner, r.owner) || ((filter.key === "untracked" || filter.key === "unassigned") && !r.owner));
  const shown = scoped.filter(filter.test);
  const set = (k: string, v: string) => {
    const p = new URLSearchParams(params.toString());
    p.set(k, v);
    router.replace(`/leads?${p.toString()}`, { scroll: false });
  };
  const seg = (on: boolean) => `rounded-md px-3 py-1.5 ${on ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100"}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Leads &amp; deals</h1>
          <p className="text-sm text-slate-500">
            {shown.length} leads · {money(shown.filter((r) => !["Won", "Lost"].includes(r.ai_stage)).reduce((t, r) => t + (r.value || 0), 0))} in open deals.
            Stages are the real stage from emails and meetings — click any lead for the full story.
          </p>
        </div>
        <div className="flex items-center gap-2">
        <Link href="/leads/new" className="btn-primary px-3 py-1.5 text-sm">+ New lead</Link>
        <div className="flex rounded-lg border border-slate-300 bg-white p-0.5 text-xs">
          <button className={seg(view === "board")} onClick={() => set("view", "board")}>▦ Stage board</button>
          <button className={seg(view === "list")} onClick={() => set("view", "list")}>☰ List</button>
        </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => set("filter", f.key)}
            className={`rounded-full border px-3 py-1 text-xs ${filter.key === f.key ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"}`}
          >
            {f.label} <span className="opacity-70">({scoped.filter(f.test).length})</span>
          </button>
        ))}
      </div>

      {filter.key === "dupes" && (
        <div className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-xs text-orange-800">
          Duplicates are never merged automatically. <Link href="/leads/merge" className="font-medium underline">Review &amp; merge pairs →</Link>
        </div>
      )}
      {view === "board" ? <PipelineBoard rows={shown} /> : <LeadTable rows={shown} />}
    </div>
  );
}
