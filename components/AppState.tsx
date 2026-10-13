"use client";

import { createContext, useContext, useEffect, useState } from "react";

// Prototype state lives in the browser (localStorage): who you're viewing as,
// done/snoozed reminders, and approve/reject decisions with an audit log.

export interface Decision {
  id: string;
  decision: "approved" | "rejected";
  value: string;
  at: string;
  by: string;
}

interface State {
  owner: string;
  setOwner: (o: string) => void;
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
const KEY = "atliq-assistant-state-v1";

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [owner, setOwner] = useState("All");
  const [done, setDone] = useState<Record<string, string>>({});
  const [snoozed, setSnoozed] = useState<Record<string, string>>({});
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem(KEY) || "{}");
      if (s.owner) setOwner(s.owner);
      setDone(s.done || {});
      setSnoozed(s.snoozed || {});
      setDecisions(s.decisions || {});
    } catch {}
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(KEY, JSON.stringify({ owner, done, snoozed, decisions }));
    } catch {}
  }, [owner, done, snoozed, decisions, loaded]);

  const now = () => new Date().toISOString();
  const by = owner === "All" ? "Founder" : owner;

  return (
    <Ctx.Provider
      value={{
        owner,
        setOwner,
        done,
        snoozed,
        markDone: (id) => setDone((d) => ({ ...d, [id]: now() })),
        snooze: (id) => setSnoozed((d) => ({ ...d, [id]: now() })),
        undo: (id) => {
          const drop = (m: Record<string, string>) => Object.fromEntries(Object.entries(m).filter(([k]) => k !== id));
          setDone(drop);
          setSnoozed(drop);
        },
        decisions,
        decide: (id, decision, value) =>
          setDecisions((d) => ({ ...d, [id]: { id, decision, value, at: now(), by } })),
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
