"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { RadarItem } from "@/lib/types";

// Prototype state lives in the browser (localStorage): who is using the app, done/snoozed
// reminders, approve/reject decisions (audit log), leads added by hand and merges.

export interface Decision {
  id: string;
  decision: "approved" | "rejected";
  value: string;
  at: string;
  by: string;
}

export interface CustomLead {
  id: string;
  company: string;
  contact_name: string;
  contact_email: string;
  source: string;
  service: string;
  value: number | null;
  owner: string;
  notes: string;
  created_at: string;
  created_by: string;
}

export interface Merge {
  keep: string; // surviving lead id
  drop: string; // merged-away lead id
  fields: Record<string, string>; // chosen values
  at: string;
  by: string;
}

interface State {
  ready: boolean;
  owner: string | null; // null = not chosen yet; "All" = whole team
  setOwner: (o: string | null) => void;
  done: Record<string, string>;
  snoozed: Record<string, string>;
  markDone: (id: string) => void;
  snooze: (id: string) => void;
  undo: (id: string) => void;
  decisions: Record<string, Decision>;
  decide: (id: string, decision: "approved" | "rejected", value: string) => void;
  customLeads: CustomLead[];
  customItems: RadarItem[];
  addLead: (lead: CustomLead, items: RadarItem[]) => void;
  merges: Merge[];
  merge: (m: Omit<Merge, "at" | "by">) => void;
  keepBoth: (a: string, b: string) => void;
  resetAll: () => void;
}

const Ctx = createContext<State | null>(null);
const KEY = "atliq-assistant-state-v2";

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [owner, setOwner] = useState<string | null>(null);
  const [done, setDone] = useState<Record<string, string>>({});
  const [snoozed, setSnoozed] = useState<Record<string, string>>({});
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [customLeads, setCustomLeads] = useState<CustomLead[]>([]);
  const [customItems, setCustomItems] = useState<RadarItem[]>([]);
  const [merges, setMerges] = useState<Merge[]>([]);

  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem(KEY) || "{}");
      if (s.owner) setOwner(s.owner);
      setDone(s.done || {});
      setSnoozed(s.snoozed || {});
      setDecisions(s.decisions || {});
      setCustomLeads(s.customLeads || []);
      setCustomItems(s.customItems || []);
      setMerges(s.merges || []);
    } catch {}
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify({ owner, done, snoozed, decisions, customLeads, customItems, merges }));
    } catch {}
  }, [owner, done, snoozed, decisions, customLeads, customItems, merges, ready]);

  const now = () => new Date().toISOString();
  const by = !owner || owner === "All" ? "Founder" : owner;
  const drop = (id: string) => (m: Record<string, string>) => Object.fromEntries(Object.entries(m).filter(([k]) => k !== id));
  const log = (id: string, decision: "approved" | "rejected", value: string) =>
    setDecisions((d) => ({ ...d, [id]: { id, decision, value, at: now(), by } }));

  return (
    <Ctx.Provider
      value={{
        ready,
        owner,
        setOwner,
        done,
        snoozed,
        markDone: (id) => setDone((d) => ({ ...d, [id]: now() })),
        snooze: (id) => setSnoozed((d) => ({ ...d, [id]: now() })),
        undo: (id) => {
          setDone(drop(id));
          setSnoozed(drop(id));
        },
        decisions,
        decide: log,
        customLeads,
        customItems,
        addLead: (lead, items) => {
          setCustomLeads((l) => [...l, lead]);
          setCustomItems((x) => [...x, ...items]);
          log(`${lead.id}:create_lead`, "approved", `Created lead ${lead.company}`);
        },
        merges,
        merge: (m) => {
          setMerges((x) => [...x.filter((y) => y.drop !== m.drop), { ...m, at: now(), by }]);
          log(`${[m.keep, m.drop].sort().join("|")}:merge`, "approved", `Merged ${m.drop} into ${m.keep}`);
          setDecisions((d) => {
            const id = `${[m.keep, m.drop].sort()[0]}:duplicate`;
            return { ...d, [id]: { id, decision: "approved", value: `Merged into ${m.keep}`, at: now(), by } };
          });
        },
        keepBoth: (a, b) => {
          const id = `${[a, b].sort()[0]}:duplicate`;
          log(id, "approved", `Kept ${a} and ${b} as separate opportunities`);
        },
        resetAll: () => {
          setDone({});
          setSnoozed({});
          setDecisions({});
          setCustomLeads([]);
          setCustomItems([]);
          setMerges([]);
        },
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAppState() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAppState outside provider");
  return c;
}

/** Does an item owned by `itemOwner` belong in the current view? */
export function inView(owner: string | null, itemOwner: string) {
  return !owner || owner === "All" || itemOwner === owner;
}
