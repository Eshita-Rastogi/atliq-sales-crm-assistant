import Link from "next/link";
import { model } from "@/lib/model";
import { STAGE_STYLE, money } from "@/lib/format";

export default function AccountsPage() {
  const accounts = [...model.accounts].sort((a, b) => b.doc_ids.length - a.doc_ids.length || a.company.localeCompare(b.company));
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Accounts</h1>
        <p className="text-sm text-slate-500">One consolidated view per company: AI summary, highlights, meeting MOMs, emails and open actions.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {accounts.map((a) => (
          <Link key={a.id} href={`/accounts/${encodeURIComponent(a.id)}`} className="card p-4 hover:border-indigo-300 hover:shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div className="font-semibold text-slate-900">{a.company}</div>
              <span className={`chip ${STAGE_STYLE[a.ai_stage]}`}>{a.ai_stage}</span>
            </div>
            <div className="mt-0.5 text-xs text-slate-500">
              {a.owner || "No owner"} · {money(a.value_usd)} · {a.doc_ids.length} conversation{a.doc_ids.length === 1 ? "" : "s"}
              {!a.in_crm && <span className="ml-1 text-amber-700">· Not in CRM</span>}
            </div>
            <p className="mt-2 line-clamp-3 text-sm text-slate-700">{a.summary}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
