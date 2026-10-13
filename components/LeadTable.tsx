"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useAppState } from "./AppState";
import type { Stage } from "@/lib/types";
import { STAGE_STYLE, fmtDate, money } from "@/lib/format";

export interface LeadRow {
  id: string;
  company: string;
  in_crm: boolean;
  source: string;
  owner: string;
  service: string;
  crm_stage: Stage | "Blank";
  ai_stage: Stage;
  value: number | null;
  last_touch: string | null;
  days: number | null;
  open: number;
  overdue: number;
  next_due: string | null;
  next_title: string;
  duplicate: boolean;
}

const TABS = [
  { key: "all", label: "All leads" },
  { key: "active", label: "Active deals" },
  { key: "missing", label: "Not in CRM" },
  { key: "unassigned", label: "No owner" },
  { key: "stale", label: "Stale (14+ days)" },
  { key: "dupes", label: "Possible duplicates" },
] as const;

export function LeadTable({ rows, compact = false }: { rows: LeadRow[]; compact?: boolean }) {
  const { owner } = useAppState();
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("all");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"next" | "value" | "days" | "company">("next");

  const filtered = useMemo(() => {
    let r = rows.filter((x) => owner === "All" || x.owner === owner || (!x.owner && tab === "unassigned"));
    if (tab === "active") r = r.filter((x) => !["Won", "Lost"].includes(x.ai_stage));
    if (tab === "missing") r = rows.filter((x) => !x.in_crm);
    if (tab === "unassigned") r = rows.filter((x) => !x.owner);
    if (tab === "stale") r = r.filter((x) => !["Won", "Lost"].includes(x.ai_stage) && (x.days == null || x.days >= 14));
    if (tab === "dupes") r = rows.filter((x) => x.duplicate);
    if (q) r = r.filter((x) => x.company.toLowerCase().includes(q.toLowerCase()));
    const by = {
      next: (a: LeadRow, b: LeadRow) => (a.next_due || "9999").localeCompare(b.next_due || "9999"),
      value: (a: LeadRow, b: LeadRow) => (b.value || 0) - (a.value || 0),
      days: (a: LeadRow, b: LeadRow) => (b.days ?? 999) - (a.days ?? 999),
      company: (a: LeadRow, b: LeadRow) => a.company.localeCompare(b.company),
    }[sort];
    return [...r].sort(by);
  }, [rows, owner, tab, q, sort]);

  const th = (key: typeof sort, label: string) => (
    <th className="cursor-pointer px-3 py-2 text-left font-medium hover:text-slate-900" onClick={() => setSort(key)}>
      {label}{sort === key ? " ↓" : ""}
    </th>
  );

  return (
    <div className="space-y-3">
      {!compact && (
        <div className="flex flex-wrap items-center gap-2">
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)} className={`rounded-full border px-3 py-1 text-xs ${tab === t.key ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-300 bg-white text-slate-600"}`}>
              {t.label}
            </button>
          ))}
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search company…" className="ml-auto rounded-md border border-slate-300 px-2 py-1 text-sm" />
        </div>
      )}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500">
            <tr>
              {th("company", "Company")}
              <th className="px-3 py-2 text-left font-medium">Source</th>
              <th className="px-3 py-2 text-left font-medium">Owner</th>
              <th className="px-3 py-2 text-left font-medium">Stage (CRM → AI)</th>
              {th("value", "Value")}
              {th("days", "Last touch")}
              {th("next", "Next action")}
              <th className="px-3 py-2 text-left font-medium">Flags</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="px-3 py-2">
                  <Link href={`/accounts/${encodeURIComponent(r.id)}`} className="font-medium text-slate-900 hover:text-indigo-700">{r.company}</Link>
                  <div className="text-xs text-slate-500">{r.service || "—"}</div>
                </td>
                <td className="px-3 py-2 text-xs text-slate-600">{r.source}</td>
                <td className="px-3 py-2 text-xs">{r.owner || <span className="text-rose-600">Unassigned</span>}</td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap items-center gap-1">
                    <span className={`chip ${STAGE_STYLE[r.crm_stage]}`}>{r.in_crm ? r.crm_stage : "—"}</span>
                    {r.ai_stage !== r.crm_stage && (
                      <>
                        <span className="text-xs text-slate-400">→</span>
                        <span className={`chip ${STAGE_STYLE[r.ai_stage]}`}>{r.ai_stage}</span>
                      </>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2 text-xs font-medium">{money(r.value)}</td>
                <td className="px-3 py-2 text-xs text-slate-600">{r.days == null ? "never" : `${r.days}d ago`}</td>
                <td className="px-3 py-2 text-xs">
                  {r.next_due ? (
                    <>
                      <div className={r.overdue ? "font-medium text-rose-600" : "text-slate-700"}>{fmtDate(r.next_due)}</div>
                      <div className="max-w-56 truncate text-slate-500" title={r.next_title}>{r.next_title}</div>
                    </>
                  ) : (
                    <span className="text-slate-400">none</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-1">
                    {r.overdue > 0 && <span className="chip border-rose-200 bg-rose-50 text-rose-700">{r.overdue} overdue</span>}
                    {!r.in_crm && <span className="chip border-amber-200 bg-amber-50 text-amber-700">Not in CRM</span>}
                    {r.duplicate && <span className="chip border-orange-200 bg-orange-50 text-orange-700">Duplicate?</span>}
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="px-3 py-6 text-center text-sm text-slate-500">No leads in this view.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
