"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { inView, useAppState } from "./AppState";
import { OWNER_COLOR } from "@/lib/format";

interface Props {
  children: React.ReactNode;
  radar: { id: string; owner: string; overdue: number }[];
  updates: { id: string; owner: string }[];
  refDate: string;
}

const NAV = [
  { href: "/", label: "Home", icon: "⌂" },
  { href: "/follow-ups", label: "Follow-ups", icon: "🔔" },
  { href: "/leads", label: "Leads & deals", icon: "▦" },
  { href: "/ask", label: "Ask AI", icon: "✦" },
];

const PEOPLE = [
  { id: "Bhavin", role: "Co-founder" },
  { id: "Dhaval", role: "Co-founder" },
  { id: "Karandeep", role: "CEO" },
  { id: "Jay", role: "Sales executive" },
  { id: "All", role: "Founder view of everyone's deals" },
];

function WhoAreYou() {
  const { setOwner } = useAppState();
  return (
    <div className="grid min-h-screen place-items-center bg-slate-50 p-6">
      <div className="w-full max-w-2xl text-center">
        <div className="text-sm font-semibold uppercase tracking-wide text-indigo-600">AtliQ Sales &amp; CRM Assistant</div>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">Who&apos;s using the assistant?</h1>
        <p className="mt-2 text-slate-500">Pick yourself to see your deals and your follow-ups. You can switch anytime.</p>
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {PEOPLE.map((p) => (
            <button
              key={p.id}
              onClick={() => setOwner(p.id)}
              className="card flex flex-col items-center gap-2 p-4 transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md"
            >
              <span className={`grid h-12 w-12 place-items-center rounded-full text-sm font-semibold text-white ${OWNER_COLOR[p.id] || "bg-slate-800"}`}>
                {p.id === "All" ? "👥" : p.id.slice(0, 2).toUpperCase()}
              </span>
              <span className="font-medium text-slate-900">{p.id === "All" ? "Whole team" : p.id}</span>
              <span className="text-[11px] leading-tight text-slate-500">{p.role}</span>
            </button>
          ))}
        </div>
        <p className="mt-8 text-xs text-slate-400">Prototype on a synthetic dataset · “today” is 10 Jul 2026 · AI suggests, people decide.</p>
      </div>
    </div>
  );
}

export function Shell({ children, radar, updates, refDate }: Props) {
  const path = usePathname();
  const { ready, owner, setOwner, done, snoozed, decisions } = useAppState();

  if (!ready) return <div className="min-h-screen bg-slate-50" />;
  if (!owner) return <WhoAreYou />;

  const overdue = radar.filter((r) => !done[r.id] && !snoozed[r.id] && inView(owner, r.owner) && r.overdue > 0).length;
  const pending = updates.filter((u) => !decisions[u.id] && inView(owner, u.owner)).length;

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-800">
      <aside className="hidden w-52 shrink-0 flex-col bg-slate-900 text-slate-300 md:flex">
        <div className="border-b border-slate-800 px-5 py-5">
          <div className="font-semibold tracking-tight text-white">AtliQ</div>
          <div className="text-xs text-slate-400">Sales &amp; CRM Assistant</div>
        </div>
        <nav className="flex-1 py-3">
          {NAV.map((n) => {
            const active = n.href === "/" ? path === "/" : path.startsWith(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`flex items-center gap-3 border-l-2 px-5 py-2.5 text-sm ${
                  active ? "border-indigo-400 bg-slate-800 text-white" : "border-transparent hover:bg-slate-800/60"
                }`}
              >
                <span className="w-4 text-center opacity-80">{n.icon}</span>
                <span className="flex-1">{n.label}</span>
                {n.href === "/follow-ups" && overdue > 0 && (
                  <span className="rounded-full bg-rose-500 px-1.5 text-[11px] font-semibold text-white">{overdue}</span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-slate-800 px-5 py-3 text-xs">
          <Link href="/sources" className={`block py-1 ${path.startsWith("/sources") ? "text-white" : "text-slate-400 hover:text-slate-200"}`}>ⓘ Data sources</Link>
          <Link href="/updates" className={`block py-1 ${path.startsWith("/updates") ? "text-white" : "text-slate-400 hover:text-slate-200"}`}>✓ CRM review &amp; audit log</Link>
        </div>
        <div className="border-t border-slate-800 px-5 py-4 text-[11px] leading-relaxed text-slate-500">
          Data snapshot: <span className="text-slate-300">{refDate}</span>
          <br />
          AI suggests, people decide — nothing is sent or written without approval.
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur md:px-6">
          <nav className="flex gap-1 overflow-x-auto text-xs md:hidden">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="whitespace-nowrap rounded-md border border-slate-200 px-2 py-1">
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            {pending > 0 && (
              <Link href="/updates" className="hidden rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-100 sm:block" title="AI-suggested CRM changes waiting for approval">
                Review CRM updates · {pending}
              </Link>
            )}
            <Link href="/follow-ups?when=overdue" className="relative rounded-full p-2 hover:bg-slate-100" aria-label="Overdue follow-ups">
              <span className="text-lg">🔔</span>
              {overdue > 0 && (
                <span className="absolute -right-0.5 -top-0.5 rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white">{overdue}</span>
              )}
            </Link>
            <select
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
              aria-label="Switch person"
            >
              {PEOPLE.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.id === "All" ? "Whole team" : p.id}
                </option>
              ))}
            </select>
            <span className={`grid h-8 w-8 place-items-center rounded-full text-xs font-semibold text-white ${OWNER_COLOR[owner] || "bg-slate-800"}`}>
              {owner === "All" ? "👥" : owner.slice(0, 2).toUpperCase()}
            </span>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
