"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useAppState } from "@/components/AppState";
import { FollowUpRow } from "@/components/FollowUpRow";
import { money } from "@/lib/format";

function AddedLead() {
  const id = useSearchParams().get("id");
  const { customLeads, customItems } = useAppState();
  const lead = customLeads.find((c) => c.id === id);
  if (!lead) return <div className="card p-6 text-sm text-slate-500">This lead isn&apos;t in this browser. <Link href="/leads" className="text-indigo-600 underline">Back to leads</Link></div>;
  const items = customItems.filter((i) => i.account_id === lead.id);
  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="text-xs text-slate-500"><Link href="/leads" className="hover:underline">Leads &amp; deals</Link> / {lead.company}</div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{lead.company}</h1>
          <div className="mt-1 text-sm text-slate-500">{lead.contact_name || "Contact unknown"}{lead.contact_email && <> · {lead.contact_email}</>} · {lead.source || "source not set"}</div>
          <div className="mt-2 text-xs font-medium text-emerald-700">Added in the app by {lead.created_by} · {new Date(lead.created_at).toLocaleString()}</div>
        </div>
        <div className="flex gap-6 text-sm">
          <div><div className="text-xs text-slate-500">Value</div><div className="text-lg font-semibold">{money(lead.value)}</div></div>
          <div><div className="text-xs text-slate-500">Owner</div><div className="font-medium">{lead.owner || "Unassigned"}</div></div>
          <div><div className="text-xs text-slate-500">Stage</div><div className="font-medium">New</div></div>
        </div>
      </div>
      <section className="card p-5">
        <h2 className="mb-2 font-semibold text-slate-900">About this lead</h2>
        <p className="text-sm text-slate-700">{lead.notes || "No notes yet."}</p>
        <p className="mt-1 text-xs text-slate-500">Service interest: {lead.service || "not set"}</p>
      </section>
      <section className="card p-5">
        <h2 className="mb-2 font-semibold text-slate-900">Open follow-ups ({items.length})</h2>
        <div className="divide-y divide-slate-100 rounded-lg border border-slate-200">
          {items.map((r) => <FollowUpRow key={r.signal_id} r={r} showCompany={false} />)}
          {items.length === 0 && <div className="px-4 py-3 text-sm text-slate-500">No follow-ups captured.</div>}
        </div>
      </section>
    </div>
  );
}

export default function AddedLeadPage() {
  return (
    <Suspense>
      <AddedLead />
    </Suspense>
  );
}
