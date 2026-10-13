"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAppState } from "./AppState";
import { OWNER_COLOR } from "@/lib/format";

interface Props {
  children: React.ReactNode;
  radar: { id: string; owner: string; overdue: number }[];
  pendingUpdates: number;
  refDate: string;
}

const NAV = [
  { href: "/", label: "Pipeline", icon: "▦" },
  { href: "/today", label: "Today", icon: "🔔" },
  { href: "/accounts", label: "Accounts", icon: "◧" },
  { href: "/leads", label: "Lead tracking", icon: "☰" },
  { href: "/updates", label: "CRM updates", icon: "✓" },
  { href: "/ask", label: "Ask AI", icon: "✦" },
];

export function Shell({ children, radar, pendingUpdates, refDate }: Props) {
  const path = usePathname();
  const { owner, setOwner, done, snoozed, decisions } = useAppState();
  const open = radar.filter((r) => !done[r.id] && !snoozed[r.id] && (owner === "All" || r.owner === owner));
  const overdue = open.filter((r) => r.overdue > 0).length;
  const pending = Math.max(0, pendingUpdates - Object.keys(decisions).length);

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-800">
      <aside className="hidden md:flex w-56 shrink-0 flex-col bg-slate-900 text-slate-300">
        <div className="px-5 py-5 border-b border-slate-800">
          <div className="text-white font-semibold tracking-tight">AtliQ</div>
          <div className="text-xs text-slate-400">Sales &amp; CRM Assistant</div>
        </div>
        <nav className="flex-1 py-3">
          {NAV.map((n) => {
            const active = n.href === "/" ? path === "/" : path.startsWith(n.href);
            const badge = n.href === "/today" ? overdue : n.href === "/updates" ? pending : 0;
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`flex items-center gap-3 px-5 py-2.5 text-sm ${
                  active ? "bg-slate-800 text-white border-l-2 border-indigo-400" : "hover:bg-slate-800/60 border-l-2 border-transparent"
                }`}
              >
                <span className="w-4 text-center opacity-80">{n.icon}</span>
                <span className="flex-1">{n.label}</span>
                {badge > 0 && (
                  <span className={`rounded-full px-1.5 text-[11px] font-semibold ${n.href === "/today" ? "bg-rose-500 text-white" : "bg-indigo-500 text-white"}`}>
                    {badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="px-5 py-4 text-[11px] leading-relaxed text-slate-500 border-t border-slate-800">
          Prototype · data snapshot as of <span className="text-slate-300">{refDate}</span>.
          <br />AI suggests, people decide — nothing is sent or written without approval.
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-slate-200 bg-white/95 backdrop-blur px-4 md:px-6 py-3">
          <div className="md:hidden font-semibold text-slate-900">AtliQ</div>
          <nav className="md:hidden flex gap-2 overflow-x-auto text-xs">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="whitespace-nowrap rounded border border-slate-200 px-2 py-1">
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <Link href="/today" className="relative rounded-full p-2 hover:bg-slate-100" aria-label="Notifications">
              <span className="text-lg">🔔</span>
              {overdue > 0 && (
                <span title={`${overdue} overdue of ${open.length} open`} className="absolute -top-0.5 -right-0.5 rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white">
                  {overdue}
                </span>
              )}
            </Link>
            <label className="text-xs text-slate-500">Viewing as</label>
            <select
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
            >
              {["All", "Bhavin", "Dhaval", "Karandeep", "Jay"].map((o) => (
                <option key={o} value={o}>
                  {o === "All" ? "Whole team" : o}
                </option>
              ))}
            </select>
            {owner !== "All" && (
              <span className={`grid h-8 w-8 place-items-center rounded-full text-xs font-semibold text-white ${OWNER_COLOR[owner]}`}>
                {owner.slice(0, 2).toUpperCase()}
              </span>
            )}
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
