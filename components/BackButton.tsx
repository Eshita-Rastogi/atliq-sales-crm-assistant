"use client";

import { useRouter } from "next/navigation";

// Returns to wherever the user came from (Home, Follow-ups, Leads…); falls back to Home.
export function BackButton() {
  const router = useRouter();
  return (
    <button
      onClick={() => (window.history.length > 1 ? router.back() : router.push("/"))}
      className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
    >
      ← Back
    </button>
  );
}
