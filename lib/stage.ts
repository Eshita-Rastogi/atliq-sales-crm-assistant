import type { Stage } from "./types";

export const PIPELINE: Stage[] = ["New", "Contacted", "Qualified", "Proposal Sent", "Negotiation", "Won"];

export const ACTIONS: { label: string; to?: Stage }[] = [
  { label: "Replied by email", to: "Contacted" },
  { label: "Call or meeting held", to: "Qualified" },
  { label: "Meeting booked", to: "Contacted" },
  { label: "Proposal / quote / SOW sent", to: "Proposal Sent" },
  { label: "Documents or references sent" },
  { label: "Contract or revised terms sent", to: "Negotiation" },
  { label: "Deal signed", to: "Won" },
  { label: "Client declined", to: "Lost" },
  { label: "Other" },
];

/** Suggest the stage after an action — never moves a deal backwards (except an explicit win/loss). */
export function suggestStage(action: string, current: Stage): Stage {
  const to = ACTIONS.find((a) => a.label === action)?.to;
  if (!to) return current;
  if (to === "Won" || to === "Lost") return to;
  if (current === "Lost") return "Re-engaged";
  if (current === "Won" || current === "Re-engaged") return current;
  return PIPELINE.indexOf(to) > PIPELINE.indexOf(current) ? to : current;
}

// Lead profile completeness — the CRM fields a seller should fill in.
export const PROFILE_FIELDS: { key: string; label: string }[] = [
  { key: "contact_name", label: "Contact name" },
  { key: "contact_email", label: "Contact email" },
  { key: "source", label: "Source" },
  { key: "service_interest", label: "Service interest" },
  { key: "est_value_usd", label: "Deal value" },
  { key: "owner", label: "Owner" },
  { key: "next_followup_date", label: "Next follow-up date" },
  { key: "notes", label: "Notes" },
];

export function completeness(values: Record<string, unknown>) {
  const missing = PROFILE_FIELDS.filter((f) => values[f.key] === "" || values[f.key] == null);
  return { pct: Math.round((100 * (PROFILE_FIELDS.length - missing.length)) / PROFILE_FIELDS.length), missing };
}
