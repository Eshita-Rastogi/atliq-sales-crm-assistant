"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAppState } from "./AppState";

interface Source {
  key: string;
  name: string;
  icon: string;
  tag: string;
  reads: string[];
  never: string[];
  steps: string[];
  permissions: string[];
  note?: string;
  live?: boolean; // works in the prototype today
  href?: string; // where to try it
  cta?: string;
}

const SOURCES: Source[] = [
  {
    key: "recorder",
    name: "Meeting recorder (phone or laptop mic)",
    icon: "🎙",
    tag: "In-person meetings & debriefs",
    reads: ["Audio you record in the app, or a voice memo you upload", "Transcribed with Whisper, then turned into a MOM + follow-ups"],
    never: ["Records without you pressing Start", "Keeps the audio — only the transcript and MOM are saved"],
    steps: [
      "Open 📝 Log meeting (Home, a lead page, or More on your phone) and pick the lead.",
      "Tell everyone the meeting is recorded, tick the consent box, tap ● Start recording.",
      "Tap ■ Stop → the audio is transcribed → ✦ Create minutes & follow-ups → Save to the lead.",
      "Try it now with ▶ Try the demo recording (a GreenGrid debrief).",
    ],
    permissions: ["Microphone — asked by your browser when you tap Start"],
    note: "Prototype limit ~10–15 minutes per recording. Online meetings: the production note-taker joins Zoom / Meet / Teams when you invite it to the calendar event.",
    live: true,
    href: "/meetings/new",
    cta: "Open meeting recorder",
  },
  {
    key: "callin",
    name: "Call the AI into a phone call",
    icon: "📞",
    tag: "Phone calls · one device",
    reads: ["The audio of calls you merge it into", "Caller number, time and duration"],
    never: ["Joins a call unless you add it", "Stays on silently — it announces itself to everyone on the call"],
    steps: [
      "During a client call, tap Add call and dial the AtliQ note-taker number (saved as a contact).",
      "Tap Merge — the AI joins and says 'This call is being recorded by AtliQ's assistant'.",
      "Hang up as usual — the minutes and follow-ups appear on the lead (matched by the client's number).",
    ],
    permissions: ["None on your phone — it's a normal 3-way call"],
    note: "Planned for production (telephony service with call recording). Works with a single phone, Android or iPhone.",
  },
  {
    key: "notetaker",
    name: "AI note-taker for Zoom / Meet / Teams",
    icon: "🤖",
    tag: "Online meetings",
    reads: ["Audio and transcript of meetings it is invited to", "Meeting title, time and attendees"],
    never: ["Joins meetings it isn't invited to", "Records internal meetings unless invited"],
    steps: [
      "Add notetaker@atliq.com to the client meeting invite (or turn on 'auto-join client meetings').",
      "The bot joins as 'AtliQ Notetaker' and announces it is recording.",
      "After the call, the MOM and follow-ups appear on the lead and you get a notification to review them.",
    ],
    permissions: ["Calendar access to see invites it's added to", "Meeting platform permission to join and record"],
    note: "Planned for production — uses a meeting-bot service plus the calendar connection.",
  },
  {
    key: "gmail",
    name: "Gmail / Google Workspace",
    icon: "✉",
    tag: "Email",
    reads: ["Threads with people outside @atliq.com", "Sender, recipients, date, subject and body text"],
    never: ["Sends, deletes or labels any email", "Internal-only threads (marked skip)", "Attachments (V1)"],
    steps: [
      "Click Connect and sign in with your @atliq.com Google account.",
      "Review the permission screen (read-only) and click Allow.",
      "Choose what to include: all client threads, or only threads with leads in the CRM.",
      "The last 90 days are imported once; new emails are processed within a few minutes.",
    ],
    permissions: ["See your email messages (read-only) — gmail.readonly", "See your basic profile (name, email)"],
    note: "Google Workspace admins can approve the app once for the whole team.",
  },
  {
    key: "outlook",
    name: "Outlook / Microsoft 365",
    icon: "✉",
    tag: "Email",
    reads: ["Client threads in your mailbox", "Sender, recipients, date, subject and body text"],
    never: ["Sends, moves or deletes mail", "Personal folders you exclude"],
    steps: [
      "Click Connect and sign in with your Microsoft work account.",
      "Approve read-only mail access (Mail.Read) on the Microsoft consent screen.",
      "Pick folders to include (default: Inbox and Sent).",
      "History of 90 days is imported; new mail syncs continuously.",
    ],
    permissions: ["Read your mail — Mail.Read", "Sign you in and read your profile — User.Read"],
  },
  {
    key: "calendar",
    name: "Google / Outlook Calendar",
    icon: "📅",
    tag: "Meetings",
    reads: ["Meetings with external attendees", "Title, time and attendee emails"],
    never: ["Creates, edits or declines events", "Private event details"],
    steps: [
      "Connect with the same Google or Microsoft account.",
      "Approve read-only calendar access.",
      "After each client meeting you get a nudge: “Log the MOM for GreenGrid?” with attendees pre-filled.",
    ],
    permissions: ["See your calendar events (read-only)"],
  },
  {
    key: "notes",
    name: "Meeting notes & call transcripts",
    icon: "📝",
    tag: "MOMs",
    reads: ["Notes in a shared “Client meetings” folder", "Zoom / Teams transcripts after client calls"],
    never: ["Recordings themselves (only the text)", "Internal meetings unless tagged"],
    steps: [
      "Connect Google Drive / OneDrive and choose the folder where MOMs are kept, or",
      "connect Zoom / Teams and allow transcript access for external meetings.",
      "New notes are read automatically; budgets, decision-makers and action items are extracted.",
    ],
    permissions: ["Read files in the selected folder only", "Read meeting transcripts (Zoom / Teams)"],
  },
  {
    key: "whatsapp",
    name: "WhatsApp",
    icon: "💬",
    tag: "Messages",
    reads: ["Chats on the WhatsApp Business number", "Chats or voice notes you forward"],
    never: ["Personal WhatsApp chats — WhatsApp does not allow third-party access to them"],
    steps: [
      "Option A — Business number: AtliQ connects its WhatsApp Business account via the official Business API (one-time setup by an admin).",
      "Option B — Personal chats: long-press a client chat → Export chat (or forward a voice note) → send it to the AtliQ assistant number or your forward-to address.",
      "The assistant transcribes voice notes and extracts the follow-ups.",
    ],
    permissions: ["WhatsApp Business API access (admin)"],
    note: "Personal WhatsApp can only be shared by forwarding — that is a WhatsApp rule, not ours.",
  },
  {
    key: "forward",
    name: "Forward-to address",
    icon: "↪",
    tag: "Anything",
    reads: ["Anything you forward or BCC: emails, notes, chat exports"],
    never: ["Nothing else — only what you choose to send"],
    steps: [
      "Copy your personal address below.",
      "Forward any client email to it, or BCC it when you reply from your phone.",
      "It appears in the assistant within a minute, linked to the right lead.",
    ],
    permissions: ["None — no account access needed"],
    note: "Works from any phone or email app, with zero setup. Best quick win.",
  },
  {
    key: "capture",
    name: "Paste or scan (business cards, notes)",
    icon: "📇",
    tag: "Quick capture",
    reads: ["Text you paste: emails, call notes, business-card text"],
    never: ["Anything you don't paste"],
    steps: ["Open + New lead.", "Paste the text (or the card's text from your phone camera).", "The AI fills the form and finds follow-ups; you review and save."],
    permissions: ["None"],
    live: true,
  },
  {
    key: "linkedin",
    name: "LinkedIn",
    icon: "in",
    tag: "Social",
    reads: ["Messages you forward or paste from LinkedIn"],
    never: ["Your LinkedIn inbox directly — LinkedIn doesn't offer that access to third-party tools"],
    steps: ["Copy the message text or forward the notification email to your forward-to address.", "Or paste it into + New lead."],
    permissions: ["None"],
  },
];

export function Connections() {
  const { owner } = useAppState();
  const person = owner && owner !== "All" ? owner : "you";
  const handle = owner && owner !== "All" ? owner.toLowerCase() : "team";
  const forward = `crm+${handle}@atliq.com`;
  const [status, setStatus] = useState<Record<string, string>>({});
  const [consent, setConsent] = useState<Source | null>(null);
  const [copied, setCopied] = useState(false);
  const KEY = `atliq-connections-${handle}`;

  useEffect(() => {
    try {
      setStatus(JSON.parse(localStorage.getItem(KEY) || "{}"));
    } catch {}
  }, [KEY]);
  const save = (s: Record<string, string>) => {
    setStatus(s);
    try {
      localStorage.setItem(KEY, JSON.stringify(s));
    } catch {}
  };

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Connect your sources</h1>
        <p className="text-sm text-slate-500">
          Link the places where {person === "you" ? "your" : `${person}'s`} client conversations happen, so leads, follow-ups and meeting notes reach the assistant without anyone typing them into the CRM.
        </p>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <b>Prototype note:</b> “Connect” below walks through the real steps and permission screen but is a <b>simulation</b> — no account is accessed. The data you see comes from the
        capstone dataset (<Link href="/sources" className="underline">Data sources</Link>). Paste capture in <Link href="/leads/new" className="underline">+ New lead</Link> works for real today.
      </div>

      <div className="card flex flex-wrap items-center gap-3 border-indigo-200 bg-indigo-50/50 p-4">
        <div className="text-2xl">↪</div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-indigo-900">Your personal forward-to address</div>
          <div className="text-xs text-slate-600">Forward or BCC any client email, note or chat export — no setup needed.</div>
        </div>
        <code className="rounded-md bg-white px-3 py-1.5 text-sm ring-1 ring-indigo-200">{forward}</code>
        <button
          className="btn"
          onClick={() => {
            navigator.clipboard.writeText(forward);
            setCopied(true);
          }}
        >
          {copied ? "Copied ✓" : "Copy"}
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {SOURCES.map((s) => {
          const st = s.live ? "live" : status[s.key];
          return (
            <section key={s.key} className="card flex flex-col p-4">
              <div className="flex items-start gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-sm font-semibold text-slate-700">{s.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-slate-900">{s.name}</div>
                  <div className="text-xs text-slate-500">{s.tag}</div>
                </div>
                {st === "live" ? (
                  <span className="chip border-emerald-200 bg-emerald-50 text-emerald-700">Works today</span>
                ) : st ? (
                  <span className="chip border-indigo-200 bg-indigo-50 text-indigo-700">Connected (demo)</span>
                ) : (
                  <span className="chip border-slate-200 bg-slate-50 text-slate-500">Not connected</span>
                )}
              </div>

              <div className="mt-3 grid gap-3 text-xs sm:grid-cols-2">
                <div>
                  <div className="font-medium text-emerald-700">Reads</div>
                  <ul className="mt-1 list-disc space-y-0.5 pl-4 text-slate-600">{s.reads.map((x) => <li key={x}>{x}</li>)}</ul>
                </div>
                <div>
                  <div className="font-medium text-rose-700">Never</div>
                  <ul className="mt-1 list-disc space-y-0.5 pl-4 text-slate-600">{s.never.map((x) => <li key={x}>{x}</li>)}</ul>
                </div>
              </div>

              <details className="mt-3 text-xs text-slate-700">
                <summary className="cursor-pointer font-medium text-indigo-700">How to link it</summary>
                <ol className="mt-2 list-decimal space-y-1 pl-4">{s.steps.map((x) => <li key={x}>{x}</li>)}</ol>
              </details>
              {s.note && <p className="mt-2 text-[11px] text-slate-500">{s.note}</p>}

              <div className="mt-auto flex justify-end gap-2 pt-3">
                {s.live ? (
                  <Link href={s.href || "/leads/new"} className="btn-primary">{s.cta || "Open + New lead"}</Link>
                ) : s.key === "forward" ? (
                  <span className="text-xs text-slate-500">Use the address above</span>
                ) : st ? (
                  <button className="btn" onClick={() => save(Object.fromEntries(Object.entries(status).filter(([k]) => k !== s.key)))}>Disconnect</button>
                ) : (
                  <button className="btn-primary" onClick={() => setConsent(s)}>Connect</button>
                )}
              </div>
            </section>
          );
        })}
      </div>

      <section className="card p-4 text-xs leading-relaxed text-slate-600">
        <b className="text-slate-800">Privacy & control.</b> Each person opts in and can disconnect at any time. Only conversations with people outside AtliQ are processed; read-only access;
        nothing is ever sent from your account. Client rules are honoured before an account is connected (e.g. FinEdge&apos;s in-country data, NovaPharma&apos;s NDA). The AI provider does not train on the data.
      </section>

      {consent && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4" onClick={() => setConsent(null)}>
          <div className="w-full max-w-md card p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Permission request (simulated)</div>
            <h3 className="mt-1 text-lg font-semibold text-slate-900">AtliQ Sales Assistant wants to access your {consent.name}</h3>
            <p className="mt-2 text-sm text-slate-600">This will allow the assistant to:</p>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-700">{consent.permissions.map((p) => <li key={p}>{p}</li>)}</ul>
            <p className="mt-3 text-sm text-slate-600">It will <b>not</b>:</p>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-700">{consent.never.map((p) => <li key={p}>{p}</li>)}</ul>
            <p className="mt-3 rounded bg-amber-50 px-2 py-1.5 text-xs text-amber-800">Prototype: no real sign-in happens and no account is accessed.</p>
            <div className="mt-4 flex justify-end gap-2">
              <button className="btn" onClick={() => setConsent(null)}>Cancel</button>
              <button
                className="btn-primary"
                onClick={() => {
                  save({ ...status, [consent.key]: new Date().toISOString() });
                  setConsent(null);
                }}
              >
                Allow (demo)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
