/**
 * Eval against the dataset's answer key (PRD section 11).
 * The italic editorial notes in the dataset say what really happened; the AI never sees them.
 * Run: npm run eval   ->  data/generated/eval_report.md
 */
import fs from "node:fs";
import path from "node:path";
import { editorialNotes, loadDocs } from "../lib/dataset";
import type { Model } from "../lib/types";

const model: Model = JSON.parse(fs.readFileSync(path.join("data", "generated", "model.json"), "utf8"));
const docs = loadDocs();
const rows: { check: string; result: string; pass: boolean }[] = [];
const add = (check: string, pass: boolean, result: string) => rows.push({ check, pass, result });
const acct = (id: string) => model.accounts.find((a) => a.id === id)!;

// 1. Recall: every document whose answer key says AtliQ dropped the ball must produce an open item
const dropped = /no reply|not sent|nothing (was )?sent|no (call|invite|revisit|response|further|approach|follow)|never|not (started|done|arranged|answered|yet)|untouched|no confirmation|no samples|no scope|no one/i;
const keyDocs = docs.filter((d) => editorialNotes(d.raw).some((n) => dropped.test(n)));
const hit = keyDocs.filter((d) => model.radar.some((r) => r.doc_id === d.id || (r.also_docs || []).includes(d.id)));
const missed = keyDocs.filter((d) => !hit.includes(d)).map((d) => d.id);
add("Signal recall — dropped follow-ups caught (answer key)", hit.length / keyDocs.length >= 0.9,
  `${hit.length}/${keyDocs.length} (${Math.round((100 * hit.length) / keyDocs.length)}%)${missed.length ? ` · missed: ${missed.join(", ")}` : ""}`);

// 2. The five deals the founders named on 7 Jul must be in the Radar, near the top
const critical = { "L-1023": "FinEdge", "L-1029": "NovaPharma", "L-1017": "ShopSwift", "L-1003": "Meridian", "L-1009": "HealthFirst" };
const primary = model.radar.filter((r) => r.primary);
const ranks = Object.entries(critical).map(([id, n]) => {
  const i = primary.findIndex((r) => r.account_id === id);
  return { n, i };
});
add("Critical deals present in Deal Radar", ranks.every((r) => r.i >= 0), ranks.map((r) => `${r.n} #${r.i + 1}`).join(", "));
add("Critical deals ranked in top 15", ranks.every((r) => r.i >= 0 && r.i < 15), ranks.map((r) => `${r.n} #${r.i + 1}`).join(", "));

// 3. Leads missing from the CRM
const missingExpected = ["harbor", "nimbus", "lumino", "pixelworks", "ridgeline"];
const found = missingExpected.filter((k) => model.accounts.some((a) => !a.in_crm && a.company.toLowerCase().replace(/\s/g, "").includes(k)));
add("Leads missing from CRM detected", found.length === missingExpected.length, `${found.length}/5: ${found.join(", ")}`);

// 4. Duplicates flagged, never merged
add("Meridian duplicate flagged (L-1003 / L-1027)", acct("L-1003").duplicate_of.includes("L-1027"), acct("L-1003").duplicate_note || "not flagged");
add("GlobalMart L-1004 / L-1040 flagged as separate opportunity (not merged)",
  acct("L-1004").duplicate_of.includes("L-1040") && /separate/.test(acct("L-1004").duplicate_note), acct("L-1004").duplicate_note || "not flagged");

// 5. Stale statuses corrected
const st = (id: string) => acct(id).ai_stage;
add("Kaveri no longer 'Lost' (vendor failed, demo held)", st("L-1007") !== "Lost", `AI stage: ${st("L-1007")}`);
add("ClearPath re-opened (budget unfrozen)", st("L-1015") !== "Lost", `AI stage: ${st("L-1015")}`);
add("Trustline moved past 'Proposal Sent' (approved)", ["Negotiation", "Won"].includes(st("L-1032")), `AI stage: ${st("L-1032")}`);

// 6. Dates calculated in code
const due = (id: string, re: RegExp) => model.signals.find((s) => s.account_id === id && re.test(s.quote))?.due_date;
const dates = [
  ["ShopSwift SOW", due("L-1017", /15 July/), "2026-07-15"],
  ["NovaPharma questionnaire", due("L-1029", /24 July/), "2026-07-24"],
  ["HealthFirst board", due("L-1009", /14 July/), "2026-07-14"],
  ["Quantia revisit (Q2 2026)", due("L-1035", /Q2 2026|check back/i), "2026-06-30"],
] as const;
const okDates = dates.filter(([, got, want]) => got === want).length;
add("Date accuracy on key deadlines", okDates === dates.length, dates.map(([n, got, want]) => `${n}: ${got ?? "none"}${got === want ? " ✓" : ` ✗ (want ${want})`}`).join("; "));

// 7. Grounding
const total = model.signals.length;
const verbatim = model.signals.filter((s) => {
  const d = model.docs.find((x) => x.id === s.doc_id)!;
  const n = (x: string) =>
    x.toLowerCase().replace(/[“”„]/g, '"').replace(/[‘’‚`]/g, "'").replace(/[‐-―−]/g, "-")
      .replace(/[   ]/g, " ").replace(/…/g, "...").replace(/\s+/g, " ").trim();
  return n(d.text).includes(n(s.quote).replace(/^["']|["']$/g, "").replace(/\.\.\.$/, "").trim());
}).length;
const droppedCount = fs.readFileSync(path.join("data", "generated", "dropped_signals.txt"), "utf8").split("\n").filter(Boolean).length;
add("Grounding — every kept quote exists verbatim in its source", verbatim === total, `${verbatim}/${total} verbatim; ${droppedCount} model outputs dropped by the quote check`);

// 8. Editorial notes never reach the model
const leaked = model.docs.filter((d) => /^\s*\*\(.*\)\*\s*$/m.test(d.text)).length;
add("Answer-key notes excluded from AI input", leaked === 0, `${leaked} documents contain editorial notes`);

const passed = rows.filter((r) => r.pass).length;
const md = [
  `# Eval report — AtliQ Sales & CRM Assistant`,
  ``,
  `Generated ${new Date().toISOString().slice(0, 16)} · models: ${model.models.extract} (extraction) / ${model.models.reason} (reasoning) · reference date ${model.reference_date}`,
  ``,
  `**${passed}/${rows.length} checks passed**`,
  ``,
  `| Check | Result | Pass |`,
  `|---|---|---|`,
  ...rows.map((r) => `| ${r.check} | ${r.result.replace(/\|/g, "/")} | ${r.pass ? "✅" : "❌"} |`),
  ``,
].join("\n");
fs.writeFileSync(path.join("data", "generated", "eval_report.md"), md);
console.log(md);
