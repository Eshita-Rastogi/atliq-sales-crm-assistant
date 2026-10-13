"use client";

import Link from "next/link";
import { inView, useAppState } from "./AppState";
import { STAGES, type RadarItem, type Stage } from "@/lib/types";
import { completeness } from "@/lib/stage";
import { OWNER_COLOR, STAGE_BAR, TYPE_LABEL, fmtDate, initials, money } from "@/lib/format";

export interface HomeAccount {
  id: string;
  company: string;
  owner: string;
  value: number | null;
  stage: Stage;
  in_crm: boolean;
  fields: Record<string, string>;
}

const WEEK_END = "2026-07-17";

export function Home({ radar, accounts: baseAccounts, refDate, nextSteps }: { radar: RadarItem[]; accounts: HomeAccount[]; refDate: string; nextSteps: Record<string, string> }) {
  const { owner, done, snoozed, customLeads, leadEdits } = useAppState();
  let accounts = baseAccounts;
  // Apply stage moves and edits made in the app
  accounts = accounts.map((a) => {
    const e = leadEdits[a.id];
    const fields = { ...a.fields, ...(e?.fields || {}) };
    return { ...a, stage: (e?.stage as Stage) || a.stage, owner: fields.owner ?? a.owner, value: fields.est_value_usd ? Number(fields.est_value_usd) : a.value, fields };
  });
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

  const myAdded = customLeads.filter((c) => inView(owner, c.owner));
  const sum = (xs: { value: number | null }[]) => xs.reduce((t, a) => t + (a.value || 0), 0);
  const won = mine.filter((a) => a.stage === "Won");
  const lost = mine.filter((a) => a.stage === "Lost");
  const openDeals = [...live, ...myAdded.map((c) => ({ value: c.value }))];
  const total = mine.length + myAdded.length;
  const winRate = won.length + lost.length ? Math.round((100 * won.length) / (won.length + lost.length)) : 0;
  const byStage = STAGES.map((s) => ({ s, n: mine.filter((a) => a.stage === s).length + (s === "New" ? myAdded.length : 0) })).filter((x) => x.n);

  const overview = [
    { label: "Total leads", value: String(total), sub: "in your pipeline", href: "/leads", tone: "text-slate-900" },
    { label: "Open — yet to close", value: String(openDeals.length), sub: `${money(sum(openDeals))} in play`, href: "/leads?filter=active", tone: "text-indigo-700" },
    { label: "Closed won", value: String(won.length), sub: `${money(sum(won))} revenue won`, href: "/leads?view=list", tone: "text-emerald-600" },
    { label: "Closed lost", value: String(lost.length), sub: `${money(sum(lost))} lost`, href: "/leads?view=list", tone: "text-rose-600" },
    { label: "Win rate", value: `${winRate}%`, sub: "won ÷ (won + lost)", href: "/leads?view=list", tone: "text-slate-900" },
  ];

  const incomplete = mine.filter((a) => a.in_crm && !["Won", "Lost"].includes(a.stage) && completeness(a.fields).pct < 70);
  const tiles = [
    { href: "/follow-ups?when=overdue", label: "Follow-ups overdue", value: String(overdue.length), sub: "client asks & our promises", tone: "text-rose-600" },
    { href: "/follow-ups?when=week", label: "Due this week", value: String(week.length), sub: "deadlines & follow-ups, next 7 days", tone: "text-amber-600" },
    { href: "/leads?view=list&filter=untracked", label: "New / untracked leads", value: String(untracked.length + fresh.length), sub: `${untracked.length} not in CRM · ${fresh.length} new`, tone: "text-indigo-600" },
    { href: "/leads?view=list&filter=incomplete", label: "Incomplete lead profiles", value: String(incomplete.length), sub: "open deals missing key details", tone: "text-slate-700" },
  ];

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">{owner === "All" ? "Hi team" : `Hi ${owner}`} — here&apos;s your day</h1>
        <p className="mt-1 text-sm text-slate-500">
          {refDate} · {overdue.length > 0 ? `${overdue.length} follow-ups are overdue — start with the list below.` : "You're on top of your follow-ups."}
        </p>
      </div>
      <div className="flex gap-2">
        <Link href="/meetings/new" className="btn px-3 py-1.5 text-sm">📝 Log meeting</Link>
        <Link href="/leads/new" className="btn-primary px-3 py-1.5 text-sm">+ New lead</Link>
      </div>
      </div>

      <section className="order-3 md:order-none">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Sales overview</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {overview.map((t) => (
            <Link key={t.label} href={t.href} className="card p-4 transition hover:border-indigo-300 hover:shadow-md">
              <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{t.label}</div>
              <div className={`mt-1 text-2xl font-semibold ${t.tone}`}>{t.value}</div>
              <div className="text-xs text-slate-500">{t.sub}</div>
            </Link>
          ))}
        </div>
        <div className="card mt-3 p-4">
          <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
            <span className="font-medium text-slate-700">Deals by stage</span>
            <Link href="/leads" className="text-indigo-600 hover:underline">Open stage board →</Link>
          </div>
          <div className="flex h-3 overflow-hidden rounded-full bg-slate-100">
            {byStage.map((x) => (
              <div key={x.s} className={STAGE_BAR[x.s]} style={{ width: `${(100 * x.n) / Math.max(1, total)}%` }} title={`${x.s}: ${x.n}`} />
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
            {byStage.map((x) => (
              <span key={x.s} className="flex items-center gap-1.5"><span className={`h-2 w-2 rounded-full ${STAGE_BAR[x.s]}`} />{x.s} <b>{x.n}</b></span>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-slate-400">Revenue uses the estimated deal values in the CRM; stages are the real stage from emails and meetings.</p>
        </div>
      </section>

      <section className="order-1 md:order-none">
      <h2 className="mb-3 text-lg font-semibold text-slate-900">Needs your attention</h2>
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
      </section>

      <section className="order-2 md:order-none">
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
