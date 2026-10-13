"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAppState } from "./AppState";
import type { CrmRecord } from "@/lib/types";

const FIELDS: (keyof CrmRecord)[] = [
  "company", "contact_name", "contact_email", "source", "service_interest", "status", "est_value_usd", "owner",
  "created_date", "last_contact_date", "next_followup_date", "notes",
];

// Human-confirmed merge: pick the value to keep for each field, or keep both records.
export function MergeReview({ a, b, aDocs, bDocs, note }: { a: CrmRecord; b: CrmRecord; aDocs: number; bDocs: number; note: string }) {
  const router = useRouter();
  const { merge, keepBoth, merges } = useAppState();
  const pickDefault = (f: keyof CrmRecord) => {
    const va = a[f], vb = b[f];
    if (va === "" || va == null) return "b";
    if (vb === "" || vb == null) return "a";
    if (f === "notes") return "both";
    if (f === "last_contact_date" || f === "next_followup_date") return String(vb) > String(va) ? "b" : "a";
    return "a";
  };
  const [choice, setChoice] = useState<Record<string, "a" | "b" | "both">>(
    Object.fromEntries(FIELDS.map((f) => [f, pickDefault(f)])),
  );
  const [keep, setKeep] = useState<"a" | "b">("a");
  const already = merges.find((m) => [m.keep, m.drop].sort().join() === [a.lead_id, b.lead_id].sort().join());
  const val = (r: CrmRecord, f: keyof CrmRecord) => (r[f] === "" || r[f] == null ? "—" : String(r[f]));
  const differs = (f: keyof CrmRecord) => val(a, f) !== val(b, f);

  function doMerge() {
    const surv = keep === "a" ? a : b;
    const gone = keep === "a" ? b : a;
    const fields = Object.fromEntries(
      FIELDS.map((f) => [f, choice[f] === "both" ? [val(a, f), val(b, f)].filter((x) => x !== "—").join(" | ") : val(choice[f] === "a" ? a : b, f)]),
    );
    merge({ keep: surv.lead_id, drop: gone.lead_id, fields });
    router.push(`/leads/${encodeURIComponent(surv.lead_id)}`);
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="text-xs text-slate-500"><Link href="/leads?view=list&filter=dupes" className="hover:underline">Possible duplicates</Link> / Review</div>
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Review possible duplicate</h1>
        <p className="mt-1 text-sm text-slate-600">{note}</p>
        <p className="mt-1 text-xs text-slate-500">Nothing is merged automatically. Choose which value to keep for each field, or keep both records if these are separate opportunities.</p>
      </div>
      {already && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Already merged: {already.drop} → {already.keep} by {already.by}. <Link className="underline" href={`/leads/${encodeURIComponent(already.keep)}`}>Open {already.keep}</Link>
        </div>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-slate-50 text-xs text-slate-500">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Field</th>
              {[a, b].map((r, i) => (
                <th key={r.lead_id} className="px-3 py-2 text-left font-medium">
                  <Link href={`/leads/${encodeURIComponent(r.lead_id)}`} className="text-indigo-700 underline">{r.lead_id}</Link> · {r.owner || "no owner"} · {i ? bDocs : aDocs} conversations
                </th>
              ))}
              <th className="px-3 py-2 text-left font-medium">Keep</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {FIELDS.map((f) => (
              <tr key={f} className={differs(f) ? "bg-amber-50/40" : ""}>
                <td className="px-3 py-2 text-xs text-slate-500">{f}</td>
                <td className={`px-3 py-2 text-xs ${choice[f] !== "b" ? "font-medium text-slate-900" : "text-slate-400"}`}>{val(a, f)}</td>
                <td className={`px-3 py-2 text-xs ${choice[f] !== "a" ? "font-medium text-slate-900" : "text-slate-400"}`}>{val(b, f)}</td>
                <td className="px-3 py-2">
                  {differs(f) ? (
                    <select value={choice[f]} onChange={(e) => setChoice((c) => ({ ...c, [f]: e.target.value as "a" | "b" | "both" }))} className="rounded border border-slate-300 px-1.5 py-0.5 text-xs">
                      <option value="a">{a.lead_id}</option>
                      <option value="b">{b.lead_id}</option>
                      {f === "notes" && <option value="both">Both</option>}
                    </select>
                  ) : (
                    <span className="text-xs text-slate-400">same</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3">
        <label className="text-xs text-slate-600">
          Surviving record{" "}
          <select value={keep} onChange={(e) => setKeep(e.target.value as "a" | "b")} className="rounded border border-slate-300 px-1.5 py-0.5 text-xs">
            <option value="a">{a.lead_id}</option>
            <option value="b">{b.lead_id}</option>
          </select>
        </label>
        <button
          className="btn"
          onClick={() => {
            keepBoth(a.lead_id, b.lead_id);
            router.push("/leads?view=list&filter=dupes");
          }}
        >
          Keep both (separate opportunities)
        </button>
        <button className="btn-primary" onClick={doMerge} disabled={!!already}>Merge records</button>
      </div>
      <div className="card p-4 text-xs leading-relaxed text-slate-600">
        <b className="text-slate-800">How duplicates are prevented going forward:</b> every new lead — typed in or captured by AI — is checked against existing leads by
        contact email, email domain and company name before it can be saved. The seller must open the existing lead or confirm it&apos;s a separate opportunity.
        In production the merged record is written to the CRM, emails and meeting notes of both records are re-linked, and the action is kept in the audit log.
      </div>
    </div>
  );
}
