"use client";

import Link from "next/link";
import { useState } from "react";
import { useAppState } from "./AppState";
import type { CrmSuggestion } from "@/lib/types";

const FIELD_LABEL: Record<string, string> = {
  status: "Status",
  est_value_usd: "Est. value (USD)",
  owner: "Owner",
  service_interest: "Service interest",
  contact_email: "Contact email",
  notes: "Notes",
  next_followup_date: "Next follow-up date",
  last_contact_date: "Last contact date",
  create_lead: "New lead",
  possible_duplicate: "Possible duplicate",
};

// One suggested CRM change. Nothing is written until a human approves it.
export function SuggestionRow({ s, company }: { s: CrmSuggestion; company?: string }) {
  const { decisions, decide } = useAppState();
  const d = decisions[s.id];
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(s.proposed);
  const isFlag = s.field === "possible_duplicate";

  return (
    <div className={`rounded-lg border p-3 ${d ? (d.decision === "approved" ? "border-emerald-200 bg-emerald-50/50" : "border-slate-200 bg-slate-50 opacity-70") : "border-slate-200 bg-white"}`}>
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1 basis-64">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {company && (
              <Link href={`/accounts/${encodeURIComponent(s.account_id)}`} className="font-semibold text-slate-900 hover:text-indigo-700">
                {company}
              </Link>
            )}
            <span className="chip border-slate-200 bg-slate-50 text-slate-600">{FIELD_LABEL[s.field] || s.field}</span>
          </div>
          <div className="mt-1 text-sm">
            <span className="text-slate-400 line-through decoration-slate-300">{s.current}</span>
            <span className="mx-2 text-slate-400">→</span>
            {editing ? (
              <input className="rounded border border-slate-300 px-1.5 py-0.5 text-sm" value={value} onChange={(e) => setValue(e.target.value)} />
            ) : (
              <span className="font-medium text-slate-900">{d?.value || value}</span>
            )}
          </div>
          <div className="mt-1 text-xs text-slate-500">{s.reason}</div>
          {s.quote && (
            <blockquote className="quote mt-1.5">
              “{s.quote}”
              {s.doc_id && (
                <>
                  {" "}—{" "}
                  <Link href={`/docs/${encodeURIComponent(s.doc_id)}`} className="not-italic text-indigo-600 hover:underline">{s.doc_id}</Link>
                </>
              )}
            </blockquote>
          )}
        </div>
        <div className="ml-auto flex items-center gap-1">
          {d ? (
            <span className={`text-xs font-medium ${d.decision === "approved" ? "text-emerald-700" : "text-slate-500"}`}>
              {d.decision === "approved" ? (isFlag ? "Reviewed ✓" : "Approved ✓") : "Rejected"} · {d.by}
            </span>
          ) : (
            <>
              {!isFlag && (
                <button className="btn" onClick={() => setEditing(!editing)}>{editing ? "Done" : "Edit"}</button>
              )}
              <button className="btn" onClick={() => decide(s.id, "rejected", value)}>Reject</button>
              <button className="btn-primary" onClick={() => decide(s.id, "approved", value)}>{isFlag ? "Mark reviewed" : "Approve"}</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
