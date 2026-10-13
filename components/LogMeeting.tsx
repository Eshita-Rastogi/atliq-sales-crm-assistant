"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BackButton } from "./BackButton";
import { useAppState } from "./AppState";
import { Rate } from "./Rate";
import type { RadarItem } from "@/lib/types";
import { fmtDate, money } from "@/lib/format";

interface Action {
  title: string;
  owner: string;
  quote: string;
  due_date: string | null;
  needs_review: boolean;
}
interface Result {
  title: string;
  summary: string;
  highlights: string[];
  budget_usd: number | null;
  decision_maker: string;
  actions: Action[];
}

type Speech = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: (e: { resultIndex: number; results: { isFinal: boolean; 0: { transcript: string } }[] }) => void;
  onend: () => void;
};

const SAMPLE = `Call with Harpreet (AgroLink) just now. They aggregate prices from 40+ mandis by hand. Budget is around 38k approved this FY, decision is Harpreet plus their CEO, no committee. He wants the proposal before 10 July because he goes on leave on the 14th. Also asked if we can add price alerts for traders on WhatsApp. Dhaval to send proposal, Pranav to check the mandi data APIs by Friday.`;

// Log a meeting the moment it ends: type, paste or dictate → AI minutes + follow-ups.
export function LogMeeting({ leads }: { leads: { id: string; company: string; owner: string; value: number | null }[] }) {
  const params = useSearchParams();
  const router = useRouter();
  const { owner, addMeeting } = useAppState();
  const [lead, setLead] = useState(params.get("lead") || "");
  const [date, setDate] = useState("2026-07-10");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [res, setRes] = useState<Result | null>(null);
  const [keep, setKeep] = useState<Record<number, boolean>>({});
  const [useBudget, setUseBudget] = useState(true);
  const [listening, setListening] = useState(false);
  const [canDictate, setCanDictate] = useState(false);
  const rec = useRef<Speech | null>(null);
  // Meeting recorder (phone / laptop mic) -> Whisper transcription
  const [recording, setRecording] = useState(false);
  const [secs, setSecs] = useState(0);
  const [consent, setConsent] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [source, setSource] = useState("");
  const media = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const L = leads.find((l) => l.id === lead);

  useEffect(() => {
    const w = window as unknown as { SpeechRecognition?: new () => Speech; webkitSpeechRecognition?: new () => Speech };
    setCanDictate(!!(w.SpeechRecognition || w.webkitSpeechRecognition));
  }, []);

  function dictate() {
    const w = window as unknown as { SpeechRecognition?: new () => Speech; webkitSpeechRecognition?: new () => Speech };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) return;
    if (listening) {
      rec.current?.stop();
      return;
    }
    const r = new Ctor();
    r.lang = "en-IN";
    r.continuous = true;
    r.interimResults = false;
    r.onresult = (e) => {
      let text = "";
      for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) text += e.results[i][0].transcript;
      if (text) setNotes((n) => (n ? n.trimEnd() + " " : "") + text.trim());
    };
    r.onend = () => setListening(false);
    rec.current = r;
    r.start();
    setListening(true);
  }

  async function transcribe(blob: Blob, name: string, label: string) {
    setErr("");
    setTranscribing(true);
    try {
      const fd = new FormData();
      fd.append("audio", blob, name);
      const r = await fetch("/api/transcribe", { method: "POST", body: fd });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Transcription failed");
      setNotes((n) => (n ? n.trimEnd() + "\n\n" : "") + j.text);
      setSource(`${label} · transcribed by ${j.model}`);
      return j.text as string;
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Transcription failed");
      return "";
    } finally {
      setTranscribing(false);
    }
  }

  async function startRecording() {
    if (!consent) return setErr("Please confirm everyone in the meeting knows it is being recorded.");
    setErr("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const type = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((t) => MediaRecorder.isTypeSupported(t)) || "";
      const mr = new MediaRecorder(stream, type ? { mimeType: type, audioBitsPerSecond: 32000 } : undefined);
      chunks.current = [];
      mr.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks.current, { type: mr.mimeType || "audio/webm" });
        const ext = (mr.mimeType || "").includes("mp4") ? "m4a" : "webm";
        await transcribe(blob, `meeting.${ext}`, "Recorded in the app");
      };
      media.current = mr;
      mr.start(1000);
      setSecs(0);
      timer.current = setInterval(() => setSecs((s) => s + 1), 1000);
      setRecording(true);
    } catch {
      setErr("Microphone access was blocked — allow the mic for this site in your browser settings.");
    }
  }

  function stopRecording() {
    media.current?.stop();
    if (timer.current) clearInterval(timer.current);
    setRecording(false);
  }

  async function runDemo() {
    setLead((l) => l || "L-1030");
    setDate("2026-07-09");
    setNotes("");
    setRes(null);
    const audio = new Audio("/demo/meeting-demo.wav");
    audio.play().catch(() => {});
    const blob = await (await fetch("/demo/meeting-demo.wav")).blob();
    await transcribe(blob, "meeting-demo.wav", "Demo recording (GreenGrid debrief)");
  }

  async function onFile(f: File | undefined) {
    if (!f) return;
    await transcribe(f, f.name, `Uploaded file: ${f.name}`);
  }

  async function process() {
    if (!lead) return setErr("Pick the lead this meeting was with.");
    if (notes.trim().length < 15) return setErr("Add a few lines of notes first.");
    setErr("");
    setBusy(true);
    try {
      const r = await fetch("/api/mom", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ notes, company: L?.company, date }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Could not process notes");
      setRes(j);
      setKeep(Object.fromEntries(j.actions.map((_: Action, i: number) => [i, true])));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not process notes");
    } finally {
      setBusy(false);
    }
  }

  function save() {
    if (!res || !L) return;
    const id = `mom-${Date.now()}`;
    const me = owner && owner !== "All" ? owner : L.owner || "Unassigned";
    const items: RadarItem[] = res.actions
      .filter((_, i) => keep[i])
      .map((a, i) => ({
        signal_id: `${id}#${i}`,
        account_id: L.id,
        company: L.company,
        owner: ["Bhavin", "Dhaval", "Karandeep", "Jay"].includes(a.owner) ? a.owner : me,
        type: "meeting_action",
        title: a.title,
        quote: a.quote,
        doc_id: "",
        due_date: a.due_date,
        days_overdue: 0,
        days_waiting: 0,
        value_usd: L.value,
        score: 70,
        reason: `From meeting notes logged ${fmtDate(date)}`,
        needs_review: a.needs_review,
      }));
    const fields: Record<string, string> = {};
    if (useBudget && res.budget_usd && !L.value) fields.est_value_usd = String(res.budget_usd);
    addMeeting({ id, account_id: L.id, company: L.company, date, title: res.title, summary: res.summary, highlights: res.highlights, notes }, items, fields);
    router.push(`/leads/${encodeURIComponent(L.id)}`);
  }

  const input = "w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm";

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <BackButton />
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">📝 Log meeting notes</h1>
        <p className="text-sm text-slate-500">Capture it right after the call — type, paste or dictate. The AI writes the minutes and creates the follow-ups so nothing is lost.</p>
      </div>

      <section className="card border-indigo-200 bg-indigo-50/40 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold text-indigo-900">🎙 Record the meeting</h2>
          <button className="btn" onClick={runDemo} disabled={transcribing || recording}>▶ Try the demo recording</button>
        </div>
        <ol className="mt-2 list-decimal space-y-0.5 pl-5 text-xs text-slate-700">
          <li>Pick the lead below and tell everyone the meeting is being recorded.</li>
          <li>Tap <b>Start recording</b> and put the phone on the table (or record your 1-minute debrief right after the call).</li>
          <li>Tap <b>Stop</b> — the audio is transcribed, then <b>✦ Create minutes &amp; follow-ups</b> writes the MOM and actions.</li>
        </ol>
        <label className="mt-3 flex items-center gap-2 text-xs text-slate-700">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} /> Everyone in the meeting knows it is being recorded
        </label>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {recording ? (
            <button className="btn border-rose-300 bg-rose-50 text-rose-700" onClick={stopRecording}>■ Stop · {Math.floor(secs / 60)}:{String(secs % 60).padStart(2, "0")}</button>
          ) : (
            <button className="btn-primary px-3 py-1.5 text-sm" onClick={startRecording} disabled={transcribing}>● Start recording</button>
          )}
          <label className="btn cursor-pointer">
            ⬆ Upload audio (voice memo)
            <input type="file" accept="audio/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
          </label>
          {recording && <span className="text-xs text-rose-600">● Recording… keep this screen open</span>}
          {transcribing && <span className="animate-pulse text-xs text-indigo-700">Transcribing…</span>}
        </div>
        <details className="mt-3 rounded-lg bg-white p-3 text-xs text-slate-700 ring-1 ring-indigo-100">
          <summary className="cursor-pointer font-medium text-indigo-800">📱 Only have your phone? How to capture each kind of meeting</summary>
          <ul className="mt-2 space-y-1.5">
            <li><b>In person:</b> record here — phone on the table, <b>keep the screen on</b> (switching apps or locking the phone can stop the recording).</li>
            <li><b>Phone call on this phone:</b> the call uses the microphone, so this page can&apos;t record it. Use your phone&apos;s own call recorder (Android Phone app; iPhone call recording where available — it announces itself), then <b>⬆ Upload audio</b>. Or put the call on speaker and record on another device.</li>
            <li><b>Zoom / Meet / Teams on your phone:</b> use the meeting&apos;s own recording and upload it — or, in production, invite <b>notetaker@atliq.com</b> and it joins for you.</li>
            <li><b>Fastest for any meeting — the 1-minute debrief:</b> right after the call, tap ● Start and say the key points (budget, who decides, what you promised, by when). Works everywhere, stays well under the size limit.</li>
            <li><b>Coming in production — call the AI in:</b> on a phone call, tap <b>Add call</b>, dial the AtliQ note-taker number and <b>Merge</b>; it announces itself, records, and files the minutes on the lead. Or send a voice note to AtliQ&apos;s WhatsApp number.</li>
          </ul>
        </details>
        <p className="mt-2 text-[11px] text-slate-500">
          Prototype limit: about 10–15 minutes per recording. Online meetings (Zoom / Meet / Teams): in production you invite the AtliQ note-taker to the calendar event and it joins, records and files the MOM automatically.
        </p>
      </section>

      <section className="card space-y-3 p-4">
        <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
          <label className="text-xs text-slate-600">
            Meeting with
            <select className={input} value={lead} onChange={(e) => setLead(e.target.value)}>
              <option value="">Choose a lead…</option>
              {leads.map((l) => <option key={l.id} value={l.id}>{l.company}</option>)}
            </select>
          </label>
          <label className="text-xs text-slate-600">
            Date
            <input type="date" className={input} value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
        </div>
        <label className="block text-xs text-slate-600">
          Notes
          <textarea
            className={`${input} min-h-40`}
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
              setErr("");
            }}
            placeholder="What was discussed, budget, who decides, what you promised and by when…"
          />
        </label>
        <div className="flex flex-wrap items-center gap-2">
          {canDictate ? (
            <button className={listening ? "btn border-rose-300 bg-rose-50 text-rose-700" : "btn"} onClick={dictate}>
              {listening ? "■ Stop dictation" : "🎤 Dictate"}
            </button>
          ) : (
            <span className="text-xs text-slate-400">Dictation needs Chrome or Edge — or use your phone keyboard&apos;s mic.</span>
          )}
          <button className="text-xs text-indigo-700 underline" onClick={() => setNotes(SAMPLE)}>Use sample notes</button>
          <button className="btn-primary ml-auto px-3 py-1.5 text-sm" onClick={process} disabled={busy}>{busy ? "Writing minutes…" : "✦ Create minutes & follow-ups"}</button>
        </div>
        {listening && <p className="text-xs text-rose-600">● Listening… speak naturally, then press Stop.</p>}
        {source && <p className="text-xs text-emerald-700">✓ Notes filled from: {source}. Review, then create the minutes.</p>}
        {err && <p className="text-[13px] text-rose-600">{err}</p>}
      </section>

      {res && (
        <section className="card space-y-4 p-4">
          <div>
            <div className="text-xs text-slate-500">{L?.company} · {fmtDate(date)}</div>
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-slate-900">{res.title}</h2>
              <Rate id={`mom:${lead}:${date}:${res.title}`} kind="Meeting minutes" />
            </div>
            <p className="mt-1 text-sm text-slate-700">{res.summary}</p>
            {res.highlights.length > 0 && (
              <ul className="mt-2 flex flex-wrap gap-1.5">{res.highlights.map((h) => <li key={h} className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-700">{h}</li>)}</ul>
            )}
            {res.decision_maker && <p className="mt-2 text-xs text-slate-600">Decision-maker: <b>{res.decision_maker}</b></p>}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Follow-ups to create ({res.actions.filter((_, i) => keep[i]).length})</h3>
            <ul className="mt-2 space-y-2">
              {res.actions.map((a, i) => (
                <li key={i} className="flex gap-2 text-sm">
                  <input type="checkbox" className="mt-1" checked={!!keep[i]} onChange={(e) => setKeep({ ...keep, [i]: e.target.checked })} />
                  <div>
                    <div className="font-medium text-slate-800">{a.title}</div>
                    <div className="text-xs text-slate-500">{a.owner || "you"} · {a.due_date ? `due ${fmtDate(a.due_date)}` : "no date"}{a.needs_review ? " · check date" : ""}</div>
                    <blockquote className="quote mt-1">“{a.quote}”</blockquote>
                  </div>
                </li>
              ))}
              {res.actions.length === 0 && <li className="text-sm text-slate-500">No actions found in these notes.</li>}
            </ul>
          </div>
          {res.budget_usd && !L?.value && (
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={useBudget} onChange={(e) => setUseBudget(e.target.checked)} /> Set deal value to {money(res.budget_usd)} (from the notes)
            </label>
          )}
          <div className="flex justify-end gap-2">
            <button className="btn" onClick={() => setRes(null)}>Edit notes</button>
            <button className="btn-primary px-3 py-1.5 text-sm" onClick={save}>Save to {L?.company}</button>
          </div>
        </section>
      )}
    </div>
  );
}
