/**
 * Offline AI pipeline: emails + meeting notes + CRM  ->  data/generated/model.json
 *
 *  1. Extraction model reads each document (editorial notes stripped) -> signals with verbatim quotes
 *  2. Code validates every quote against the source (drop if not found)
 *  3. Code resolves due dates, links signals to CRM accounts, flags duplicates & missing leads
 *  4. Reasoning model synthesises each account -> real stage, summary, next action, CRM suggestions
 *  5. Code ranks open items into the Deal Radar and computes KPIs
 *
 * Results are cached per document / account in data/generated/cache so reruns are free.
 * Run:  npm run build:model
 */
import fs from "node:fs";
import path from "node:path";
import { loadCrm, loadDocs } from "../lib/dataset";
import { REFERENCE_DATE, addBusinessDays, daysBetween, iso, resolveDue, toDate } from "../lib/dates";
import { EXTRACT_MODEL, REASON_MODEL, chatJSON, hasKey } from "../lib/llm";
import { EXTRACT_SYSTEM, PROFILE_SYSTEM, SYNTH_SYSTEM } from "../lib/prompts";
import type {
  Account, CrmRecord, CrmSuggestion, Model, RadarItem, Signal, SignalType, Stage,
} from "../lib/types";

for (const line of fs.existsSync(".env.local") ? fs.readFileSync(".env.local", "utf8").split(/\r?\n/) : []) {
  const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const OUT = path.join("data", "generated");
const CACHE = path.join(OUT, "cache");
fs.mkdirSync(CACHE, { recursive: true });

const ATLIQ = ["bhavin", "dhaval", "karandeep", "jay", "pranav", "ayush"];
const SIGNAL_TYPES: SignalType[] = [
  "client_ask", "atliq_promise", "client_deadline", "revisit", "cross_sell",
  "referral", "new_lead", "competitor", "status_change", "meeting_action",
];
const STAGE_SET: Stage[] = ["New", "Contacted", "Qualified", "Proposal Sent", "Negotiation", "Won", "Lost", "Re-engaged"];

// Models sometimes swap in typographic quotes, non-breaking hyphens or spaces; normalise before the verbatim check.
const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[“”„]/g, '"')
    .replace(/[‘’‚`]/g, "'")
    .replace(/[‐-―−]/g, "-")
    .replace(/[   ]/g, " ")
    .replace(/…/g, "...")
    .replace(/\s+/g, " ")
    .trim();
const quoteFound = (text: string, quote: string) => {
  const q = norm(quote).replace(/^["']|["']$/g, "").replace(/\.\.\.$/, "").trim();
  return q.length > 8 && text.includes(q);
};
const slug = (s: string) => s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const STOP = new Set(["inc", "ltd", "llc", "group", "the", "pvt", "co", "and", "advisory", "agency"]);
const nameKey = (s: string) => {
  const w = s.toLowerCase().replace(/&/g, " ").replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter((x) => x && !STOP.has(x));
  return w[0] || "";
};

async function cached<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const f = path.join(CACHE, key + ".json");
  if (fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, "utf8"));
  const v = await fn();
  fs.writeFileSync(f, JSON.stringify(v, null, 2));
  return v;
}

interface RawSignal {
  company?: string; type?: string; title?: string; quote?: string; owner?: string;
  due_phrase?: string; value_usd?: number | null; status?: string; confidence?: number;
}
interface Extraction { summary?: string; highlights?: string[]; signals?: RawSignal[] }
interface Synthesis {
  ai_stage?: string; stage_reason?: string; summary?: string; highlights?: string[];
  next_best_action?: string; crm_updates?: { field: string; proposed: string; reason: string; signal_id: string }[];
}

const crmStage = (s: string): Stage | "Blank" =>
  (({ New: "New", Contacted: "Contacted", "Proposal Sent": "Proposal Sent", Won: "Won", Lost: "Lost" }) as Record<string, Stage>)[s] ??
  "Blank";

async function main() {
  const crm = loadCrm();
  const docs = loadDocs();
  console.log(`CRM ${crm.length} records, ${docs.length} documents. Models: ${EXTRACT_MODEL} / ${REASON_MODEL}`);

  // ---------- 1. extraction
  const extractions: Record<string, Extraction> = {};
  const ai = hasKey();
  if (!ai) console.warn("GROQ_API_KEY not set — building a CRM-only model (no AI signals).");
  for (const d of ai ? docs : []) {
    extractions[d.id] = await cached(`extract_${d.id}`, async () => {
      process.stdout.write(`  extracting ${d.id}\n`);
      return chatJSON<Extraction>({
        model: EXTRACT_MODEL,
        system: EXTRACT_SYSTEM,
        user: `Document id: ${d.id}\nDocument type: ${d.kind}\nDocument date: ${d.date}\n---\n${d.text}`,
        maxTokens: 4000,
      });
    });
  }

  // ---------- 2. account index
  const byEmail = new Map<string, CrmRecord>();
  const byDomain = new Map<string, CrmRecord[]>();
  const byName = new Map<string, CrmRecord[]>();
  for (const r of crm) {
    if (r.contact_email) {
      byEmail.set(r.contact_email.toLowerCase(), r);
      const dom = r.contact_email.split("@")[1].toLowerCase();
      byDomain.set(dom, [...(byDomain.get(dom) || []), r]);
    }
    const k = nameKey(r.company);
    byName.set(k, [...(byName.get(k) || []), r]);
  }
  const rank = (r: CrmRecord) =>
    ({ Won: 5, "Proposal Sent": 4, Contacted: 3, Lost: 2, New: 1 } as Record<string, number>)[r.status] ?? 0;
  const best = (rs: CrmRecord[]) => [...rs].sort((a, b) => rank(b) - rank(a) || a.lead_id.localeCompare(b.lead_id))[0];

  const newAccounts = new Map<string, { company: string; email: string; contact: string }>();
  function accountFor(company: string, doc: (typeof docs)[number]): string {
    const key = nameKey(company || "");
    const ids = new Set(doc.text.match(/L-\d{4}/g) || []);
    if (key && byName.has(key)) return best(byName.get(key)!).lead_id;
    for (const r of crm) if (key && (nameKey(r.company).startsWith(key) || key.startsWith(nameKey(r.company)))) return r.lead_id;
    // fall back to the document's external participants
    for (const e of doc.participants) {
      if (e.endsWith("@atliq.com")) continue;
      if (byEmail.has(e) && (!key || nameKey(byEmail.get(e)!.company) === key)) return byEmail.get(e)!.lead_id;
    }
    if (ids.size === 1) return [...ids][0];
    const label = company || doc.title;
    const id = "new-" + slug(nameKey(label) || label);
    if (!newAccounts.has(id)) {
      const ext = doc.participants.find((e) => !e.endsWith("@atliq.com") && nameKey(e.split("@")[1]) === nameKey(label));
      newAccounts.set(id, { company: label, email: ext || "", contact: "" });
    }
    return id;
  }

  // ---------- 3. signals: validate quotes, link accounts, resolve dates
  const signals: Signal[] = [];
  const dropped: string[] = [];
  const docAccounts = new Map<string, Set<string>>();
  for (const d of docs) {
    const ex = extractions[d.id] || {};
    const text = norm(d.text);
    (ex.signals || []).forEach((s, i) => {
      const quote = (s.quote || "").trim();
      const type = SIGNAL_TYPES.includes(s.type as SignalType) ? (s.type as SignalType) : null;
      if (!type || !quote || !quoteFound(text, quote)) {
        dropped.push(`${d.id}#${i} (${s.type}): ${quote.slice(0, 60)}`);
        return;
      }
      if (nameKey(s.company || "") === "atliq") return; // internal process notes, not a client account
      const account_id = accountFor(s.company || "", d);
      const due = resolveDue(s.due_phrase || "", d.date, type);
      const owner = ATLIQ.includes((s.owner || "").toLowerCase().split(" ")[0])
        ? s.owner!.split(" ")[0][0].toUpperCase() + s.owner!.split(" ")[0].slice(1).toLowerCase()
        : "";
      signals.push({
        id: `${d.id}#${i}`,
        doc_id: d.id,
        account_id,
        type,
        title: (s.title || "").trim(),
        quote,
        owner,
        due_phrase: s.due_phrase || "",
        due_date: ["competitor", "status_change"].includes(type) ? null : due.date,
        due_reason: due.reason,
        needs_review: due.needs_review || (s.confidence ?? 1) < 0.6,
        value_usd: typeof s.value_usd === "number" ? s.value_usd : null,
        status: s.status === "done" ? "done" : "open",
        confidence: s.confidence ?? 0.8,
        doc_date: d.date,
      });
      docAccounts.set(d.id, new Set([...(docAccounts.get(d.id) || []), account_id]));
    });
  }
  // Code rule: AtliQ sent the last message in a thread 14+ days ago and nobody replied -> stalled, nudge or close.
  for (const d of docs.filter((x) => x.kind === "email")) {
    const msgs = [...d.text.matchAll(/\*\*From:\*\*[^<\n]*<([^>]+)>[\s\S]*?(?=\*\*From:\*\*|$)/g)];
    const last = msgs.at(-1);
    if (!last || !last[1].toLowerCase().endsWith("@atliq.com")) continue;
    if (daysBetween(d.date, REFERENCE_DATE) < 14) continue;
    const ext = d.participants.find((e) => !e.endsWith("@atliq.com"));
    const rec = crm.find((r) => ext && r.contact_email.toLowerCase() === ext);
    if (!rec) continue;
    const later = docs.some((x) => x.date > d.date && x.participants.includes(ext!));
    if (later) continue;
    const body = last[0].split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("**") && l !== "---");
    const quote = body.find((l) => l.length > 20) || body[0];
    // If AtliQ still owes something in this thread (an open ask or promise), the ball is in our court — not stalled.
    const owesAction = signals.some(
      (s) => s.doc_id === d.id && s.status === "open" && ["client_ask", "atliq_promise", "client_deadline", "revisit"].includes(s.type),
    );
    if (!quote || owesAction) continue;
    const owner = last[1].split("@")[0];
    signals.push({
      id: `${d.id}#stalled`, doc_id: d.id, account_id: rec.lead_id, type: "revisit",
      title: `No reply since ${d.date} — nudge once more or close`, quote,
      owner: owner[0].toUpperCase() + owner.slice(1), due_phrase: "", due_date: iso(addBusinessDays(toDate(d.date), 10)),
      due_reason: "Rule: AtliQ sent the last message, no reply → follow up within 10 business days",
      needs_review: false, value_usd: null, status: "open", confidence: 1, doc_date: d.date,
    });
  }
  console.log(`Signals kept ${signals.length}, dropped (quote not found / bad type) ${dropped.length}`);
  fs.writeFileSync(path.join(OUT, "dropped_signals.txt"), dropped.join("\n"));

  // ---------- 4. accounts
  const accountIds = new Set<string>([...crm.map((r) => r.lead_id), ...signals.map((s) => s.account_id)]);
  const accounts: Account[] = [];
  for (const id of accountIds) {
    const rec = crm.find((r) => r.lead_id === id) || null;
    const nw = newAccounts.get(id);
    const sigs = signals.filter((s) => s.account_id === id);
    const docIds = [...new Set(sigs.map((s) => s.doc_id))].sort();
    // also attach docs whose external participant matches this record's contact
    if (rec?.contact_email) for (const d of docs) if (d.participants.includes(rec.contact_email.toLowerCase()) && !docIds.includes(d.id)) docIds.push(d.id);
    docIds.sort();
    const lastDoc = docIds.map((x) => docs.find((d) => d.id === x)!.date).sort().at(-1) || null;
    const lastTouch = [lastDoc, rec?.last_contact_date || null].filter(Boolean).sort().at(-1) || null;
    accounts.push({
      id,
      company: rec?.company || nw?.company || id,
      in_crm: !!rec,
      lead_ids: rec ? [rec.lead_id] : [],
      crm: rec,
      contact_name: rec?.contact_name || nw?.contact || "",
      contact_email: rec?.contact_email || nw?.email || "",
      owner: rec?.owner || sigs.find((s) => s.owner)?.owner || "",
      source: rec?.source || "Not in CRM",
      service_interest: rec?.service_interest || "",
      value_usd: rec?.est_value_usd ?? sigs.find((s) => s.value_usd)?.value_usd ?? null,
      crm_stage: rec ? crmStage(rec.status) : "Blank",
      ai_stage: rec ? (crmStage(rec.status) === "Blank" ? "New" : (crmStage(rec.status) as Stage)) : "New",
      stage_reason: "",
      summary: "",
      highlights: [],
      next_best_action: "",
      about: "",
      why_here: "",
      wants: "",
      doc_ids: docIds,
      last_touch: lastTouch,
      days_since_touch: lastTouch ? daysBetween(lastTouch, REFERENCE_DATE) : null,
      competitor: sigs.some((s) => s.type === "competitor"),
      duplicate_of: [],
      duplicate_note: "",
    });
  }

  // duplicates: same contact email or same email domain / company key (flag only — never merge)
  for (const a of accounts) {
    if (!a.crm) continue;
    const dupes = accounts.filter(
      (b) => b.id !== a.id && b.crm &&
        ((a.contact_email && b.contact_email && a.contact_email.split("@")[1] === b.contact_email.split("@")[1]) ||
          nameKey(a.company) === nameKey(b.company)),
    );
    if (dupes.length) {
      a.duplicate_of = dupes.map((b) => b.id);
      const diffService = dupes.some((b) => b.service_interest && a.service_interest && b.service_interest !== a.service_interest);
      a.duplicate_note = diffService
        ? "Same client, different service line — may be a separate opportunity. Review before merging."
        : "Looks like the same client entered twice (different owners). Review and merge manually.";
    }
  }

  // ---------- 5. synthesis per account
  for (const a of accounts) {
    const sigs = signals.filter((s) => s.account_id === a.id);
    if (!sigs.length || !ai) {
      a.summary = a.crm?.notes
        ? `CRM note only: "${a.crm.notes}". No emails or meeting notes found for this account.`
        : "No emails or meeting notes found for this account — CRM record only.";
      a.next_best_action = a.owner ? `${a.owner}: make first contact or close out this lead.` : "Assign an owner and make first contact.";
      continue;
    }
    const syn = await cached<Synthesis>(`synth_${slug(a.id)}`, async () => {
      process.stdout.write(`  synthesising ${a.company}\n`);
      return chatJSON<Synthesis>({
        model: REASON_MODEL,
        system: SYNTH_SYSTEM,
        user: JSON.stringify({
          account: a.company,
          crm_record: a.crm ?? "NOT IN CRM",
          signals: sigs.map((s) => ({
            id: s.id, type: s.type, title: s.title, quote: s.quote, owner: s.owner,
            doc_date: s.doc_date, due_date: s.due_date, status: s.status,
          })),
          documents: a.doc_ids.map((id) => ({ id, summary: extractions[id]?.summary, highlights: extractions[id]?.highlights })),
        }),
        maxTokens: 3000, effort: "medium",
      });
    });
    a.ai_stage = STAGE_SET.includes(syn.ai_stage as Stage) ? (syn.ai_stage as Stage) : a.ai_stage;
    a.stage_reason = syn.stage_reason || "";
    a.summary = syn.summary || "";
    a.highlights = (syn.highlights || []).slice(0, 4);
    a.next_best_action = syn.next_best_action || "";
    (a as Account & { _updates?: Synthesis["crm_updates"] })._updates = syn.crm_updates || [];
  }

  // ---------- 5b. lead profile: who they are, why they're here, what they want
  for (const a of accounts) {
    a.about = a.why_here = a.wants = "";
    if (!ai) continue;
    const p = await cached<{ about?: string; why_here?: string; wants?: string }>(`profile_${slug(a.id)}`, async () => {
      process.stdout.write(`  profiling ${a.company}\n`);
      return chatJSON({
        model: EXTRACT_MODEL,
        system: PROFILE_SYSTEM,
        user: JSON.stringify({
          company: a.company,
          crm_record: a.crm ?? "NOT IN CRM",
          conversations: a.doc_ids.map((id) => ({ id, summary: extractions[id]?.summary, highlights: extractions[id]?.highlights })),
          signals: signals.filter((s) => s.account_id === a.id).map((s) => `${s.type}: ${s.quote}`),
        }),
        maxTokens: 1500,
      });
    });
    a.about = p.about || "";
    a.why_here = p.why_here || "";
    a.wants = p.wants || "";
  }

  // ---------- 6. CRM suggestions (AI-proposed + code-derived), all need human approval
  const suggestions: CrmSuggestion[] = [];
  const FIELDS = ["status", "est_value_usd", "owner", "service_interest", "contact_email", "notes"];
  for (const a of accounts) {
    const sigs = signals.filter((s) => s.account_id === a.id);
    const ups = ((a as Account & { _updates?: Synthesis["crm_updates"] })._updates || []).filter(
      (u) => FIELDS.includes(u.field) && sigs.some((s) => s.id === u.signal_id) && String(u.proposed ?? "").trim(),
    );
    delete (a as Account & { _updates?: unknown })._updates;
    for (const u of ups) {
      const cur = a.crm ? String((a.crm as unknown as Record<string, unknown>)[u.field] ?? "") : "";
      if (norm(cur) === norm(String(u.proposed))) continue;
      const s = sigs.find((x) => x.id === u.signal_id)!;
      suggestions.push({
        id: `${a.id}:${u.field}`, account_id: a.id, field: u.field, current: cur || "—",
        proposed: String(u.proposed), reason: u.reason, quote: s.quote, doc_id: s.doc_id,
      });
    }
    if (a.crm && a.ai_stage !== a.crm_stage && !suggestions.some((x) => x.id === `${a.id}:status`)) {
      const s = sigs.find((x) => x.type === "status_change") || sigs.at(-1);
      if (s) suggestions.push({
        id: `${a.id}:status`, account_id: a.id, field: "status", current: a.crm.status || "—",
        proposed: a.ai_stage, reason: a.stage_reason, quote: s.quote, doc_id: s.doc_id,
      });
    }
    const open = sigs.filter((s) => s.status === "open" && s.due_date).sort((x, y) => x.due_date!.localeCompare(y.due_date!));
    if (a.crm && open.length && !a.crm.next_followup_date) {
      suggestions.push({
        id: `${a.id}:next_followup_date`, account_id: a.id, field: "next_followup_date", current: "—",
        proposed: open[0].due_date!, reason: `Earliest open item: ${open[0].title}`, quote: open[0].quote, doc_id: open[0].doc_id,
      });
    }
    if (a.crm && a.last_touch && a.last_touch > (a.crm.last_contact_date || "")) {
      const d = docs.find((x) => a.doc_ids.includes(x.id) && x.date === a.last_touch);
      if (d) suggestions.push({
        id: `${a.id}:last_contact_date`, account_id: a.id, field: "last_contact_date",
        current: a.crm.last_contact_date || "—", proposed: a.last_touch, reason: "A newer email or meeting exists",
        quote: d.title, doc_id: d.id,
      });
    }
    if (!a.in_crm) {
      const s = sigs[0];
      suggestions.push({
        id: `${a.id}:create`, account_id: a.id, field: "create_lead", current: "Not in CRM",
        proposed: `Create lead: ${a.company}`, reason: "Live conversation with no CRM record", quote: s.quote, doc_id: s.doc_id,
      });
    }
    if (a.duplicate_of.length && a.id < a.duplicate_of[0]) {
      suggestions.push({
        id: `${a.id}:duplicate`, account_id: a.id, field: "possible_duplicate", current: [a.id, ...a.duplicate_of].join(" / "),
        proposed: "Review — do not auto-merge", reason: a.duplicate_note, quote: "", doc_id: "",
      });
    }
  }

  // ---------- 7. Deal Radar (ranking in code)
  const RADAR_TYPES: SignalType[] = ["client_ask", "atliq_promise", "client_deadline", "meeting_action", "revisit", "referral", "new_lead", "cross_sell"];
  const radar: RadarItem[] = [];
  for (const s of signals) {
    if (s.status !== "open" || !RADAR_TYPES.includes(s.type)) continue;
    const a = accounts.find((x) => x.id === s.account_id)!;
    const overdue = s.due_date ? Math.max(0, daysBetween(s.due_date, REFERENCE_DATE)) : 0;
    const dueIn = s.due_date ? daysBetween(REFERENCE_DATE, s.due_date) : 999;
    if (s.type === "revisit" && dueIn > 30) continue;
    if (a.ai_stage === "Lost" && !["revisit", "client_deadline"].includes(s.type)) continue;
    const waiting = Math.max(0, daysBetween(s.doc_date, REFERENCE_DATE));
    const value = a.value_usd ?? s.value_usd;
    // Ranking rules (transparent, in code): an imminent client deadline beats an old overdue ask;
    // value matters; threads cold for 30+ / 60+ days lose priority.
    const urgency =
      overdue > 0 ? 35 + Math.min(overdue, 21) * 0.5 : dueIn <= 14 ? 60 - dueIn * 2 : 10;
    const stale = waiting > 60 ? -20 : waiting > 30 ? -8 : 0;
    const score = Math.round(
      urgency + stale + (value ? Math.min(30, (value / 1000) * 0.35) : 7) +
        (s.type === "client_deadline" ? 10 : 0) + (a.competitor ? 8 : 0) +
        (["referral", "new_lead"].includes(s.type) ? 8 : 0),
    );
    const parts = [
      value ? `$${Math.round(value / 1000)}k` : "value unknown",
      overdue > 0 ? `overdue ${overdue}d` : s.due_date ? `due ${s.due_date}` : "no date",
      `waiting ${waiting}d`,
      a.competitor ? "competitor in play" : "",
    ].filter(Boolean);
    radar.push({
      signal_id: s.id, account_id: a.id, company: a.company,
      owner: s.owner && ["Bhavin", "Dhaval", "Karandeep", "Jay"].includes(s.owner) ? s.owner : a.owner || s.owner || "Unassigned",
      type: s.type, title: s.title, quote: s.quote, doc_id: s.doc_id, due_date: s.due_date,
      days_overdue: overdue, days_waiting: waiting, value_usd: value, score, reason: parts.join(" · "),
      needs_review: s.needs_review,
    });
  }
  // Merge near-duplicates: the same account + same due date found in several documents is one task.
  // Keep the most actionable wording (an ask or promise over a bare deadline) and the highest score.
  const groups = new Map<string, RadarItem[]>();
  for (const r of radar) {
    const k = r.due_date && ["client_ask", "atliq_promise", "client_deadline", "meeting_action"].includes(r.type) ? `${r.account_id}|${r.due_date}` : r.signal_id;
    groups.set(k, [...(groups.get(k) || []), r]);
  }
  radar.length = 0;
  for (const g of groups.values()) {
    const pick = g.find((r) => r.type === "client_ask" || r.type === "atliq_promise") || g.find((r) => r.type === "meeting_action") || g[0];
    const rep: RadarItem = { ...pick, score: Math.max(...g.map((r) => r.score)) };
    rep.also_docs = [...new Set(g.map((r) => r.doc_id).filter((d) => d !== rep.doc_id))];
    if (g.some((r) => r.type === "client_deadline") && rep.type !== "client_deadline") rep.reason += " · client deadline";
    radar.push(rep);
  }
  radar.sort((x, y) => y.score - x.score);
  // The top item per account leads the list; the rest sit behind "+N more" so one account can't flood it.
  const seen = new Set<string>();
  for (const r of radar) {
    r.primary = !seen.has(r.account_id);
    seen.add(r.account_id);
  }

  // ---------- 8. KPIs
  const sum = (xs: Account[]) => xs.reduce((t, a) => t + (a.value_usd || 0), 0);
  const OPEN_TYPES: SignalType[] = ["client_ask", "atliq_promise", "client_deadline", "meeting_action", "referral", "new_lead"];
  const waitingAccts = accounts.filter((a) =>
    radar.some((r) => r.account_id === a.id && r.days_overdue > 0 && OPEN_TYPES.includes(r.type)),
  );
  const model: Model = {
    generated_at: new Date().toISOString(),
    reference_date: REFERENCE_DATE,
    models: { extract: EXTRACT_MODEL, reason: REASON_MODEL },
    accounts: accounts.sort((x, y) => x.company.localeCompare(y.company)),
    signals,
    radar,
    suggestions,
    docs: docs.map(({ raw: _raw, ...d }) => ({
      ...d,
      summary: extractions[d.id]?.summary || "",
      highlights: (extractions[d.id]?.highlights || []).slice(0, 3),
    })),
    kpis: {
      open_pipeline: sum(accounts.filter((a) => !["Won", "Lost"].includes(a.ai_stage))),
      won: sum(accounts.filter((a) => a.ai_stage === "Won")),
      lost: sum(accounts.filter((a) => a.ai_stage === "Lost")),
      waiting_on_atliq: sum(waitingAccts),
      overdue_actions: radar.filter((r) => r.days_overdue > 0).length,
      not_in_crm: accounts.filter((a) => !a.in_crm).length,
      open_deals: accounts.filter((a) => !["Won", "Lost"].includes(a.ai_stage)).length,
    },
  };
  fs.writeFileSync(path.join(OUT, "model.json"), JSON.stringify(model, null, 1));
  console.log("KPIs", model.kpis);
  console.log(`Accounts ${accounts.length} (not in CRM: ${model.kpis.not_in_crm}), radar ${radar.length}, suggestions ${suggestions.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
