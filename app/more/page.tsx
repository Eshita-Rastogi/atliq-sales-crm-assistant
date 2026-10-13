import Link from "next/link";

const LINKS = [
  { href: "/meetings/new", label: "🎙 Record / log a meeting", sub: "Record, dictate or type right after a call — AI writes the MOM and follow-ups" },
  { href: "/leads/new", label: "+ New lead", sub: "Type it in or paste an email / card" },
  { href: "/settings/connections", label: "🔗 Connect sources", sub: "Link email, calendar, WhatsApp, forward-to address" },
  { href: "/settings/reminders", label: "⏰ Reminder settings", sub: "Digest time, reminders, escalation" },
  { href: "/updates", label: "✓ CRM review & log", sub: "Approve AI-suggested CRM changes" },
  { href: "/sources", label: "ⓘ Data sources", sub: "Where the data comes from" },
];

export default function MorePage() {
  return (
    <div className="mx-auto max-w-md space-y-3">
      <h1 className="text-2xl font-semibold text-slate-900">More</h1>
      {LINKS.map((l) => (
        <Link key={l.href} href={l.href} className="card block p-4 hover:border-indigo-300">
          <div className="font-medium text-slate-900">{l.label}</div>
          <div className="text-xs text-slate-500">{l.sub}</div>
        </Link>
      ))}
    </div>
  );
}
