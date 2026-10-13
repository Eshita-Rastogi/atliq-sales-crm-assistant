import Link from "next/link";
import { notFound } from "next/navigation";
import { docById, model } from "@/lib/model";

export function generateStaticParams() {
  return model.docs.map((d) => ({ id: d.id }));
}

export default async function DocPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const d = docById(id);
  if (!d) notFound();
  const sigs = model.signals.filter((s) => s.doc_id === d.id);
  const accounts = [...new Set(sigs.map((s) => s.account_id))].map((x) => model.accounts.find((a) => a.id === x)!).filter(Boolean);
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="text-xs text-slate-500">Source document · {d.kind === "email" ? "Email thread" : "Meeting notes"} · {d.date}</div>
      <h1 className="text-xl font-semibold text-slate-900">{d.title}</h1>
      <div className="flex flex-wrap gap-2">
        {accounts.map((a) => (
          <Link key={a.id} href={`/leads/${encodeURIComponent(a.id)}`} className="chip border-indigo-200 bg-indigo-50 text-indigo-700">{a.company}</Link>
        ))}
      </div>
      {d.summary && <div className="card border-indigo-200 bg-indigo-50/40 p-4 text-sm"><b className="text-indigo-900">✦ AI summary:</b> {d.summary}</div>}
      <pre className="card whitespace-pre-wrap p-5 font-sans text-sm leading-relaxed text-slate-800">{d.text}</pre>
      <p className="text-xs text-slate-500">
        Shown exactly as the AI saw it. Editorial “what happened next” notes from the dataset are removed before processing and used only to test the AI.
      </p>
    </div>
  );
}
