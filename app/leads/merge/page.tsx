import Link from "next/link";
import { MergeReview } from "@/components/MergeReview";
import { model } from "@/lib/model";

export default async function MergePage({ searchParams }: { searchParams: Promise<{ a?: string; b?: string }> }) {
  const { a, b } = await searchParams;
  const A = model.accounts.find((x) => x.id === a);
  const B = model.accounts.find((x) => x.id === b);
  if (!A?.crm || !B?.crm) {
    const pairs = model.accounts.filter((x) => x.duplicate_of.length && x.id < x.duplicate_of[0]);
    return (
      <div className="mx-auto max-w-3xl space-y-3">
        <h1 className="text-2xl font-semibold text-slate-900">Possible duplicates</h1>
        {pairs.map((p) => (
          <Link key={p.id} href={`/leads/merge?a=${p.id}&b=${p.duplicate_of[0]}`} className="card block p-4 hover:border-indigo-300">
            <div className="font-medium text-slate-900">{p.company}: {p.id} ↔ {p.duplicate_of[0]}</div>
            <div className="text-xs text-slate-500">{p.duplicate_note}</div>
          </Link>
        ))}
      </div>
    );
  }
  return <MergeReview a={A.crm} b={B.crm} aDocs={A.doc_ids.length} bDocs={B.doc_ids.length} note={`${A.company} (${A.id}) and ${B.company} (${B.id}) — ${A.duplicate_note}`} />;
}
