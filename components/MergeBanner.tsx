"use client";

import Link from "next/link";
import { useAppState } from "./AppState";

// Duplicate notice on a lead page: link to review, or show the merge result.
export function MergeBanner({ id, others, note }: { id: string; others: string[]; note: string }) {
  const { merges, decisions } = useAppState();
  const m = merges.find((x) => x.drop === id || (x.keep === id && others.includes(x.drop)));
  if (m && m.drop === id)
    return (
      <div className="mt-3 rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-xs text-slate-700">
        This record was merged into <Link href={`/leads/${encodeURIComponent(m.keep)}`} className="font-medium underline">{m.keep}</Link> by {m.by}.
      </div>
    );
  if (m)
    return (
      <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
        {m.drop} was merged into this record by {m.by}.
      </div>
    );
  const kept = decisions[`${[id, ...others].sort()[0]}:duplicate`];
  if (kept)
    return <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">Duplicate reviewed: {kept.value}.</div>;
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-xs text-orange-800">
      <span>
        Possible duplicate of{" "}
        {others.map((d) => <Link key={d} href={`/leads/${encodeURIComponent(d)}`} className="font-medium underline">{d}</Link>)}. {note}
      </span>
      <Link href={`/leads/merge?a=${[id, ...others].sort()[0]}&b=${[id, ...others].sort()[1]}`} className="btn ml-auto">Review &amp; merge →</Link>
    </div>
  );
}
