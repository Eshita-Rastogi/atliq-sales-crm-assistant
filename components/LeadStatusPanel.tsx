"use client";

import { useState } from "react";
import { useAppState } from "./AppState";
import { Rate } from "./Rate";
import { PIPELINE, PROFILE_FIELDS, completeness } from "@/lib/stage";
import type { Stage } from "@/lib/types";
import { OWNER_COLOR, STAGE_STYLE, fmtDate, initials, money } from "@/lib/format";

interface Props {
  id: string;
  aiStage: Stage;
  crmStage: string;
  stageReason: string;
  nextStep: string;
  fields: Record<string, string>; // CRM values as exported ("" when empty)
  aiSuggestions: Record<string, { value: string; quote: string }>; // AI-proposed values per field
  lastTouch: string | null;
  itemIds: string[]; // this lead's follow-ups
  children?: React.ReactNode; // merge banner + follow-ups
}

const SERVICES = ["Power BI Dashboards", "Data Engineering", "AI/ML Solutions", "Custom Web App", "Staff Augmentation"];
const SOURCES = ["Referral", "LinkedIn", "Conference", "Website", "Cold Outreach", "Existing client"];

// Live status: stage track, next step, profile completeness + edit, activity log.
export function LeadStatusPanel(p: Props) {
  const { leadEdits, activity, setStage, editLead, done } = useAppState();
  const allDone = p.itemIds.length > 0 && p.itemIds.every((i) => done[i]);
  const edit = leadEdits[p.id];
  const stage = edit?.stage || p.aiStage;
  const values = { ...p.fields, ...(edit?.fields || {}) };
  const { pct, missing } = completeness(values);
  const lastContact = [edit?.last_contact, p.lastTouch].filter(Boolean).sort().at(-1) || null;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>(values);
  const [pending, setPending] = useState<Stage | null>(null);
  const [note, setNote] = useState("");
  const log = activity[p.id] || [];
  const input = "w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-sm";

  return (
    <>
      <section className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-semibold text-slate-900">Status &amp; next steps</h2>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className={`chip ${STAGE_STYLE[stage]}`}>{stage}</span>
              {edit?.stage ? <span>updated by your team</span> : p.crmStage !== stage && <span>CRM still says <b>{p.crmStage}</b></span>}
            </div>
          </div>
          <div className="flex gap-6 text-sm">
            <div><div className="text-xs text-slate-500">Value</div><div className="font-semibold">{money(values.est_value_usd ? Number(values.est_value_usd) : null)}</div></div>
            <div>
              <div className="text-xs text-slate-500">Owner</div>
              {values.owner ? (
                <div className="flex items-center gap-1.5 font-medium">
                  <span className={`grid h-5 w-5 place-items-center rounded-full text-[9px] font-semibold text-white ${OWNER_COLOR[values.owner] || "bg-slate-400"}`}>{initials(values.owner)}</span>
                  {values.owner}
                </div>
              ) : <div className="font-medium text-rose-600">Unassigned</div>}
            </div>
            <div><div className="text-xs text-slate-500">Last contact</div><div className="font-medium">{lastContact ? fmtDate(lastContact) : "never"}</div></div>
          </div>
        </div>

        {/* Stage track — click to move the deal */}
        <div className="mt-4">
          <div className="flex flex-wrap items-center gap-1">
            {PIPELINE.map((s, i) => {
              const reached = PIPELINE.indexOf(stage) >= i && stage !== "Lost";
              return (
                <button
                  key={s}
                  onClick={() => s !== stage && setPending(s)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                    s === stage ? "bg-indigo-600 text-white" : reached ? "bg-indigo-100 text-indigo-800 hover:bg-indigo-200" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {s}
                </button>
              );
            })}
            <span className="mx-1 text-slate-300">|</span>
            {(["Lost", "Re-engaged"] as Stage[]).map((s) => (
              <button
                key={s}
                onClick={() => s !== stage && setPending(s)}
                className={`rounded-full px-3 py-1 text-xs font-medium ${s === stage ? "bg-rose-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
              >
                {s}
              </button>
            ))}
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Click a stage to move this deal. Stages also update when you complete a follow-up.</p>
          {pending && (
            <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 p-2 text-sm">
              Move to <b>{pending}</b>?
              <input className="min-w-48 flex-1 rounded border border-slate-300 bg-white px-2 py-1 text-xs" placeholder="Reason (optional), e.g. SOW signed" value={note} onChange={(e) => setNote(e.target.value)} />
              <button className="btn" onClick={() => setPending(null)}>Cancel</button>
              <button
                className="btn-primary"
                onClick={() => {
                  setStage(p.id, pending, note);
                  setPending(null);
                  setNote("");
                }}
              >
                Move
              </button>
            </div>
          )}
        </div>

        {p.stageReason && !edit?.stage && <p className="mt-3 text-sm text-slate-600">{p.stageReason}</p>}
        {allDone ? (
          <div className="mt-3 rounded-lg bg-emerald-600 px-4 py-3 text-sm text-white">
            <span className="font-semibold">All follow-ups done ✓ </span>
            {values.next_followup_date ? `Next follow-up set for ${fmtDate(values.next_followup_date)}.` : "Set the next follow-up date below so this deal doesn't go quiet."}
          </div>
        ) : (
          p.nextStep && (
            <div className="mt-3 flex flex-wrap items-start gap-2 rounded-lg bg-indigo-600 px-4 py-3 text-sm text-white">
              <span className="min-w-0 flex-1"><span className="font-semibold">✦ AI next step: </span>{p.nextStep}</span>
              <Rate id={`nextstep:${p.id}`} kind="Next step" dark />
            </div>
          )
        )}
        {p.children}
      </section>

      {/* Profile completeness */}
      <section className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold text-slate-900">Lead profile — {pct}% complete</h2>
            <div className="mt-2 h-2 max-w-md overflow-hidden rounded-full bg-slate-100">
              <div className={`h-full ${pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-rose-500"}`} style={{ width: `${pct}%` }} />
            </div>
            {missing.length > 0 && (
              <p className="mt-2 text-xs text-slate-600">
                Missing: {missing.map((m) => m.label).join(", ")}.{" "}
                {missing.some((m) => p.aiSuggestions[m.key]) && <span className="text-indigo-700">✦ The AI found some of these in the emails — open Edit to accept.</span>}
              </p>
            )}
          </div>
          <button
            className={editing ? "btn" : "btn-primary"}
            onClick={() => {
              setDraft(values);
              setEditing(!editing);
            }}
          >
            {editing ? "Cancel" : missing.length ? "Complete profile" : "Edit details"}
          </button>
        </div>

        {editing && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {PROFILE_FIELDS.map((f) => {
              const sug = p.aiSuggestions[f.key];
              return (
                <label key={f.key} className="text-xs text-slate-600">
                  {f.label}
                  {f.key === "service_interest" ? (
                    <select className={input} value={draft[f.key] || ""} onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}>
                      <option value="">—</option>
                      {[...new Set([...SERVICES, draft[f.key]].filter(Boolean))].map((s) => <option key={s}>{s}</option>)}
                    </select>
                  ) : f.key === "source" ? (
                    <select className={input} value={draft[f.key] || ""} onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}>
                      <option value="">—</option>
                      {[...new Set([...SOURCES, draft[f.key]].filter(Boolean))].map((s) => <option key={s}>{s}</option>)}
                    </select>
                  ) : f.key === "owner" ? (
                    <select className={input} value={draft[f.key] || ""} onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}>
                      <option value="">Unassigned</option>
                      {["Bhavin", "Dhaval", "Karandeep", "Jay"].map((s) => <option key={s}>{s}</option>)}
                    </select>
                  ) : (
                    <input
                      type={f.key === "next_followup_date" ? "date" : "text"}
                      inputMode={f.key === "est_value_usd" ? "numeric" : undefined}
                      className={input}
                      value={draft[f.key] || ""}
                      onChange={(e) => setDraft({ ...draft, [f.key]: f.key === "est_value_usd" ? e.target.value.replace(/[^\d]/g, "") : e.target.value })}
                    />
                  )}
                  {sug && sug.value !== draft[f.key] && (
                    <button type="button" onClick={() => setDraft({ ...draft, [f.key]: sug.value })} className="mt-1 block text-left text-[11px] text-indigo-700 hover:underline" title={sug.quote}>
                      ✦ AI suggests: {sug.value.slice(0, 80)} — use this
                    </button>
                  )}
                </label>
              );
            })}
            <div className="flex justify-end gap-2 sm:col-span-2">
              <button
                className="btn-primary"
                onClick={() => {
                  const changed = Object.fromEntries(Object.entries(draft).filter(([k, v]) => (v || "") !== (values[k] || "")));
                  if (Object.keys(changed).length) editLead(p.id, changed);
                  setEditing(false);
                }}
              >
                Save details
              </button>
            </div>
          </div>
        )}
      </section>

      {log.length > 0 && (
        <section className="card p-5">
          <h2 className="mb-2 font-semibold text-slate-900">Your team&apos;s activity on this lead</h2>
          <ul className="space-y-1.5 text-sm">
            {log.map((a) => (
              <li key={a.at} className="flex gap-3">
                <span className="w-24 shrink-0 text-xs text-slate-500">{fmtDate(a.date)}</span>
                <span className="text-slate-800">{a.text}</span>
                <span className="ml-auto shrink-0 text-xs text-slate-400">{a.by}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
