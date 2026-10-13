"use client";

import Link from "next/link";
import { useAppState } from "@/components/AppState";

// HAX G1/G2 — make clear what the AI can do and how well; plus the feedback log (G15).
const CAN = [
  "Read emails and meeting notes and find client asks, our promises, deadlines, revisit dates, cross-sell hints and new leads",
  "Rank what needs you today and explain why (deadline, value, days waiting)",
  "Write lead summaries, next steps, meeting minutes from your notes or recordings, and draft replies",
  "Suggest CRM updates, stage moves and missing leads, and flag possible duplicates",
];
const CANNOT = [
  "Send any email or message — drafts are copied and sent by you",
  "Change the CRM, merge records or move a deal without your approval",
  "Invent prices, dates, people or commitments — missing facts appear as [TBD] or 'not found'",
  "Predict win probability (not enough history) or read personal WhatsApp chats",
];
const ACCURACY = [
  ["Follow-ups the team dropped that the AI caught (dataset answer key)", "30 / 30 (100%)"],
  ["Founders' 5 critical deals ranked in the top 6", "5 / 5"],
  ["Leads missing from the CRM found", "5 / 5"],
  ["AI quotes that exist word-for-word in the source", "100% (others are dropped automatically)"],
  ["Key deadlines dated correctly (dates are calculated in code)", "4 / 4"],
];
const HAX: [string, string, string][] = [
  ["G1", "Make clear what the system can do", "This page; '✦ AI' labels on AI-written content"],
  ["G2", "Make clear how well it can do it", "Measured accuracy above; 'check date' flags when unsure"],
  ["G3", "Time services based on context", "Reminders before due dates, daily digest, escalation after N days"],
  ["G4", "Show contextually relevant information", "Each lead shows its own follow-ups, minutes and next step"],
  ["G5", "Match relevant social norms", "Drafts are polite and sent by you; recording asks for consent"],
  ["G6", "Mitigate social biases", "Ranking uses only deadline, value and days waiting — never who the client is"],
  ["G7", "Support efficient invocation", "+ New lead, 🎙 Record meeting, Draft reply, Ask AI — one tap"],
  ["G8", "Support efficient dismissal", "Snooze, Reject, Done on every suggestion"],
  ["G9", "Support efficient correction", "Edit any field, stage or AI value before saving"],
  ["G10", "Scope services when in doubt", "'Not found in the data', [TBD] in drafts, 'needs review' items"],
  ["G11", "Make clear why the system did what it did", "Source quote + 'Priority because…' on every item"],
  ["G12", "Remember recent interactions", "Activity log per lead; done/snoozed state kept"],
  ["G13", "Learn from user behaviour", "👍/👎 feedback log below (used to tune prompts — production)"],
  ["G14", "Update and adapt cautiously", "AI suggests; nothing changes until a person approves"],
  ["G15", "Encourage granular feedback", "👍/👎 on next steps, summaries, profiles, minutes and drafts"],
  ["G16", "Convey the consequences of user actions", "Mark-done shows the stage move before you save"],
  ["G17", "Provide global controls", "Reminder settings, channels, connect / disconnect sources"],
  ["G18", "Notify users about changes", "🔔 notifications; audit log of every approval"],
];

export default function AboutAiPage() {
  const { feedback } = useAppState();
  const votes = Object.values(feedback).sort((a, b) => b.at.localeCompare(a.at));
  const up = votes.filter((v) => v.vote === "up").length;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">How this AI works</h1>
        <p className="text-sm text-slate-500">What the assistant does, what it never does, how accurate it is, and how you stay in control. Designed with Microsoft&apos;s HAX Guidelines for Human-AI Interaction.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="card p-5">
          <h2 className="font-semibold text-emerald-700">✓ What it does</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">{CAN.map((x) => <li key={x}>{x}</li>)}</ul>
        </section>
        <section className="card p-5">
          <h2 className="font-semibold text-rose-700">✕ What it never does</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">{CANNOT.map((x) => <li key={x}>{x}</li>)}</ul>
        </section>
      </div>

      <section className="card p-5">
        <h2 className="font-semibold text-slate-900">How well it works — measured</h2>
        <p className="text-xs text-slate-500">Checked against the dataset&apos;s answer key (notes the AI never sees). Run with <code>npm run eval</code>.</p>
        <table className="mt-3 w-full text-sm">
          <tbody className="divide-y divide-slate-100">
            {ACCURACY.map(([k, v]) => (
              <tr key={k}><td className="py-2 pr-4 text-slate-700">{k}</td><td className="py-2 text-right font-semibold text-slate-900">{v}</td></tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-xs text-slate-500">It can still miss things — that&apos;s why every suggestion shows its source and you can add follow-ups yourself.</p>
      </section>

      <section className="card p-5">
        <h2 className="font-semibold text-slate-900">Your AI feedback ({votes.length})</h2>
        <p className="text-xs text-slate-500">Every 👍 / 👎 you give. In production this is reviewed weekly to improve prompts and catch weak spots.</p>
        {votes.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">No feedback yet — use 👍 / 👎 on a next step, summary, meeting minutes or draft.</p>
        ) : (
          <>
            <p className="mt-2 text-sm text-slate-700">{up} helpful · {votes.length - up} not helpful</p>
            <ul className="mt-2 divide-y divide-slate-100 text-sm">
              {votes.slice(0, 20).map((v) => (
                <li key={v.id} className="flex gap-3 py-1.5">
                  <span>{v.vote === "up" ? "👍" : "👎"}</span>
                  <span className="text-slate-800">{v.kind}</span>
                  <span className="truncate text-xs text-slate-400">{v.id.split(":").slice(1).join(":")}</span>
                  <span className="ml-auto text-xs text-slate-400">{v.by}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="card overflow-x-auto p-5">
        <h2 className="font-semibold text-slate-900">Microsoft HAX — 18 guidelines, how this app meets them</h2>
        <table className="mt-3 w-full text-sm">
          <thead className="text-left text-xs text-slate-500"><tr><th className="py-1 pr-3">#</th><th className="py-1 pr-3">Guideline</th><th className="py-1">In this app</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {HAX.map(([g, name, how]) => (
              <tr key={g}><td className="py-2 pr-3 text-xs font-semibold text-indigo-700">{g}</td><td className="py-2 pr-3 text-slate-800">{name}</td><td className="py-2 text-xs text-slate-600">{how}</td></tr>
            ))}
          </tbody>
        </table>
      </section>

      <p className="text-xs text-slate-500">
        More: <Link href="/sources" className="underline">Data sources</Link> · <Link href="/settings/connections" className="underline">Connect sources</Link> · <Link href="/settings/reminders" className="underline">Reminder settings</Link>
      </p>
    </div>
  );
}
