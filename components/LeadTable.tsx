"use client";

import Link from "next/link";
import { useState } from "react";
import type { Stage } from "@/lib/types";
import { OWNER_COLOR, STAGE_STYLE, fmtDate, initials, money } from "@/lib/format";

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
  fields?: Record<string, string>; // profile fields for completeness
  profile?: number; // % complete
  href?: string; // leads added in the app open a local page
  added?: boolean;
}

export function LeadTable({ rows }: { rows: LeadRow[] }) {
  const [sort, setSort] = useState<"next" | "value" | "days" | "company">("next");
  const by = {
    next: (a: LeadRow, b: LeadRow) => (a.next_due || "9999").localeCompare(b.next_due || "9999"),
    value: (a: LeadRow, b: LeadRow) => (b.value || 0) - (a.value || 0),
    days: (a: LeadRow, b: LeadRow) => (b.days ?? 999) - (a.days ?? 999),
    company: (a: LeadRow, b: LeadRow) => a.company.localeCompare(b.company),
  }[sort];
  const th = (key: typeof sort, label: string) => (
    <th className="cursor-pointer px-3 py-2 text-left font-medium hover:text-slate-900" onClick={() => setSort(key)}>
      {label}{sort === key ? " ↓" : ""}
    </th>
  );

  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500">
          <tr>
            {th("company", "Lead")}
            <th className="px-3 py-2 text-left font-medium">Stage</th>
            {th("value", "Value")}
            <th className="px-3 py-2 text-left font-medium">Owner</th>
            {th("next", "Next follow-up")}
            {th("days", "Last contact")}
            <th className="px-3 py-2 text-left font-medium">Profile</th>
            <th className="px-3 py-2 text-left font-medium">Source</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {[...rows].sort(by).map((r) => (
            <tr key={r.id} className="hover:bg-slate-50">
              <td className="px-3 py-2.5">
                <Link href={r.href || `/leads/${encodeURIComponent(r.id)}`} className="font-medium text-slate-900 hover:text-indigo-700">{r.company}</Link>
                <div className="text-xs text-slate-500">
                  {r.service || "Service not recorded"}
                  {r.added && <span className="ml-1 font-medium text-emerald-700">· Added in app</span>}
                  {!r.in_crm && <span className="ml-1 font-medium text-amber-700">· Not in CRM</span>}
                  {r.duplicate && <span className="ml-1 font-medium text-orange-700">· Possible duplicate</span>}
                </div>
              </td>
              <td className="px-3 py-2.5"><span className={`chip ${STAGE_STYLE[r.ai_stage]}`}>{r.ai_stage}</span></td>
              <td className="px-3 py-2.5 text-xs font-medium">{money(r.value)}</td>
              <td className="px-3 py-2.5">
                {r.owner ? (
                  <span className="flex items-center gap-1.5 text-xs">
                    <span className={`grid h-5 w-5 place-items-center rounded-full text-[9px] font-semibold text-white ${OWNER_COLOR[r.owner] || "bg-slate-400"}`}>{initials(r.owner)}</span>
                    {r.owner}
                  </span>
                ) : (
                  <span className="text-xs font-medium text-rose-600">Unassigned</span>
                )}
              </td>
              <td className="px-3 py-2.5 text-xs">
                {r.next_due ? (
                  <>
                    <div className={r.overdue ? "font-medium text-rose-600" : "text-slate-700"}>{r.overdue ? `${r.overdue} overdue` : fmtDate(r.next_due)}</div>
                    <div className="max-w-56 truncate text-slate-500" title={r.next_title}>{r.next_title}</div>
                  </>
                ) : (
                  <span className="text-slate-400">—</span>
                )}
              </td>
              <td className="px-3 py-2.5 text-xs text-slate-600">{r.days == null ? "never" : `${r.days}d ago`}</td>
              <td className="px-3 py-2.5 text-xs">
                {r.profile != null && (
                  <span className={`font-medium ${r.profile >= 80 ? "text-emerald-600" : r.profile >= 50 ? "text-amber-600" : "text-rose-600"}`}>{r.profile}%</span>
                )}
              </td>
              <td className="px-3 py-2.5 text-xs text-slate-500">{r.source}</td>
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={8} className="px-3 py-6 text-center text-sm text-slate-500">No leads in this view.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
