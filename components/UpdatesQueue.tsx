"use client";

import { useState } from "react";
import { useAppState } from "./AppState";
import { SuggestionRow } from "./SuggestionRow";
import type { CrmSuggestion } from "@/lib/types";

export function UpdatesQueue({ items, companies }: { items: CrmSuggestion[]; companies: Record<string, string> }) {
  const { decisions, resetAll } = useAppState();
  const [tab, setTab] = useState<"pending" | "log">("pending");
  const pending = items.filter((s) => !decisions[s.id]);
  const log = Object.values(decisions).sort((a, b) => b.at.localeCompare(a.at));
  const groups = [
    { label: "New leads missing from the CRM", f: (s: CrmSuggestion) => s.field === "create_lead" },
    { label: "Status corrections", f: (s: CrmSuggestion) => s.field === "status" },
    { label: "Follow-up dates & last contact", f: (s: CrmSuggestion) => ["next_followup_date", "last_contact_date"].includes(s.field) },
    { label: "Possible duplicates (never merged automatically)", f: (s: CrmSuggestion) => s.field === "possible_duplicate" },
    { label: "Other field updates", f: (s: CrmSuggestion) => ["est_value_usd", "owner", "service_interest", "contact_email", "notes"].includes(s.field) },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">CRM updates</h1>
          <p className="text-sm text-slate-500">
            The AI proposes; you decide. Each change shows the exact quote it is based on. Nothing is written to the CRM until it is approved, and every decision is logged.
          </p>
        </div>
        <div className="flex rounded-lg border border-slate-300 bg-white p-0.5 text-xs">
          <button onClick={() => setTab("pending")} className={`rounded-md px-3 py-1.5 ${tab === "pending" ? "bg-indigo-600 text-white" : "text-slate-600"}`}>Pending ({pending.length})</button>
          <button onClick={() => setTab("log")} className={`rounded-md px-3 py-1.5 ${tab === "log" ? "bg-slate-700 text-white" : "text-slate-600"}`}>Audit log ({log.length})</button>
        </div>
      </div>

      {tab === "pending" ? (
        groups.map((g) => {
          const xs = pending.filter(g.f);
          if (!xs.length) return null;
          return (
            <section key={g.label}>
              <h2 className="mb-2 text-sm font-semibold text-slate-700">{g.label} ({xs.length})</h2>
              <div className="grid gap-2 lg:grid-cols-2">
                {xs.map((s) => <SuggestionRow key={s.id} s={s} company={companies[s.account_id]} />)}
              </div>
            </section>
          );
        })
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-slate-50 text-xs text-slate-500">
              <tr><th className="px-3 py-2 text-left">When</th><th className="px-3 py-2 text-left">Who</th><th className="px-3 py-2 text-left">Change</th><th className="px-3 py-2 text-left">Value</th><th className="px-3 py-2 text-left">Decision</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {log.map((d) => (
                <tr key={d.id}>
                  <td className="px-3 py-2 text-xs text-slate-500">{new Date(d.at).toLocaleString()}</td>
                  <td className="px-3 py-2 text-xs">{d.by}</td>
                  <td className="px-3 py-2 text-xs">{companies[d.id.split(":").slice(0, -1).join(":")] || d.id} · {d.id.split(":").at(-1)}</td>
                  <td className="px-3 py-2 text-xs">{d.value}</td>
                  <td className={`px-3 py-2 text-xs font-medium ${d.decision === "approved" ? "text-emerald-700" : "text-slate-500"}`}>{d.decision}</td>
                </tr>
              ))}
              {log.length === 0 && <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-500">No decisions yet.</td></tr>}
            </tbody>
          </table>
          {log.length > 0 && (
            <div className="border-t p-2 text-right">
              <button className="text-xs text-slate-500 underline" onClick={resetAll}>Reset demo state</button>
            </div>
          )}
        </div>
      )}
      {tab === "pending" && pending.length === 0 && <div className="card p-6 text-center text-sm text-slate-500">All suggestions reviewed.</div>}
    </div>
  );
}
