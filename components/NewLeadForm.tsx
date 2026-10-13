"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useAppState } from "./AppState";
import { findDuplicates, type Existing } from "@/lib/match";
import type { RadarItem } from "@/lib/types";
import { fmtDate } from "@/lib/format";

interface FollowUp {
  title: string;
  quote: string;
  due_date: string | null;
  due_reason: string;
  needs_review: boolean;
}

const SOURCES = ["Referral", "LinkedIn", "Conference", "Website", "Cold Outreach", "Existing client"];
const SERVICES = ["Power BI Dashboards", "Data Engineering", "AI/ML Solutions", "Custom Web App", "Staff Augmentation"];
const SAMPLE = `From: Anil Mehra <anil.mehra@brightpath-logistics.in>
To: Jay <jay@atliq.com>
Subject: Fleet dashboards — met you at the Logistics Expo

Hi Jay, good meeting you at the expo yesterday. We run 140 trucks across 6 hubs and our fuel and on-time reports are all Excel. Could you send a rough proposal for Power BI dashboards by 24 July? Budget is around 20k for phase 1.
Anil`;

export function NewLeadForm({ existing }: { existing: Existing[] }) {
  const router = useRouter();
  const { owner, customLeads, addLead } = useAppState();
  const [paste, setPaste] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [summary, setSummary] = useState("");
  const [follow, setFollow] = useState<FollowUp[]>([]);
  const [confirmDup, setConfirmDup] = useState(false);
  const [f, setF] = useState({
    company: "",
    contact_name: "",
    contact_email: "",
    source: "",
    service: "",
    value: "",
    owner: owner && owner !== "All" ? owner : "",
    notes: "",
  });
  const set = (k: keyof typeof f, v: string) => {
    setF((x) => ({ ...x, [k]: v }));
    if (k === "company" || k === "contact_email") setConfirmDup(false);
  };

  const all = useMemo(
    () => [...existing, ...customLeads.map((c) => ({ id: c.id, company: c.company, email: c.contact_email, owner: c.owner }))],
    [existing, customLeads],
  );
  const dupes = f.company || f.contact_email ? findDuplicates(f.company, f.contact_email, all) : [];

  async function capture() {
    if (paste.trim().length < 20) {
      setErr("Paste an email, a meeting note or business-card text first.");
      return;
    }
    setErr("");
    setBusy(true);
    try {
      const r = await fetch("/api/capture", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: paste }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Capture failed");
      setF((x) => ({
        ...x,
        company: j.company || x.company,
        contact_name: j.contact_name || x.contact_name,
        contact_email: j.contact_email || x.contact_email,
        source: j.source || x.source,
        service: j.service || x.service,
        value: j.value_usd != null ? String(j.value_usd) : x.value,
        owner: j.owner || x.owner,
        notes: j.summary || x.notes,
      }));
      setSummary(j.summary || "");
      setFollow(j.follow_ups || []);
      setConfirmDup(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Capture failed");
    } finally {
      setBusy(false);
    }
  }

  function save() {
    if (!f.company.trim()) {
      setErr("Company name is required.");
      return;
    }
    if (dupes.length && !confirmDup) {
      setErr("This looks like an existing lead — open it instead, or confirm it's a separate opportunity.");
      return;
    }
    const id = `added-${Date.now()}`;
    const leadOwner = f.owner || (owner && owner !== "All" ? owner : "");
    const items: RadarItem[] = follow.map((x, i) => ({
      signal_id: `${id}#${i}`,
      account_id: id,
      company: f.company,
      owner: leadOwner || "Unassigned",
      type: "client_ask",
      title: x.title,
      quote: x.quote,
      doc_id: "",
      due_date: x.due_date,
      days_overdue: 0,
      days_waiting: 0,
      value_usd: f.value ? Number(f.value) : null,
      score: 60,
      reason: "Added from captured text",
      needs_review: x.needs_review,
    }));
    addLead(
      {
        id,
        company: f.company.trim(),
        contact_name: f.contact_name,
        contact_email: f.contact_email,
        source: f.source,
        service: f.service,
        value: f.value ? Number(f.value) : null,
        owner: leadOwner,
        notes: f.notes,
        created_at: new Date().toISOString(),
        created_by: owner === "All" || !owner ? "Founder" : owner,
      },
      items,
    );
    router.push("/leads?view=list&filter=untracked");
  }

  const input = "w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm";

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div>
        <div className="text-xs text-slate-500"><Link href="/leads" className="hover:underline">Leads &amp; deals</Link> / New lead</div>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">Add a new lead</h1>
        <p className="text-sm text-slate-500">Paste an email, a meeting note or the text from a business card and let the AI fill the form — or type it in. Duplicates are checked before saving.</p>
      </div>

      <section className="card border-indigo-200 bg-indigo-50/40 p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-indigo-900">✦ Quick capture with AI</h2>
          <button className="text-xs text-indigo-700 underline" onClick={() => setPaste(SAMPLE)}>Use a sample email</button>
        </div>
        <textarea
          value={paste}
          onChange={(e) => {
            setPaste(e.target.value);
            setErr("");
          }}
          rows={6}
          placeholder="Paste an email thread, your notes from a call, or business-card text…"
          className="mt-2 w-full rounded-md border border-slate-300 bg-white p-2.5 text-sm"
        />
        <div className="mt-2 flex items-center gap-3">
          <button className="btn-primary" onClick={capture} disabled={busy}>{busy ? "Reading…" : "Fill the form from this text"}</button>
          <span className="text-xs text-slate-500">Only facts found in the text are used — anything missing stays blank.</span>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-3">
        <section className="card space-y-3 p-4 lg:col-span-2">
          <h2 className="font-semibold text-slate-900">Lead details</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs text-slate-600">Company *<input className={input} value={f.company} onChange={(e) => set("company", e.target.value)} /></label>
            <label className="text-xs text-slate-600">Contact name<input className={input} value={f.contact_name} onChange={(e) => set("contact_name", e.target.value)} /></label>
            <label className="text-xs text-slate-600">Contact email<input className={input} value={f.contact_email} onChange={(e) => set("contact_email", e.target.value)} /></label>
            <label className="text-xs text-slate-600">Source
              <select className={input} value={f.source} onChange={(e) => set("source", e.target.value)}>
                <option value="">—</option>{SOURCES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </label>
            <label className="text-xs text-slate-600">Service interest
              <select className={input} value={f.service} onChange={(e) => set("service", e.target.value)}>
                <option value="">—</option>{SERVICES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </label>
            <label className="text-xs text-slate-600">Estimated value (USD)<input className={input} inputMode="numeric" value={f.value} onChange={(e) => set("value", e.target.value.replace(/[^\d]/g, ""))} /></label>
            <label className="text-xs text-slate-600">Owner
              <select className={input} value={f.owner} onChange={(e) => set("owner", e.target.value)}>
                <option value="">Unassigned</option>{["Bhavin", "Dhaval", "Karandeep", "Jay"].map((s) => <option key={s}>{s}</option>)}
              </select>
            </label>
          </div>
          <label className="block text-xs text-slate-600">Notes<textarea className={input} rows={2} value={f.notes} onChange={(e) => set("notes", e.target.value)} /></label>
          {summary && <p className="text-xs text-slate-500">AI summary: {summary}</p>}
        </section>

        <section className="space-y-3">
          <div className={`card p-4 ${dupes.length ? "border-orange-300 bg-orange-50" : ""}`}>
            <h2 className="font-semibold text-slate-900">Duplicate check</h2>
            {dupes.length === 0 ? (
              <p className="mt-1 text-sm text-slate-500">{f.company || f.contact_email ? "✓ No existing lead matches." : "Starts when you enter a company or email."}</p>
            ) : (
              <>
                <p className="mt-1 text-sm text-orange-800">Possible existing lead{dupes.length > 1 ? "s" : ""}:</p>
                <ul className="mt-2 space-y-1.5">
                  {dupes.map((d) => (
                    <li key={d.id} className="text-sm">
                      {d.id.startsWith("added-") ? <b>{d.company}</b> : <Link href={`/leads/${encodeURIComponent(d.id)}`} className="font-medium text-indigo-700 underline">{d.company}</Link>}
                      <span className="text-xs text-slate-500"> · {d.owner || "no owner"} · {d.reasons.join(", ")}</span>
                    </li>
                  ))}
                </ul>
                <label className="mt-3 flex items-start gap-2 text-xs text-slate-700">
                  <input type="checkbox" checked={confirmDup} onChange={(e) => setConfirmDup(e.target.checked)} className="mt-0.5" />
                  It&apos;s a separate opportunity — save anyway
                </label>
              </>
            )}
          </div>

          <div className="card p-4">
            <h2 className="font-semibold text-slate-900">Follow-ups found ({follow.length})</h2>
            {follow.length === 0 ? (
              <p className="mt-1 text-sm text-slate-500">Use quick capture to pull follow-ups from the text.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {follow.map((x, i) => (
                  <li key={i} className="text-sm">
                    <div className="font-medium text-slate-800">{x.title}</div>
                    <div className="text-xs text-amber-700">{x.due_date ? `Due ${fmtDate(x.due_date)}` : "No date"}{x.needs_review ? " · check date" : ""}</div>
                    <blockquote className="quote mt-1">“{x.quote}”</blockquote>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>

      {err && <div className="text-[13px] text-rose-600">{err}</div>}
      <div className="flex justify-end gap-2">
        <Link href="/leads" className="btn">Cancel</Link>
        <button className="btn-primary" onClick={save}>Save lead{follow.length ? ` + ${follow.length} follow-up${follow.length > 1 ? "s" : ""}` : ""}</button>
      </div>
      <p className="text-right text-[11px] text-slate-400">Prototype: saved in this browser and logged in the audit log. In production this writes to the CRM.</p>
    </div>
  );
}
