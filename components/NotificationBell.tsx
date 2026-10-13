"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { inView, useAppState } from "./AppState";
import { addDays, iso, toDate } from "@/lib/dates";
import { fmtDate } from "@/lib/format";

export interface Notice {
  id: string;
  account_id: string;
  company: string;
  title: string;
  owner: string;
  due_date: string | null;
  overdue: number;
}

const TODAY = "2026-07-10";

const leadHref = (id: string) => (id.startsWith("added-") ? `/leads/added?id=${id}` : `/leads/${encodeURIComponent(id)}`);

/** Build the notification groups from open items and the person's reminder settings. */
export function useNotifications(items: Notice[]) {
  const { owner, done, snoozed, reminders, customItems, remindAt } = useAppState();
  const all: Notice[] = [
    ...customItems.map((c) => ({ id: c.signal_id, account_id: c.account_id, company: c.company, title: c.title, owner: c.owner, due_date: c.due_date, overdue: 0 })),
    ...items,
  ];
  const open = all.filter((r) => !done[r.id] && !snoozed[r.id] && inView(owner, r.owner));
  const soon = iso(addDays(toDate(TODAY), reminders.daysBefore));
  const groups = [
    { key: "escalated", label: `Escalated — overdue more than ${reminders.escalateAfter} days`, tone: "text-rose-700", rows: open.filter((r) => r.overdue > reminders.escalateAfter) },
    { key: "overdue", label: "Overdue", tone: "text-rose-600", rows: open.filter((r) => r.overdue > 0 && r.overdue <= reminders.escalateAfter) },
    { key: "today", label: "Due today", tone: "text-amber-600", rows: open.filter((r) => r.overdue === 0 && r.due_date === TODAY) },
    { key: "soon", label: `Due in the next ${reminders.daysBefore} days`, tone: "text-amber-600", rows: open.filter((r) => r.overdue === 0 && !!r.due_date && r.due_date > TODAY && r.due_date <= soon) },
    {
      key: "reminders",
      label: "Your reminders",
      tone: "text-indigo-600",
      rows: all.filter((r) => (snoozed[r.id] || remindAt[r.id]) && !done[r.id] && inView(owner, r.owner)),
    },
  ];
  const count = groups.slice(0, 4).reduce((t, g) => t + g.rows.length, 0);
  const when = (id: string) => remindAt[id] || snoozed[id] || "";
  return { groups, count, snoozed, when };
}

export function NotificationBell({ items }: { items: Notice[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { groups, count, when } = useNotifications(items);

  useEffect(() => {
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)} className="relative rounded-full p-2 hover:bg-slate-100" aria-label="Notifications">
        <span className="text-lg">🔔</span>
        {count > 0 && <span className="absolute -right-0.5 -top-0.5 rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white">{count}</span>}
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 w-96 max-w-[90vw] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div className="font-semibold text-slate-900">Notifications</div>
            <Link href="/settings/reminders" onClick={() => setOpen(false)} className="text-xs text-indigo-600 hover:underline">⚙ Reminder settings</Link>
          </div>
          <div className="max-h-[60vh] overflow-y-auto">
            {groups.map((g) =>
              g.rows.length ? (
                <div key={g.key} className="border-b border-slate-100 py-2">
                  <div className={`px-4 pb-1 text-[11px] font-semibold uppercase tracking-wide ${g.tone}`}>{g.label} ({g.rows.length})</div>
                  {g.rows.slice(0, 6).map((r) => (
                    <Link key={r.id} href={leadHref(r.account_id)} onClick={() => setOpen(false)} className="block px-4 py-1.5 hover:bg-slate-50">
                      <div className="truncate text-sm text-slate-800">{r.title}</div>
                      <div className="text-xs text-slate-500">
                        {r.company} ·{" "}
                        {g.key === "reminders" ? `reminder ${fmtDate(when(r.id).slice(0, 10))}` : r.overdue > 0 ? `overdue ${r.overdue}d` : r.due_date ? `due ${fmtDate(r.due_date)}` : ""}
                      </div>
                    </Link>
                  ))}
                  {g.rows.length > 6 && (
                    <Link href="/follow-ups" onClick={() => setOpen(false)} className="block px-4 py-1 text-xs text-indigo-600 hover:underline">+{g.rows.length - 6} more in Follow-ups</Link>
                  )}
                </div>
              ) : null,
            )}
            {count === 0 && <div className="px-4 py-6 text-center text-sm text-slate-500">You&apos;re all caught up.</div>}
          </div>
          <Link href="/follow-ups" onClick={() => setOpen(false)} className="block bg-slate-50 px-4 py-2 text-center text-xs font-medium text-indigo-700 hover:bg-slate-100">Open all follow-ups →</Link>
        </div>
      )}
    </div>
  );
}
