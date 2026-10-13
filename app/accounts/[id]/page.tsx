import Link from "next/link";
import { notFound } from "next/navigation";
import { DocCard } from "@/components/DocCard";
import { DraftButton } from "@/components/DraftButton";
import { SuggestionRow } from "@/components/SuggestionRow";
import { accountById, model } from "@/lib/model";
import { OWNER_COLOR, STAGE_STYLE, TYPE_LABEL, TYPE_STYLE, fmtDate, initials, money } from "@/lib/format";

export function generateStaticParams() {
  return model.accounts.map((a) => ({ id: a.id }));
}

export default async function AccountPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const a = accountById(id);
  if (!a) notFound();

  const sigs = model.signals.filter((s) => s.account_id === a.id);
  const radar = model.radar.filter((r) => r.account_id === a.id);
  const growth = sigs.filter((s) => ["cross_sell", "referral"].includes(s.type));
  const info = sigs.filter((s) => ["competitor", "status_change"].includes(s.type));
  const done = sigs.filter((s) => s.status === "done" && !["competitor", "status_change"].includes(s.type));
  const suggestions = model.suggestions.filter((s) => s.account_id === a.id);
  const docs = model.docs.filter((d) => a.doc_ids.includes(d.id)).sort((x, y) => y.date.localeCompare(x.date));
  const crm = a.crm;

  return (
    <div className="space-y-5">
      <div className="text-xs text-slate-500">
        <Link href="/accounts" className="hover:underline">Accounts</Link> / {a.company}
      </div>

      <div className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">{a.company}</h1>
            <div className="mt-1 text-sm text-slate-500">
              {a.contact_name || "Contact unknown"}
              {a.contact_email && <> · {a.contact_email}</>} · {a.source}
              {a.lead_ids.length > 0 && <> · {a.lead_ids.join(", ")}</>}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-slate-500">CRM says</span>
              <span className={`chip ${STAGE_STYLE[a.crm_stage]}`}>{a.in_crm ? a.crm_stage : "Not in CRM"}</span>
              <span className="text-slate-400">→</span>
              <span className="text-slate-500">AI says</span>
              <span className={`chip ${STAGE_STYLE[a.ai_stage]}`}>{a.ai_stage}</span>
              {a.competitor && <span className="chip border-orange-200 bg-orange-50 text-orange-700">Competitor in play</span>}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-6 text-sm">
            <div>
              <div className="text-xs text-slate-500">Value</div>
              <div className="text-lg font-semibold">{money(a.value_usd)}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Owner</div>
              <div className="flex items-center gap-1.5">
                {a.owner ? (
                  <>
                    <span className={`grid h-6 w-6 place-items-center rounded-full text-[10px] font-semibold text-white ${OWNER_COLOR[a.owner] || "bg-slate-400"}`}>{initials(a.owner)}</span>
                    <span className="font-medium">{a.owner}</span>
                  </>
                ) : (
                  <span className="font-medium text-rose-600">Unassigned</span>
                )}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Last touch</div>
              <div className="font-medium">{a.last_touch ? `${a.days_since_touch}d ago` : "—"}</div>
            </div>
          </div>
        </div>
        {a.duplicate_of.length > 0 && (
          <div className="mt-4 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-xs text-orange-800">
            Possible duplicate of{" "}
            {a.duplicate_of.map((d) => (
              <Link key={d} href={`/accounts/${encodeURIComponent(d)}`} className="font-medium underline">{d}</Link>
            ))}
            . {a.duplicate_note}
          </div>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <section className="card border-indigo-200 bg-gradient-to-b from-indigo-50/60 to-white p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-indigo-900">✦ AI account summary</h2>
              <span className="text-[11px] text-slate-500">from {a.doc_ids.length} source{a.doc_ids.length === 1 ? "" : "s"} · {model.models.reason}</span>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-slate-800">{a.summary}</p>
            {a.highlights.length > 0 && (
              <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
                {a.highlights.map((h) => (
                  <li key={h} className="rounded-md bg-white px-2.5 py-1.5 text-xs text-slate-700 ring-1 ring-slate-200">• {h}</li>
                ))}
              </ul>
            )}
            {a.next_best_action && (
              <div className="mt-3 rounded-md bg-indigo-600 px-3 py-2 text-sm text-white">
                <span className="font-semibold">Next best step: </span>{a.next_best_action}
              </div>
            )}
            {a.stage_reason && <div className="mt-2 text-xs text-slate-500">Stage reasoning: {a.stage_reason}</div>}
          </section>

          <section>
            <h2 className="mb-2 font-semibold text-slate-900">Open actions & reminders ({radar.length})</h2>
            <div className="space-y-2">
              {radar.map((r) => (
                <div key={r.signal_id} className="card p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`chip border-transparent ${TYPE_STYLE[r.type]}`}>{TYPE_LABEL[r.type]}</span>
                    <span className="text-sm font-medium text-slate-900">{r.title}</span>
                    {r.days_overdue > 0 ? (
                      <span className="chip border-rose-200 bg-rose-50 text-rose-700">Overdue {r.days_overdue}d</span>
                    ) : r.due_date ? (
                      <span className="chip border-amber-200 bg-amber-50 text-amber-700">Due {fmtDate(r.due_date)}</span>
                    ) : null}
                    <span className="ml-auto text-xs text-slate-500">{r.owner}</span>
                  </div>
                  <blockquote className="quote mt-2">“{r.quote}”</blockquote>
                  <div className="mt-2"><DraftButton signalId={r.signal_id} /></div>
                </div>
              ))}
              {radar.length === 0 && <div className="card p-4 text-sm text-slate-500">No open actions.</div>}
            </div>
          </section>

          <section>
            <h2 className="mb-2 font-semibold text-slate-900">Timeline — emails & meeting MOMs ({docs.length})</h2>
            <div className="space-y-3 border-l border-slate-200 pl-1">
              {docs.map((d) => (
                <DocCard
                  key={d.id}
                  id={d.id}
                  kind={d.kind}
                  title={d.title}
                  date={d.date}
                  summary={d.summary || ""}
                  highlights={d.highlights || []}
                  text={d.text}
                  quotes={sigs.filter((s) => s.doc_id === d.id).map((s) => s.quote)}
                />
              ))}
              {docs.length === 0 && <div className="pl-5 text-sm text-slate-500">No emails or notes for this account.</div>}
            </div>
          </section>
        </div>

        <div className="space-y-5">
          {suggestions.length > 0 && (
            <section>
              <h2 className="mb-2 font-semibold text-slate-900">Suggested CRM updates</h2>
              <div className="space-y-2">
                {suggestions.map((s) => <SuggestionRow key={s.id} s={s} />)}
              </div>
            </section>
          )}

          {(growth.length > 0 || info.length > 0) && (
            <section className="card p-4">
              <h2 className="mb-2 font-semibold text-slate-900">Signals</h2>
              <ul className="space-y-2">
                {[...growth, ...info].map((s) => (
                  <li key={s.id} className="text-sm">
                    <span className={`chip mr-1 border-transparent ${TYPE_STYLE[s.type]}`}>{TYPE_LABEL[s.type]}</span>
                    {s.title}
                    <blockquote className="quote mt-1">“{s.quote}”</blockquote>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {done.length > 0 && (
            <section className="card p-4">
              <h2 className="mb-2 font-semibold text-slate-900">Done</h2>
              <ul className="space-y-1 text-sm text-slate-500">
                {done.map((s) => <li key={s.id}>✓ {s.title}</li>)}
              </ul>
            </section>
          )}

          <section className="card p-4">
            <h2 className="mb-2 font-semibold text-slate-900">CRM record (as exported)</h2>
            {crm ? (
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
                {Object.entries(crm).map(([k, v]) => (
                  <div key={k} className="contents">
                    <dt className="text-slate-500">{k}</dt>
                    <dd className={v === "" || v == null ? "text-rose-500" : "text-slate-800"}>{v === "" || v == null ? "empty" : String(v)}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="text-sm text-amber-700">This company is not in the CRM. Approve the “New lead” suggestion to add it.</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
