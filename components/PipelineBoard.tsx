"use client";

import Link from "next/link";
import { useState } from "react";
import { useAppState } from "./AppState";
import { STAGES, type Account, type Stage } from "@/lib/types";
import { OWNER_COLOR, STAGE_BAR, STAGE_STYLE, initials, money } from "@/lib/format";

type Card = Pick<
  Account,
  "id" | "company" | "owner" | "value_usd" | "ai_stage" | "crm_stage" | "in_crm" | "days_since_touch" | "duplicate_of" | "competitor" | "service_interest"
> & { overdue: number; open: number };

export function PipelineBoard({ cards, kpis }: { cards: Card[]; kpis: Record<string, number> }) {
  const { owner } = useAppState();
  const [view, setView] = useState<"ai" | "crm">("ai");
  const mine = cards.filter((c) => owner === "All" || c.owner === owner);
  const stageOf = (c: Card): Stage | "Blank" => (view === "ai" ? c.ai_stage : c.crm_stage);
  const columns: (Stage | "Blank")[] = view === "ai" ? STAGES : [...STAGES.filter((s) => !["Qualified", "Negotiation", "Re-engaged"].includes(s)), "Blank"];
  const changed = mine.filter((c) => c.in_crm && c.ai_stage !== c.crm_stage).length;

  const tiles = [
    { label: "Open pipeline", value: money(kpis.open_pipeline), sub: `${kpis.open_deals} open deals` },
    { label: "Won", value: money(kpis.won), sub: "clients & renewals" },
    { label: "Lost", value: money(kpis.lost), sub: "closed lost" },
    { label: "Waiting on AtliQ", value: money(kpis.waiting_on_atliq), sub: "deals with overdue actions", hot: true },
    { label: "Overdue actions", value: String(kpis.overdue_actions), sub: "asks, promises, deadlines", hot: true },
    { label: "Not in CRM", value: String(kpis.not_in_crm), sub: "live leads missing", hot: true },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Pipeline</h1>
          <p className="text-sm text-slate-500">Every deal by stage. The AI view corrects stale CRM statuses using emails and meeting notes.</p>
        </div>
        <div className="flex rounded-lg border border-slate-300 bg-white p-0.5 text-xs">
          <button onClick={() => setView("ai")} className={`rounded-md px-3 py-1.5 ${view === "ai" ? "bg-indigo-600 text-white" : "text-slate-600"}`}>
            AI view (real stage)
          </button>
          <button onClick={() => setView("crm")} className={`rounded-md px-3 py-1.5 ${view === "crm" ? "bg-slate-700 text-white" : "text-slate-600"}`}>
            CRM as recorded
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-indigo-800 sm:grid-cols-3 lg:grid-cols-6">
        {tiles.map((t) => (
          <div key={t.label} className="bg-indigo-700 px-4 py-3 text-white">
            <div className="text-[11px] uppercase tracking-wide text-indigo-200">{t.label}</div>
            <div className={`text-2xl font-semibold ${t.hot ? "text-amber-200" : ""}`}>{t.value}</div>
            <div className="text-[11px] text-indigo-200">{t.sub}</div>
          </div>
        ))}
      </div>

      {view === "ai" && changed > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {changed} {changed === 1 ? "deal is" : "deals are"} at a different stage than the CRM says — marked <b>AI ↺</b>. Review them in CRM updates.
        </div>
      )}

      <div className="flex gap-3 overflow-x-auto pb-3">
        {columns.map((s) => {
          const col = mine.filter((c) => stageOf(c) === s);
          const total = col.reduce((t, c) => t + (c.value_usd || 0), 0);
          return (
            <div key={s} className="w-64 shrink-0">
              <div className="mb-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
                <div className={`mb-1.5 h-1 rounded ${s === "Blank" ? "bg-slate-300" : STAGE_BAR[s as Stage]}`} />
                <div className="flex items-center justify-between text-sm font-semibold text-slate-800">
                  <span>{s === "Blank" ? "No status" : s}</span>
                  <span className="text-xs font-normal text-slate-500">{col.length}</span>
                </div>
                <div className="text-xs text-slate-500">{money(total)}</div>
              </div>
              <div className="space-y-2">
                {col.map((c) => (
                  <Link key={c.id} href={`/accounts/${encodeURIComponent(c.id)}`} className="block card p-3 hover:border-indigo-300 hover:shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-sm font-medium text-slate-900 leading-snug">{c.company}</div>
                      {c.owner ? (
                        <span title={c.owner} className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10px] font-semibold text-white ${OWNER_COLOR[c.owner] || "bg-slate-400"}`}>
                          {initials(c.owner)}
                        </span>
                      ) : (
                        <span className="chip border-rose-200 bg-rose-50 text-rose-700">No owner</span>
                      )}
                    </div>
                    <div className="mt-0.5 text-xs text-slate-500">{c.service_interest || "Service not recorded"}</div>
                    <div className="mt-2 flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700">{money(c.value_usd)}</span>
                      <span className="text-slate-500">{c.days_since_touch == null ? "no contact" : `touched ${c.days_since_touch}d ago`}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {c.overdue > 0 && <span className="chip border-rose-200 bg-rose-50 text-rose-700">{c.overdue} overdue</span>}
                      {c.open > 0 && c.overdue === 0 && <span className="chip border-sky-200 bg-sky-50 text-sky-700">{c.open} open</span>}
                      {!c.in_crm && <span className="chip border-amber-200 bg-amber-50 text-amber-700">Not in CRM</span>}
                      {view === "ai" && c.in_crm && c.ai_stage !== c.crm_stage && (
                        <span className={`chip ${STAGE_STYLE[c.crm_stage]}`} title="CRM status differs">AI ↺ was {c.crm_stage}</span>
                      )}
                      {c.duplicate_of.length > 0 && <span className="chip border-orange-200 bg-orange-50 text-orange-700">Duplicate?</span>}
                      {c.competitor && <span className="chip border-orange-200 bg-orange-50 text-orange-700">Competitor</span>}
                    </div>
                  </Link>
                ))}
                {col.length === 0 && <div className="rounded-lg border border-dashed border-slate-200 p-3 text-center text-xs text-slate-400">No deals</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
