// All date maths lives here, in code — never in the model (PRD guardrail).

export const REFERENCE_DATE = "2026-07-10"; // "today" in the dataset

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};
const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

export const toDate = (iso: string) => new Date(iso + "T00:00:00Z");
export const iso = (d: Date) => d.toISOString().slice(0, 10);
export const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);

export function addBusinessDays(d: Date, n: number): Date {
  let out = d;
  let left = n;
  while (left > 0) {
    out = addDays(out, 1);
    const wd = out.getUTCDay();
    if (wd !== 0 && wd !== 6) left--;
  }
  return out;
}

export function daysBetween(a: string, b: string): number {
  return Math.round((toDate(b).getTime() - toDate(a).getTime()) / 86400000);
}

const endOfMonth = (y: number, m: number) => new Date(Date.UTC(y, m + 1, 0));

export interface Resolved {
  date: string | null;
  reason: string;
  needs_review: boolean;
}

/**
 * Resolve a natural-language due phrase relative to the document date.
 * Unknown phrases fall back to the 2-business-day default and are flagged for review.
 */
export function resolveDue(phrase: string, docDate: string, type: string): Resolved {
  const p = (phrase || "").toLowerCase().trim();
  const base = toDate(docDate);
  const year = base.getUTCFullYear();
  const def = (why: string, review: boolean): Resolved => ({
    date: iso(addBusinessDays(base, 2)),
    reason: why,
    needs_review: review,
  });

  if (!p) {
    if (type === "revisit") return { date: null, reason: "No revisit date given", needs_review: true };
    return def("No date given → default: reply within 2 business days", false);
  }

  // Quarter, e.g. "Q2 2026", "Q4"
  let m = p.match(/\bq([1-4])(?:\s*(\d{4}))?/);
  if (m) {
    const q = Number(m[1]);
    const y = m[2] ? Number(m[2]) : year;
    return { date: iso(endOfMonth(y, q * 3 - 1)), reason: `"${phrase}" → end of Q${q} ${y}`, needs_review: false };
  }

  // "after the 15th" — ambiguous, resolve to the next day but flag
  m = p.match(/after (?:the )?(\d{1,2})(?:st|nd|rd|th)?\b/);
  if (m) {
    let d = new Date(Date.UTC(year, base.getUTCMonth(), Number(m[1]) + 1));
    if (d < base) d = new Date(Date.UTC(year, base.getUTCMonth() + 1, Number(m[1]) + 1));
    return { date: iso(d), reason: `"${phrase}" → ${iso(d)} (ambiguous)`, needs_review: true };
  }

  // Explicit day + month: "15 July", "July 15", "24 jul", "by 10 Jul"
  m = p.match(/(\d{1,2})(?:st|nd|rd|th)?\s+(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sept|sep|october|oct|november|nov|december|dec)\b/) || null;
  let day: number | null = null;
  let mon: number | null = null;
  if (m && MONTHS[m[2].slice(0, 3)] !== undefined) {
    day = Number(m[1]);
    mon = MONTHS[m[2].slice(0, 3)];
  } else {
    const m2 = p.match(/\b(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sept|sep|october|oct|november|nov|december|dec)\b\s+(\d{1,2})(?:st|nd|rd|th)?\b/);
    if (m2 && MONTHS[m2[1].slice(0, 3)] !== undefined) {
      day = Number(m2[2]);
      mon = MONTHS[m2[1].slice(0, 3)];
    }
  }
  if (day !== null && mon !== null) {
    const d = new Date(Date.UTC(year, mon, day));
    return { date: iso(d), reason: `"${phrase}" → ${iso(d)}`, needs_review: false };
  }

  // Month-relative: "end of July", "mid-July", "early August", "September"
  m = p.match(/(end of|mid|early|beginning of|first week of)?[\s-]*\b(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sept|sep|october|oct|november|nov|december|dec)\b/);
  if (m) {
    const mo = MONTHS[m[2].slice(0, 3)];
    const y = mo < base.getUTCMonth() - 6 ? year + 1 : year;
    const when = m[1] || "end of";
    const d =
      when === "mid" ? new Date(Date.UTC(y, mo, 15))
      : when === "early" || when === "beginning of" || when === "first week of" ? new Date(Date.UTC(y, mo, 7))
      : endOfMonth(y, mo);
    return { date: iso(d), reason: `"${phrase}" → ${iso(d)}`, needs_review: false };
  }

  // Weekdays: "Friday", "by Wednesday", "Monday 13th"
  const wd = WEEKDAYS.findIndex((w) => p.includes(w));
  if (wd >= 0) {
    let d = addDays(base, 1);
    while (d.getUTCDay() !== wd) d = addDays(d, 1);
    if (p.includes("next week") && daysBetween(iso(base), iso(d)) < 7) d = addDays(d, 7);
    return { date: iso(d), reason: `"${phrase}" → next ${WEEKDAYS[wd]} after ${docDate}`, needs_review: false };
  }

  if (/next week|early next week/.test(p)) {
    let d = addDays(base, 1);
    while (d.getUTCDay() !== 1) d = addDays(d, 1);
    if (p.includes("early")) return { date: iso(d), reason: `"${phrase}" → Monday ${iso(d)}`, needs_review: false };
    return { date: iso(addDays(d, 4)), reason: `"${phrase}" → end of next week`, needs_review: false };
  }
  if (/this week/.test(p)) {
    let d = base;
    while (d.getUTCDay() !== 5) d = addDays(d, 1);
    return { date: iso(d), reason: `"${phrase}" → Friday ${iso(d)}`, needs_review: false };
  }
  if (/day or two|couple of days|shortly|soon/.test(p)) {
    return { date: iso(addBusinessDays(base, 2)), reason: `"${phrase}" → 2 business days`, needs_review: false };
  }
  if (/this month/.test(p)) {
    return { date: iso(endOfMonth(year, base.getUTCMonth())), reason: `"${phrase}" → end of month`, needs_review: false };
  }
  if (/next quarter/.test(p)) {
    const q = Math.floor(base.getUTCMonth() / 3) + 1;
    return { date: iso(endOfMonth(year, Math.min(11, q * 3 + 2))), reason: `"${phrase}" → end of next quarter`, needs_review: true };
  }
  if (/next couple of weeks|two weeks|2 weeks/.test(p)) {
    return { date: iso(addDays(base, 14)), reason: `"${phrase}" → +14 days`, needs_review: false };
  }

  return def(`"${phrase}" not understood → default 2 business days`, true);
}
