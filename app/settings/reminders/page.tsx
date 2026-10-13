"use client";

import { useState } from "react";
import { DEFAULT_REMINDERS, useAppState, type ReminderSettings } from "@/components/AppState";
import { useNotifications, type Notice } from "@/components/NotificationBell";
import raw from "@/data/generated/model.json";
import type { Model } from "@/lib/types";

const model = raw as unknown as Model;
const items: Notice[] = model.radar.map((r) => ({
  id: r.signal_id, account_id: r.account_id, company: r.company, title: r.title, owner: r.owner, due_date: r.due_date, overdue: r.days_overdue,
}));

export default function ReminderSettingsPage() {
  const { owner, reminders, setReminders } = useAppState();
  const [s, setS] = useState<ReminderSettings>(reminders);
  const [saved, setSaved] = useState(false);
  const { groups } = useNotifications(items);
  const who = owner === "All" ? "the whole team" : owner;
  const upd = (patch: Partial<ReminderSettings>) => {
    setS((x) => ({ ...x, ...patch }));
    setSaved(false);
  };

  const digest = groups.filter((g) => g.key !== "reminders" && g.rows.length);
  const input = "rounded-md border border-slate-300 bg-white px-2 py-1 text-sm";

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Reminder settings</h1>
        <p className="text-sm text-slate-500">How and when the assistant nudges {who} about follow-ups. Changes apply to the 🔔 notifications immediately.</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card space-y-4 p-5">
          <h2 className="font-semibold text-slate-900">When to remind</h2>
          <label className="flex items-center justify-between gap-3 text-sm">
            <span>Daily digest of what&apos;s due<div className="text-xs text-slate-500">One summary every morning</div></span>
            <input type="time" className={input} value={s.digestTime} onChange={(e) => upd({ digestTime: e.target.value })} />
          </label>
          <label className="flex items-center justify-between gap-3 text-sm">
            <span>Remind me before a due date<div className="text-xs text-slate-500">e.g. ShopSwift SOW due 15 Jul</div></span>
            <select className={input} value={s.daysBefore} onChange={(e) => upd({ daysBefore: Number(e.target.value) })}>
              {[1, 2, 3, 5, 7].map((d) => <option key={d} value={d}>{d} day{d > 1 ? "s" : ""} before</option>)}
            </select>
          </label>
          <label className="flex items-center justify-between gap-3 text-sm">
            <span>Escalate to the founders when overdue by<div className="text-xs text-slate-500">So nothing sits with no one acting</div></span>
            <select className={input} value={s.escalateAfter} onChange={(e) => upd({ escalateAfter: Number(e.target.value) })}>
              {[1, 3, 5, 7, 14].map((d) => <option key={d} value={d}>{d} day{d > 1 ? "s" : ""}</option>)}
            </select>
          </label>

          <h2 className="pt-2 font-semibold text-slate-900">Where to remind</h2>
          {[
            { k: "inapp" as const, label: "In-app notifications (🔔)", note: "Live in this prototype", live: true },
            { k: "email" as const, label: "Email digest", note: "Planned — sent from the daily digest", live: false },
            { k: "whatsapp" as const, label: "WhatsApp message", note: "Planned — via WhatsApp Business API", live: false },
          ].map((c) => (
            <label key={c.k} className="flex items-center justify-between gap-3 text-sm">
              <span>{c.label}<div className={`text-xs ${c.live ? "text-emerald-700" : "text-slate-500"}`}>{c.note}</div></span>
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={s.channels[c.k]}
                disabled={!c.live && false}
                onChange={(e) => upd({ channels: { ...s.channels, [c.k]: e.target.checked } })}
              />
            </label>
          ))}

          <div className="flex items-center gap-2 pt-2">
            <button
              className="btn-primary px-3 py-1.5 text-sm"
              onClick={() => {
                setReminders(s);
                setSaved(true);
              }}
            >
              Save settings
            </button>
            <button className="btn" onClick={() => upd(DEFAULT_REMINDERS)}>Reset to defaults</button>
            {saved && <span className="text-xs text-emerald-700">Saved ✓</span>}
          </div>
        </section>

        <section className="card p-5">
          <h2 className="font-semibold text-slate-900">Preview: tomorrow&apos;s {s.digestTime} digest</h2>
          <p className="text-xs text-slate-500">
            What {who} would receive{s.channels.email ? " by email" : ""}{s.channels.whatsapp ? " and on WhatsApp" : ""}{!s.channels.email && !s.channels.whatsapp ? " in the app" : ""}. Uses saved settings.
          </p>
          <div className="mt-3 space-y-3 rounded-lg bg-slate-50 p-4 text-sm">
            <div className="font-medium text-slate-900">Good morning{owner && owner !== "All" ? `, ${owner}` : ""} — here&apos;s what needs you:</div>
            {digest.map((g) => (
              <div key={g.key}>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{g.label} ({g.rows.length})</div>
                <ul className="mt-1 list-disc space-y-0.5 pl-5 text-slate-700">
                  {g.rows.slice(0, 3).map((r) => <li key={r.id}>{r.company}: {r.title}</li>)}
                  {g.rows.length > 3 && <li className="list-none text-xs text-slate-500">…and {g.rows.length - 3} more</li>}
                </ul>
              </div>
            ))}
            {digest.length === 0 && <div className="text-slate-500">Nothing due — enjoy your day.</div>}
            <div className="text-xs text-slate-400">Reminders never contact clients — they only nudge the AtliQ owner.</div>
          </div>
        </section>
      </div>
    </div>
  );
}
