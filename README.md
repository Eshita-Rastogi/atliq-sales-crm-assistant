# AtliQ Sales & CRM Assistant — prototype

An AI "sales memory" for AtliQ's founder-led sales team. It reads the CRM export, client email threads and meeting notes, finds what slipped through (client asks, our promises, deadlines, revisit dates, cross-sell hints and leads missing from the CRM), and turns them into a ranked daily action list, CRM updates for one-click approval and draft follow-ups.

**AI suggests, people decide:** the app has no send capability and never writes to the CRM without a human approving the change.

Capstone 1 · Codebasics AI PM · Eshita Rastogi. Built from the AI PRD (`AI PRD_AtliQ Sales & CRM Assistant.docx`).

## What you can do

Start by picking who you are (Bhavin, Dhaval, Karandeep, Jay or *Whole team*); everything is then filtered to your deals. Switch anytime from the top bar.

| Screen | What it shows |
|---|---|
| **Home** | **Sales overview** (total leads, open — yet to close, closed won with revenue, closed lost, win rate, deals by stage), **needs your attention** (follow-ups overdue, due this week, new / untracked leads) and the **top 5 actions for today**. |
| **🔔 Notifications & reminders** | Bell panel: escalated, overdue, due today, due soon, your reminders. **Reminder settings**: daily digest time, days before a due date, escalation after N days overdue, channels (in-app live; email / WhatsApp planned), with a digest preview. "Remind me" on every follow-up. |
| **Follow-ups** 🔔 | Every open client ask, promise, deadline and revisit. View **by time** (Overdue · Today · This week · Later) or **by lead**; sort by priority or due date. Tick to mark done; expand a row for the source quote, the suggested next step and **Draft reply** / Snooze. |
| **Leads & deals** | Stage board (New → Contacted → Qualified → Proposal Sent → Negotiation → Won / Re-engaged / Lost) or list, with filters: active, overdue, new / untracked, no owner, no contact in 14+ days, possible duplicates. |
| **Lead page** | **About this lead** (who they are, why they're here, what they want) → **Status & next steps** (real stage, next step, open follow-ups) → tabs: **Activity** (emails & meeting MOMs), **AI insights**, **CRM details & updates** (approve / edit / reject). |
| **Ask AI** | Ask anything about the pipeline; answers cite the source document and say "Not found in the data" when unsupported. |
| Review CRM updates | Top-bar badge: all AI-suggested CRM changes for your leads, with an audit log. |
| **Working a lead** | Tick a follow-up done → record **what you did and when** (replied, call held, SOW sent, contract sent, signed…) → the lead **moves to the suggested stage**, last contact updates and the activity log records it. Move stages by hand on the lead's stage track. **Snooze** (hide until a date) and **Remind me** (ping on a date). **Lead profile % complete** with nudges, an edit form and AI-suggested values from the emails. |
| **📝 Log meeting notes** | Right after a call: type, paste or **dictate** (browser speech-to-text). The AI writes the MOM (summary, budget, decision-maker, highlights) and creates follow-ups with owners and due dates (quotes verified, dates in code). Appears instantly on the lead's timeline, in Follow-ups and reminders; can set the deal value from the notes. |
| **On the phone** | Bottom tab bar; Home shows what needs you first (attention, top 5) before the sales overview. |
| **+ New lead** | Add a lead by hand or **paste an email / note / business-card text** — the AI fills the form and finds follow-ups (verbatim quotes, dates in code). A **duplicate check** (contact email, email domain, company name) runs before saving. |
| **Merge duplicates** | Side-by-side review of possible duplicates (e.g. Meridian L-1003 / L-1027): choose the value per field, then **Merge** or **Keep both** (e.g. GlobalMart's two service lines). Never automatic; logged. |
| **Connect sources** | Per person: how to link Gmail / Outlook, calendar, meeting notes & transcripts, WhatsApp (Business API or forwarding), LinkedIn, a personal forward-to address and paste capture — what each reads / never touches, step-by-step setup and the permission screen. Connect is a clearly labelled simulation in the prototype. |
| **Data sources** | What the assistant reads today (dataset snapshot), how a document becomes a follow-up, and the integration roadmap (Gmail/Outlook, calendar, forward-to address, WhatsApp Business, CRM write-back). |

## How it works

```
emails + meeting notes + CRM export
  └─ strip editorial "what happened next" notes (kept only as the eval answer key)
  └─ extraction model reads each document  → signals with verbatim quotes
  └─ code: quote must exist word-for-word in the source, else dropped
  └─ code: due dates ("by 15 July", "Q2 2026", "after the 15th"), account linking, duplicates, missing leads
  └─ reasoning model per account            → real stage, summary, highlights, next best step, CRM suggestions
  └─ code: Deal Radar ranking (deadline, value, days waiting, competitor) + KPIs
  └─ data/generated/model.json  →  Next.js UI
Live: "Ask AI" and "Draft reply" call the reasoning model at request time.
```

- **Date maths, ranking and duplicate matching run in code, not in the model**, so they are exact and explainable.
- "Today" is fixed at **10 Jul 2026**, the dataset's reference date.
- Models (Groq, OpenAI-compatible API): `openai/gpt-oss-20b` for extraction, `openai/gpt-oss-120b` for reasoning, Q&A and drafts. The LLM layer (`lib/llm.ts`) is provider-agnostic; the PRD's production plan is Claude Haiku 5.5 (extraction) + Claude Opus 5.5 (generation).

## Run it locally

Requirements: Node.js 20+ and a Groq API key.

```bash
npm install
cp .env.example .env.local      # then put your key in GROQ_API_KEY=
npm run build:model             # runs the AI pipeline → data/generated/model.json (cached per document)
npm run eval                    # grades the AI against the dataset's answer key → data/generated/eval_report.md
npm run dev                     # http://localhost:3000
```

`data/generated/model.json` is committed, so the UI works even without re-running the pipeline. Without a key, `npm run build:model` builds a CRM-only model and the live Ask / Draft features show a "not configured" message.

## Deploy (Vercel via GitHub)

1. Push this repo to GitHub.
2. In Vercel: **Add New → Project → Import** the repo (framework: Next.js, defaults are fine).
3. Add the environment variable `GROQ_API_KEY` (Settings → Environment Variables) and deploy.

## Guardrails built in

- No send capability; drafts are copied by the seller. Missing facts appear as `[TBD]`.
- Every AI signal carries a verbatim quote; quotes not found in the source are dropped.
- CRM changes are suggestions with source quotes; nothing is written without approval; decisions are logged.
- Duplicates are flagged, never merged (e.g. GlobalMart L-1004 / L-1040 are different service lines).
- Ambiguous dates ("after the 15th") are flagged "Check date" instead of guessed.
- Ask AI flags any citation that doesn't exist in the data.

## Dataset changes

The dataset is used as provided (`data/`). Nothing was added. The editorial notes in emails and meeting notes are removed before any AI processing and used only by `npm run eval`. Prototype state (done / snoozed / approvals) is stored in the browser's localStorage.

## Project structure

```
app/                 pages (pipeline, today, accounts, leads, updates, ask, docs) and API routes (ask, draft)
components/          UI components
lib/                 dataset loader, dates, LLM client, prompts, types
scripts/             build-model.ts (AI pipeline), eval.ts (answer-key eval)
data/                dataset + generated/model.json
```
