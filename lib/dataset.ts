import fs from "node:fs";
import path from "node:path";
import type { CrmRecord, SourceDoc } from "./types";

const DATA = path.join(process.cwd(), "data");

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      if (row.some((c) => c !== "")) rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

export function loadCrm(): CrmRecord[] {
  const [header, ...rows] = parseCsv(fs.readFileSync(path.join(DATA, "crm_export.csv"), "utf8"));
  return rows.map((r) => {
    const o: Record<string, string> = {};
    header.forEach((h, i) => (o[h] = (r[i] ?? "").trim()));
    return {
      ...(o as unknown as CrmRecord),
      est_value_usd: o.est_value_usd ? Number(o.est_value_usd) : null,
    };
  });
}

// Editorial notes are lines like "*(No reply sent as of ...)*" — ground truth for evals,
// never shown to the model (PRD 7.2).
export function stripEditorial(text: string): string {
  return text
    .split("\n")
    .filter((l) => !/^\s*\*\(.*\)\*\s*$/.test(l))
    .map((l) => l.replace(/\s*\*\([^\n]*?\)\*/g, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function editorialNotes(text: string): string[] {
  return text
    .split("\n")
    .filter((l) => /^\s*\*\(.*\)\*\s*$/.test(l))
    .map((l) => l.trim().replace(/^\*\(|\)\*$/g, ""));
}

function lastDate(text: string, fallback: string): string {
  const dates = [...text.matchAll(/\*\*Date:\*\*\s*(\d{4}-\d{2}-\d{2})/g)].map((m) => m[1]);
  return dates.length ? dates.sort().at(-1)! : fallback;
}

export function loadDocs(): (SourceDoc & { raw: string })[] {
  const out: (SourceDoc & { raw: string })[] = [];
  for (const [dir, kind] of [
    ["emails", "email"],
    ["meeting_notes", "meeting_note"],
  ] as const) {
    for (const f of fs.readdirSync(path.join(DATA, dir)).filter((x) => x.endsWith(".md")).sort()) {
      const raw = fs.readFileSync(path.join(DATA, dir, f), "utf8");
      const id = f.replace(/\.md$/, "");
      const fileDate = id.slice(0, 10);
      const title = (raw.split("\n")[0] || id).replace(/^#\s*/, "").trim();
      const participants = [
        ...new Set([...raw.matchAll(/[\w.+-]+@[\w-]+\.[\w.]+/g)].map((m) => m[0].toLowerCase())),
      ];
      out.push({
        id,
        kind,
        title,
        date: kind === "email" ? lastDate(raw, fileDate) : fileDate,
        text: stripEditorial(raw),
        participants,
        raw,
      });
    }
  }
  return out;
}
