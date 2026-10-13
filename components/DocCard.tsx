"use client";

import Link from "next/link";
import { useState } from "react";

interface Props {
  id: string;
  kind: "email" | "meeting_note";
  title: string;
  date: string;
  summary: string;
  highlights: string[];
  text: string;
  quotes: string[];
}

function highlight(text: string, quotes: string[]) {
  if (!quotes.length) return [text];
  const esc = quotes.map((q) => q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+"));
  const re = new RegExp(`(${esc.join("|")})`, "gi");
  return text.split(re).map((p, i) => (i % 2 ? <mark key={i} className="rounded bg-amber-100 px-0.5">{p}</mark> : p));
}

export function DocCard(p: Props) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative pl-6">
      <span className={`absolute left-0 top-1.5 grid h-4 w-4 place-items-center rounded-full text-[9px] text-white ${p.kind === "email" ? "bg-sky-500" : "bg-violet-500"}`}>
        {p.kind === "email" ? "✉" : "M"}
      </span>
      <div className="card p-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-slate-500">{p.date}</span>
          <span className={`chip border-transparent ${p.kind === "email" ? "bg-sky-50 text-sky-700" : "bg-violet-50 text-violet-700"}`}>
            {p.kind === "email" ? "Email" : "Meeting MOM"}
          </span>
          <Link href={`/docs/${encodeURIComponent(p.id)}`} className="text-sm font-medium text-slate-900 hover:text-indigo-700">
            {p.title}
          </Link>
        </div>
        {p.summary && <p className="mt-1.5 text-sm text-slate-700">{p.summary}</p>}
        {p.highlights.length > 0 && (
          <ul className="mt-1.5 flex flex-wrap gap-1.5">
            {p.highlights.map((h) => (
              <li key={h} className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{h}</li>
            ))}
          </ul>
        )}
        <button onClick={() => setOpen(!open)} className="mt-2 text-xs text-indigo-600 hover:underline">
          {open ? "Hide original" : "Show original"}
        </button>
        {open && (
          <pre className="mt-2 max-h-96 overflow-auto whitespace-pre-wrap rounded bg-slate-50 p-3 font-sans text-xs leading-relaxed text-slate-700">
            {highlight(p.text, p.quotes)}
          </pre>
        )}
      </div>
    </div>
  );
}
