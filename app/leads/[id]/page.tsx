import Link from "next/link";
import { notFound } from "next/navigation";
import { BackButton } from "@/components/BackButton";
import { DocCard } from "@/components/DocCard";
import { FollowUpRow } from "@/components/FollowUpRow";
import { LeadStatusPanel } from "@/components/LeadStatusPanel";
import { LeadTabs } from "@/components/LeadTabs";
import { LiveFollowUps, LiveMeetings } from "@/components/LiveLeadExtras";
import { MergeBanner } from "@/components/MergeBanner";
import { Rate } from "@/components/Rate";
import { SuggestionRow } from "@/components/SuggestionRow";
import { accountById, model } from "@/lib/model";
import { TYPE_LABEL, TYPE_STYLE } from "@/lib/format";

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

  const about = [
    { icon: "🏢", label: "Who they are", text: a.about },
    { icon: "🤝", label: "Why they're here", text: a.why_here },
    { icon: "🎯", label: "What they want", text: a.wants },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex items-center gap-3 text-xs text-slate-500">
        <BackButton />
        <span><Link href="/" className="hover:underline">Home</Link> / <Link href="/leads" className="hover:underline">Leads &amp; deals</Link> / {a.company}</span>
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
        <Link href={`/meetings/new?lead=${encodeURIComponent(a.id)}`} className="btn-primary px-3 py-1.5 text-sm">📝 Log meeting notes</Link>
      </div>

      {/* 1. About this lead */}
      <section className="card p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="font-semibold text-slate-900">About this lead <span className="ml-1 rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700">✦ AI</span></h2>
          <Rate id={`profile:${a.id}`} kind="Lead profile" />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {about.map((x) => (
            <div key={x.label}>
              <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{x.icon} {x.label}</div>
              <p className="mt-1 text-sm leading-relaxed text-slate-800">{x.text || "Not stated in the CRM or conversations."}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 2. Status + next steps (live: stage track, profile completeness, activity) */}
      <LeadStatusPanel
        id={a.id}
        aiStage={a.ai_stage}
        crmStage={a.in_crm ? a.crm_stage : "Not in CRM"}
        stageReason={a.stage_reason}
        nextStep={a.next_best_action}
        lastTouch={a.last_touch}
        itemIds={followUps.map((r) => r.signal_id)}
        fields={{
          contact_name: a.contact_name,
          contact_email: a.contact_email,
          source: a.crm?.source || "",
          service_interest: a.service_interest,
          est_value_usd: a.value_usd != null ? String(a.value_usd) : "",
          owner: a.owner,
          next_followup_date: a.crm?.next_followup_date || "",
          notes: a.crm?.notes || "",
        }}
        aiSuggestions={Object.fromEntries(
          suggestions
            .filter((s) => ["service_interest", "est_value_usd", "owner", "contact_email", "notes", "next_followup_date"].includes(s.field))
            .map((s) => [s.field, { value: s.proposed, quote: s.quote }]),
        )}
      >
        {a.duplicate_of.length > 0 && <MergeBanner id={a.id} others={a.duplicate_of} note={a.duplicate_note} />}
        <h3 className="mb-1 mt-5 text-sm font-semibold text-slate-700">Follow-ups ({followUps.length})</h3>
        <div className="divide-y divide-slate-100 rounded-lg border border-slate-200">
          <LiveFollowUps accountId={a.id} stage={a.ai_stage} />
          {followUps.map((r) => <FollowUpRow key={r.signal_id} r={r} showCompany={false} stage={a.ai_stage} />)}
          {followUps.length === 0 && <div className="px-4 py-3 text-sm text-slate-500">Nothing open — no follow-ups found for this lead.</div>}
        </div>
      </LeadStatusPanel>

      {/* 3. Details in tabs */}
      <LeadTabs
        tabs={[
          {
            key: "activity",
            label: `Activity (${docs.length})`,
            content: (
              <div className="space-y-3 border-l border-slate-200 pl-1">
                <LiveMeetings accountId={a.id} />
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
                    <span className="flex items-center gap-3 text-[11px] text-slate-400">from {a.doc_ids.length} source{a.doc_ids.length === 1 ? "" : "s"} · {model.models.reason} <Rate id={`summary:${a.id}`} kind="Account summary" /></span>
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
