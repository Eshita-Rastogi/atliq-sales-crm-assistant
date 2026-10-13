import Link from "next/link";
import { model } from "@/lib/model";

export default function SourcesPage() {
  const emails = model.docs.filter((d) => d.kind === "email").length;
  const notes = model.docs.filter((d) => d.kind === "meeting_note").length;
  const crm = model.accounts.filter((a) => a.crm).length;
  const docsWithSignals = new Set(model.signals.map((s) => s.doc_id)).size;

  const today = [
    { name: "CRM export", detail: `${crm} lead records (crm_export.csv)`, how: "Imported as-is; treated as one source, not the truth — it is stale and incomplete." },
    { name: "Email threads", detail: `${emails} threads`, how: "Read by the AI; client asks, promises, deadlines, revisits and growth signals extracted with exact quotes." },
    { name: "Meeting notes (MOMs)", detail: `${notes} notes`, how: "Same extraction: action items, budgets, decision-makers, dates." },
  ];

  const pipeline = [
    "Editorial “what happened next” notes are removed first (kept only to test the AI).",
    `AI (${model.models.extract}) reads each document → ${model.signals.length} signals, each with a verbatim quote.`,
    "Code checks every quote exists word-for-word in the source; anything else is dropped.",
    "Code links each signal to a lead (email, domain, company), calculates due dates and ranks follow-ups.",
    `AI (${model.models.reason}) writes each lead's summary, real stage, next step and profile.`,
    "People review: CRM changes, merges and drafts all need a human to approve or send.",
  ];

  const roadmap = [
    { ch: "Gmail / Outlook", how: "Official email APIs. Each person signs in once and approves read-only access; new threads are processed within minutes.", status: "Planned (V2)", note: "Main source of signals" },
    { ch: "Calendar", how: "Same sign-in. After each client meeting: a reminder to log the MOM, with attendees pre-filled.", status: "Planned (V2)", note: "" },
    { ch: "Meeting notes / transcripts", how: "Shared notes folder, or Zoom / Teams transcripts after calls.", status: "Planned (V2)", note: "" },
    { ch: "Forward-to address", how: "Forward any email or note to e.g. crm@atliq.com — no integration needed.", status: "Planned (V1.5)", note: "Cheapest to ship" },
    { ch: "Paste / quick capture", how: "Paste an email, note or business-card text; the AI fills the lead form.", status: "Live in prototype", note: "" },
    { ch: "WhatsApp", how: "Only via the WhatsApp Business API; personal chats can't be read. Workaround: forward a chat or voice note.", status: "Later", note: "Needs Business account" },
    { ch: "CRM write-back", how: "Approved changes written through the CRM's API (which CRM AtliQ uses is an open question).", status: "Planned (V2)", note: "Prototype stores approvals in the browser" },
  ];

  const pill = (s: string) =>
    s.startsWith("Live") ? "bg-emerald-50 text-emerald-700 border-emerald-200" : s.startsWith("Later") ? "bg-slate-50 text-slate-600 border-slate-200" : "bg-indigo-50 text-indigo-700 border-indigo-200";

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Where the data comes from</h1>
        <p className="text-sm text-slate-500">What the assistant reads today, how it turns that into follow-ups, and how it connects to everyone&apos;s email and calendar next.</p>
      </div>

      <section>
        <h2 className="mb-2 font-semibold text-slate-900">Today — prototype on a fixed snapshot (10 Jul 2026)</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {today.map((t) => (
            <div key={t.name} className="card p-4">
              <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{t.name}</div>
              <div className="mt-1 text-lg font-semibold text-slate-900">{t.detail}</div>
              <p className="mt-1 text-xs text-slate-600">{t.how}</p>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Coverage: {model.docs.length}/{model.docs.length} documents processed · {docsWithSignals} produced at least one signal · {model.accounts.filter((a) => !a.in_crm).length} live leads found that are missing from the CRM.{" "}
          <Link href="/docs/2026-06-16_meridian_proposal_questions" className="text-indigo-600 underline">See a source document as the AI saw it</Link>.
        </p>
      </section>

      <section className="card p-5">
        <h2 className="mb-3 font-semibold text-slate-900">How information becomes a follow-up</h2>
        <ol className="space-y-2">
          {pipeline.map((p, i) => (
            <li key={i} className="flex gap-3 text-sm text-slate-700">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-indigo-50 text-xs font-semibold text-indigo-700">{i + 1}</span>
              {p}
            </li>
          ))}
        </ol>
      </section>

      <section>
        <h2 className="mb-2 font-semibold text-slate-900">Connecting everyone&apos;s channels — roadmap</h2>
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-slate-50 text-xs text-slate-500">
              <tr><th className="px-3 py-2 text-left font-medium">Channel</th><th className="px-3 py-2 text-left font-medium">How it connects</th><th className="px-3 py-2 text-left font-medium">Status</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {roadmap.map((r) => (
                <tr key={r.ch}>
                  <td className="px-3 py-2.5 font-medium text-slate-900">{r.ch}{r.note && <div className="text-[11px] font-normal text-slate-500">{r.note}</div>}</td>
                  <td className="px-3 py-2.5 text-xs text-slate-600">{r.how}</td>
                  <td className="px-3 py-2.5"><span className={`chip whitespace-nowrap ${pill(r.status)}`}>{r.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Privacy: each person opts in; only business threads are processed; the AI provider doesn&apos;t train on the data; client rules (e.g. in-country data) are honoured before an account is connected.
        </p>
      </section>
    </div>
  );
}
