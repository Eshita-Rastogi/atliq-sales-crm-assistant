"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { inView, useAppState } from "./AppState";
import { LeadTable, type LeadRow } from "./LeadTable";
import { PipelineBoard } from "./PipelineBoard";
import { money } from "@/lib/format";

const FILTERS = [
  { key: "all", label: "All", test: () => true },
  { key: "active", label: "Active deals", test: (r: LeadRow) => !["Won", "Lost"].includes(r.ai_stage) },
  { key: "overdue", label: "Has overdue follow-ups", test: (r: LeadRow) => r.overdue > 0 },
  { key: "untracked", label: "New / untracked", test: (r: LeadRow) => !r.in_crm || r.ai_stage === "New" },
  { key: "unassigned", label: "No owner", test: (r: LeadRow) => !r.owner },
  { key: "stale", label: "No contact in 14+ days", test: (r: LeadRow) => !["Won", "Lost"].includes(r.ai_stage) && (r.days == null || r.days >= 14) },
  { key: "dupes", label: "Possible duplicates", test: (r: LeadRow) => r.duplicate },
];

export function LeadsView({ rows }: { rows: LeadRow[] }) {
  const params = useSearchParams();
  const router = useRouter();
  const { owner } = useAppState();
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
        <div className="flex rounded-lg border border-slate-300 bg-white p-0.5 text-xs">
          <button className={seg(view === "board")} onClick={() => set("view", "board")}>▦ Stage board</button>
          <button className={seg(view === "list")} onClick={() => set("view", "list")}>☰ List</button>
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

      {view === "board" ? <PipelineBoard rows={shown} /> : <LeadTable rows={shown} />}
    </div>
  );
}
