"use client";

import Link from "next/link";
import { inView, useAppState } from "./AppState";
import type { RadarItem, Stage } from "@/lib/types";
import { OWNER_COLOR, TYPE_LABEL, fmtDate, initials, money } from "@/lib/format";

export interface HomeAccount {
  id: string;
  company: string;
  owner: string;
  value: number | null;
  stage: Stage;
  in_crm: boolean;
}

const WEEK_END = "2026-07-17";

export function Home({ radar, accounts, refDate, nextSteps }: { radar: RadarItem[]; accounts: HomeAccount[]; refDate: string; nextSteps: Record<string, string> }) {
  const { owner, done, snoozed, customLeads } = useAppState();
  const who = owner === "All" ? "team" : owner;
  const open = radar.filter((r) => !done[r.signal_id] && !snoozed[r.signal_id] && inView(owner, r.owner));
  const mine = accounts.filter((a) => inView(owner, a.owner));
  const live = mine.filter((a) => !["Won", "Lost"].includes(a.stage));
  const overdue = open.filter((r) => r.days_overdue > 0);
  const week = open.filter((r) => r.days_overdue === 0 && r.due_date && r.due_date <= WEEK_END);
  const untracked = accounts.filter((a) => !a.in_crm);
  const fresh = [...mine.filter((a) => a.in_crm && a.stage === "New"), ...customLeads.filter((c) => inView(owner, c.owner))];

  const seen = new Set<string>();
  const top = open
    .filter((r) => (seen.has(r.account_id) ? false : (seen.add(r.account_id), true)))
    .slice(0, 5);

  const tiles = [
    { href: "/leads", label: "Open pipeline", value: money(live.reduce((t, a) => t + (a.value || 0), 0)), sub: `${live.length} deals in play`, tone: "text-slate-900" },
    { href: "/follow-ups?when=overdue", label: "Follow-ups overdue", value: String(overdue.length), sub: "client asks & our promises", tone: "text-rose-600" },
    { href: "/follow-ups?when=week", label: "Due this week", value: String(week.length), sub: "deadlines & follow-ups, next 7 days", tone: "text-amber-600" },
    { href: "/leads?view=list&filter=untracked", label: "New / untracked leads", value: String(untracked.length + fresh.length), sub: `${untracked.length} not in CRM · ${fresh.length} new`, tone: "text-indigo-600" },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">{owner === "All" ? "Hi team" : `Hi ${owner}`} — here&apos;s your day</h1>
        <p className="mt-1 text-sm text-slate-500">
          {refDate} · {overdue.length > 0 ? `${overdue.length} follow-ups are overdue — start with the list below.` : "You're on top of your follow-ups."}
        </p>
      </div>
      <Link href="/leads/new" className="btn-primary px-3 py-1.5 text-sm">+ New lead</Link>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((t) => (
          <Link key={t.label} href={t.href} className="card group p-5 transition hover:border-indigo-300 hover:shadow-md">
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{t.label}</div>
            <div className={`mt-2 text-3xl font-semibold ${t.tone}`}>{t.value}</div>
            <div className="mt-1 text-xs text-slate-500">{t.sub}</div>
            <div className="mt-3 text-xs font-medium text-indigo-600 opacity-0 transition group-hover:opacity-100">View →</div>
          </Link>
        ))}
      </div>

      <section>
        <div className="mb-3 flex items-end justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Top 5 actions for today</h2>
            <p className="text-xs text-slate-500">The most urgent item per deal, ranked by deadline, deal value and how long the client has waited.</p>
          </div>
          <Link href="/follow-ups" className="text-sm font-medium text-indigo-600 hover:underline">See all follow-ups →</Link>
        </div>
        <ol className="card divide-y divide-slate-100">
          {top.map((r, i) => (
            <li key={r.signal_id}>
              <Link href={`/leads/${encodeURIComponent(r.account_id)}`} className="flex items-center gap-4 px-4 py-3.5 hover:bg-slate-50">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-indigo-50 text-sm font-semibold text-indigo-700">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 text-sm">
                    <span className="font-semibold text-slate-900">{r.company}</span>
                    <span className="text-slate-400">·</span>
                    <span className="text-slate-500">{TYPE_LABEL[r.type]}</span>
                  </div>
                  <div className="line-clamp-2 text-sm text-slate-700">{nextSteps[r.account_id] || r.title}</div>
                </div>
                <div className="hidden text-right text-xs sm:block">
                  {r.days_overdue > 0 ? (
                    <span className="font-medium text-rose-600">Overdue {r.days_overdue}d</span>
                  ) : r.due_date ? (
                    <span className="font-medium text-amber-600">Due {fmtDate(r.due_date)}</span>
                  ) : null}
                  <div className="text-slate-400">{r.value_usd ? money(r.value_usd) : "value unknown"}</div>
                </div>
                {owner === "All" && (
                  <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[10px] font-semibold text-white ${OWNER_COLOR[r.owner] || "bg-slate-400"}`} title={r.owner}>
                    {r.owner === "Unassigned" ? "?" : initials(r.owner)}
                  </span>
                )}
                <span className="text-slate-300">›</span>
              </Link>
            </li>
          ))}
          {top.length === 0 && <li className="px-4 py-6 text-center text-sm text-slate-500">Nothing urgent for the {who}. 🎉</li>}
        </ol>
      </section>
    </div>
  );
}
