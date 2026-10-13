export type Stage =
  | "New"
  | "Contacted"
  | "Qualified"
  | "Proposal Sent"
  | "Negotiation"
  | "Won"
  | "Lost"
  | "Re-engaged";

export const STAGES: Stage[] = [
  "New",
  "Contacted",
  "Qualified",
  "Proposal Sent",
  "Negotiation",
  "Won",
  "Re-engaged",
  "Lost",
];

export const SELLERS = ["Bhavin", "Dhaval", "Karandeep", "Jay"] as const;

export type SignalType =
  | "client_ask"
  | "atliq_promise"
  | "client_deadline"
  | "revisit"
  | "cross_sell"
  | "referral"
  | "new_lead"
  | "competitor"
  | "status_change"
  | "meeting_action";

export interface CrmRecord {
  lead_id: string;
  company: string;
  contact_name: string;
  contact_email: string;
  source: string;
  service_interest: string;
  status: string;
  est_value_usd: number | null;
  owner: string;
  created_date: string;
  last_contact_date: string;
  next_followup_date: string;
  notes: string;
}

export interface SourceDoc {
  id: string; // file name without extension
  kind: "email" | "meeting_note";
  title: string;
  date: string; // ISO date of the latest message / meeting
  text: string; // cleaned text sent to the model (editorial notes removed)
  participants: string[]; // email addresses found
  summary?: string; // AI summary of the document (MOM highlights)
  highlights?: string[];
}

export interface Signal {
  id: string;
  doc_id: string;
  account_id: string; // lead_id or "new-<slug>"
  type: SignalType;
  title: string;
  quote: string;
  owner: string; // AtliQ owner (may be "")
  due_phrase: string;
  due_date: string | null; // computed in code
  due_reason: string; // how the date was derived
  needs_review: boolean;
  value_usd: number | null;
  status: "open" | "done";
  confidence: number;
  doc_date: string;
}

export interface CrmSuggestion {
  id: string;
  account_id: string;
  field: string;
  current: string;
  proposed: string;
  reason: string;
  quote: string;
  doc_id: string;
}

export interface Account {
  id: string; // primary lead_id or new-<slug>
  company: string;
  in_crm: boolean;
  lead_ids: string[];
  crm: CrmRecord | null;
  contact_name: string;
  contact_email: string;
  owner: string;
  source: string;
  service_interest: string;
  value_usd: number | null;
  crm_stage: Stage | "Blank";
  ai_stage: Stage;
  stage_reason: string;
  summary: string;
  highlights: string[];
  next_best_action: string;
  about: string; // who they are
  why_here: string; // how they came to AtliQ
  wants: string; // what they want from AtliQ
  doc_ids: string[];
  last_touch: string | null;
  days_since_touch: number | null;
  competitor: boolean;
  duplicate_of: string[];
  duplicate_note: string;
}

export interface RadarItem {
  signal_id: string;
  account_id: string;
  company: string;
  owner: string;
  type: SignalType;
  title: string;
  quote: string;
  doc_id: string;
  due_date: string | null;
  days_overdue: number;
  days_waiting: number;
  value_usd: number | null;
  score: number;
  reason: string;
  needs_review: boolean;
  primary?: boolean; // highest-ranked item for its account
  also_docs?: string[]; // other documents that raised the same task (merged)
}

export interface Model {
  generated_at: string;
  reference_date: string;
  models: { extract: string; reason: string };
  accounts: Account[];
  signals: Signal[];
  radar: RadarItem[];
  suggestions: CrmSuggestion[];
  docs: SourceDoc[];
  kpis: {
    open_pipeline: number;
    won: number;
    lost: number;
    waiting_on_atliq: number;
    overdue_actions: number;
    not_in_crm: number;
    open_deals: number;
  };
}
