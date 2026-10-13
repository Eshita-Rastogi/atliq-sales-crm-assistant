import Link from "next/link";
import { notFound } from "next/navigation";
import { DocCard } from "@/components/DocCard";
import { FollowUpRow } from "@/components/FollowUpRow";
import { LeadTabs } from "@/components/LeadTabs";
import { SuggestionRow } from "@/components/SuggestionRow";
import { accountById, model } from "@/lib/model";
import { OWNER_COLOR, STAGE_STYLE, TYPE_LABEL, TYPE_STYLE, initials, money } from "@/lib/format";

export function generateStaticParams() {
  return model.accounts.map((a) => ({ id: a.id }));
}

export default async function LeadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const a = accountById(id);
  if (!a) notFound();

  const sigs = model.signals.filter((s) => s.account_id === a.id);
  const followUps = model.radar.filter((r) => r.account_id === a.id);
  const insights = sigs.filter((s) => ["cross_sell", "referral", "competitor", "status_change"].includes(s.type));
  const done = sigs.filter((s) => s.status === "done" && !["competitor", "status_change"].includes(s.type));
  const suggestions = model.suggestions.filter((s) => s.account_id === a.id);
  const docs = model.docs.filter((d) => a.doc_ids.includes(d.id)).sort((x, y) => y.date.localeCompare(x.date));
  const stageChanged = a.in_crm && a.ai_stage !== a.crm_stage;

  const about = [
    { icon: "🏢", label: "Who they are", text: a.about },
    { icon: "🤝", label: "Why they're here", text: a.why_here },
    { icon: "🎯", label: "What they want", text: a.wants },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="text-xs text-slate-500">
        <Link href="/leads" className="hover:underline">Leads &amp; deals</Link> / {a.company}
      </div>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{a.company}</h1>
          <div className="mt-1 text-sm text-slate-500">
            {a.contact_name || "Contact unknown"}
            {a.contact_email && <> · {a.contact_email}</>}
            {a.lead_ids.length > 0 ? <> · {a.lead_ids.join(", ")}</> : <span className="ml-1 font-medium text-amber-700">· Not in CRM yet</span>}
          </div>
        </div>
        <div className="flex items-center gap-6 text-sm">
          <div><div className="text-xs text-slate-500">Value</div><div className="text-lg font-semibold">{money(a.value_usd)}</div></div>
          <div>
            <div className="text-xs text-slate-500">Owner</div>
            {a.owner ? (
              <div className="flex items-center gap-1.5 font-medium">
                <span className={`grid h-6 w-6 place-items-center rounded-full text-[10px] font-semibold text-white ${OWNER_COLOR[a.owner] || "bg-slate-400"}`}>{initials(a.owner)}</span>
                {a.owner}
              </div>
            ) : <div className="font-medium text-rose-600">Unassigned</div>}
          </div>
          <div><div className="text-xs text-slate-500">Last contact</div><div className="font-medium">{a.last_touch ? `${a.days_since_touch}d ago` : "never"}</div></div>
        </div>
      </div>

      {/* 1. About this lead */}
      <section className="card p-5">
        <h2 className="mb-3 font-semibold text-slate-900">About this lead</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {about.map((x) => (
            <div key={x.label}>
              <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{x.icon} {x.label}</div>
              <p className="mt-1 text-sm leading-relaxed text-slate-800">{x.text || "Not stated in the CRM or conversations."}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 2. Status + next steps */}
      <section className="card p-5">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="mr-2 font-semibold text-slate-900">Status &amp; next steps</h2>
          <span className={`chip ${STAGE_STYLE[a.ai_stage]}`}>{a.ai_stage}</span>
          {stageChanged && <span className="text-xs text-slate-500">CRM still says <b>{a.crm_stage}</b> — update suggested below</span>}
        </div>
        {a.stage_reason && <p className="mt-2 text-sm text-slate-600">{a.stage_reason}</p>}
        {a.next_best_action && (
          <div className="mt-3 rounded-lg bg-indigo-600 px-4 py-3 text-sm text-white">
            <span className="font-semibold">Next step: </span>{a.next_best_action}
          </div>
        )}
        {a.duplicate_of.length > 0 && (
          <div className="mt-3 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-xs text-orange-800">
            Possible duplicate of{" "}
            {a.duplicate_of.map((d) => <Link key={d} href={`/leads/${encodeURIComponent(d)}`} className="font-medium underline">{d}</Link>)}. {a.duplicate_note}
          </div>
        )}
        <h3 className="mb-1 mt-5 text-sm font-semibold text-slate-700">Open follow-ups ({followUps.length})</h3>
        <div className="divide-y divide-slate-100 rounded-lg border border-slate-200">
          {followUps.map((r) => <FollowUpRow key={r.signal_id} r={r} showCompany={false} />)}
          {followUps.length === 0 && <div className="px-4 py-3 text-sm text-slate-500">Nothing open — no follow-ups found for this lead.</div>}
        </div>
      </section>

      {/* 3. Details in tabs */}
      <LeadTabs
        tabs={[
          {
            key: "activity",
            label: `Activity (${docs.length})`,
            content: (
              <div className="space-y-3 border-l border-slate-200 pl-1">
                {docs.map((d) => (
                  <DocCard key={d.id} id={d.id} kind={d.kind} title={d.title} date={d.date} summary={d.summary || ""} highlights={d.highlights || []} text={d.text} quotes={sigs.filter((s) => s.doc_id === d.id).map((s) => s.quote)} />
                ))}
                {docs.length === 0 && <p className="pl-5 text-sm text-slate-500">No emails or meeting notes for this lead.</p>}
              </div>
            ),
          },
          {
            key: "insights",
            label: "AI insights",
            content: (
              <div className="space-y-4">
                <div className="card p-4">
                  <div className="mb-1 flex items-center justify-between">
                    <h3 className="font-semibold text-indigo-900">✦ Summary</h3>
                    <span className="text-[11px] text-slate-400">from {a.doc_ids.length} source{a.doc_ids.length === 1 ? "" : "s"} · {model.models.reason}</span>
                  </div>
                  <p className="text-sm leading-relaxed text-slate-800">{a.summary}</p>
                  {a.highlights.length > 0 && (
                    <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
                      {a.highlights.map((h) => <li key={h} className="rounded-md bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700">• {h}</li>)}
                    </ul>
                  )}
                </div>
                {insights.length > 0 && (
                  <div className="card p-4">
                    <h3 className="mb-2 font-semibold text-slate-900">Signals worth knowing</h3>
                    <ul className="space-y-2">
                      {insights.map((s) => (
                        <li key={s.id} className="text-sm">
                          <span className={`chip mr-1 border-transparent ${TYPE_STYLE[s.type]}`}>{TYPE_LABEL[s.type]}</span>
                          {s.title}
                          <blockquote className="quote mt-1">“{s.quote}”</blockquote>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {done.length > 0 && (
                  <div className="card p-4">
                    <h3 className="mb-2 font-semibold text-slate-900">Already done</h3>
                    <ul className="space-y-1 text-sm text-slate-600">{done.map((s) => <li key={s.id}>✓ {s.title}</li>)}</ul>
                  </div>
                )}
              </div>
            ),
          },
          {
            key: "crm",
            label: `CRM details & updates${suggestions.length ? ` (${suggestions.length})` : ""}`,
            content: (
              <div className="grid gap-4 lg:grid-cols-2">
                <div>
                  <h3 className="mb-2 font-semibold text-slate-900">Suggested CRM updates</h3>
                  <p className="mb-2 text-xs text-slate-500">Nothing changes in the CRM until you approve.</p>
                  <div className="space-y-2">
                    {suggestions.map((s) => <SuggestionRow key={s.id} s={s} />)}
                    {suggestions.length === 0 && <p className="text-sm text-slate-500">No changes suggested.</p>}
                  </div>
                </div>
                <div className="card p-4">
                  <h3 className="mb-2 font-semibold text-slate-900">CRM record (as exported)</h3>
                  {a.crm ? (
                    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
                      {Object.entries(a.crm).map(([k, v]) => (
                        <div key={k} className="contents">
                          <dt className="text-slate-500">{k}</dt>
                          <dd className={v === "" || v == null ? "text-rose-500" : "text-slate-800"}>{v === "" || v == null ? "empty" : String(v)}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : (
                    <p className="text-sm text-amber-700">This company is not in the CRM. Approve the “New lead” suggestion to add it.</p>
                  )}
                </div>
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
