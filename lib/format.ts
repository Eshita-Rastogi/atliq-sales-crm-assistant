import type { SignalType, Stage } from "./types";

export const money = (v: number | null | undefined) =>
  v == null ? "—" : v >= 1_000_000 ? `$${(v / 1_000_000).toFixed(1)}M` : `$${Math.round(v / 1000)}k`;

export const fmtDate = (iso: string | null | undefined) => {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00Z");
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
};

export const STAGE_STYLE: Record<Stage | "Blank", string> = {
  New: "bg-slate-100 text-slate-700 border-slate-200",
  Contacted: "bg-sky-50 text-sky-700 border-sky-200",
  Qualified: "bg-cyan-50 text-cyan-700 border-cyan-200",
  "Proposal Sent": "bg-indigo-50 text-indigo-700 border-indigo-200",
  Negotiation: "bg-violet-50 text-violet-700 border-violet-200",
  Won: "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Re-engaged": "bg-amber-50 text-amber-700 border-amber-200",
  Lost: "bg-rose-50 text-rose-700 border-rose-200",
  Blank: "bg-slate-50 text-slate-500 border-dashed border-slate-300",
};

export const STAGE_BAR: Record<Stage, string> = {
  New: "bg-slate-400",
  Contacted: "bg-sky-500",
  Qualified: "bg-cyan-500",
  "Proposal Sent": "bg-indigo-500",
  Negotiation: "bg-violet-500",
  Won: "bg-emerald-500",
  "Re-engaged": "bg-amber-500",
  Lost: "bg-rose-500",
};

export const TYPE_LABEL: Record<SignalType, string> = {
  client_ask: "Client asked",
  atliq_promise: "We promised",
  client_deadline: "Client deadline",
  revisit: "Revisit",
  cross_sell: "Cross-sell",
  referral: "Referral",
  new_lead: "New lead",
  competitor: "Competitor",
  status_change: "Status change",
  meeting_action: "Meeting action",
};

export const TYPE_STYLE: Record<SignalType, string> = {
  client_ask: "bg-sky-50 text-sky-700",
  atliq_promise: "bg-violet-50 text-violet-700",
  client_deadline: "bg-rose-50 text-rose-700",
  revisit: "bg-amber-50 text-amber-700",
  cross_sell: "bg-emerald-50 text-emerald-700",
  referral: "bg-teal-50 text-teal-700",
  new_lead: "bg-teal-50 text-teal-700",
  competitor: "bg-orange-50 text-orange-700",
  status_change: "bg-slate-100 text-slate-700",
  meeting_action: "bg-indigo-50 text-indigo-700",
};

export const OWNER_COLOR: Record<string, string> = {
  Bhavin: "bg-indigo-600",
  Dhaval: "bg-teal-600",
  Karandeep: "bg-violet-600",
  Jay: "bg-amber-600",
};

export const initials = (n: string) => (n ? n.slice(0, 2).toUpperCase() : "?");
