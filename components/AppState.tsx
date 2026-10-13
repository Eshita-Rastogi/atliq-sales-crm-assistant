"use client";

import { createContext, useContext, useEffect, useState } from "react";

// Prototype state lives in the browser (localStorage): who is using the app,
// done/snoozed reminders, and approve/reject decisions with an audit log.

export interface Decision {
  id: string;
  decision: "approved" | "rejected";
  value: string;
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

  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem(KEY) || "{}");
      if (s.owner) setOwner(s.owner);
      setDone(s.done || {});
      setSnoozed(s.snoozed || {});
      setDecisions(s.decisions || {});
    } catch {}
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify({ owner, done, snoozed, decisions }));
    } catch {}
  }, [owner, done, snoozed, decisions, ready]);

  const now = () => new Date().toISOString();
  const by = !owner || owner === "All" ? "Founder" : owner;
  const drop = (id: string) => (m: Record<string, string>) => Object.fromEntries(Object.entries(m).filter(([k]) => k !== id));

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
        decide: (id, decision, value) => setDecisions((d) => ({ ...d, [id]: { id, decision, value, at: now(), by } })),
        resetAll: () => {
          setDone({});
          setSnoozed({});
          setDecisions({});
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
