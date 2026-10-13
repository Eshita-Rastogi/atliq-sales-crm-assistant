# AtliQ Sales & CRM Assistant — prototype

An AI "sales memory" for AtliQ's founder-led sales team. It reads the CRM export, client email threads and meeting notes, finds what slipped through (client asks, our promises, deadlines, revisit dates, cross-sell hints and leads missing from the CRM), and turns them into a ranked daily action list, CRM updates for one-click approval and draft follow-ups.

**AI suggests, people decide:** the app has no send capability and never writes to the CRM without a human approving the change.

Capstone 1 · Codebasics AI PM · Eshita Rastogi. Built from the AI PRD (`AI PRD_AtliQ Sales & CRM Assistant.docx`).

## What you can do

| Screen | What it shows |
|---|---|
| **Pipeline** | KPI strip (open pipeline, won, lost, value waiting on AtliQ, overdue actions, leads missing from CRM) and a board with every stage. Toggle between the **AI view** (real stage from emails/notes) and **CRM as recorded**. |
| **Today** 🔔 | Notifications / reminders: every open client ask, promise, deadline, revisit and growth signal, ranked by urgency, value and days waiting. Each shows the reason, the source quote, the next best step, and **Done / Snooze / Draft reply**. |
| **Accounts** → Account 360 | One consolidated page per company: AI summary and highlights, next best step, open actions, a timeline of emails and meeting MOMs (with the extracted quotes highlighted), growth signals, the raw CRM record and suggested CRM updates. |
| **Lead tracking** | Every lead with source, owner, CRM stage vs AI stage, value, last touch and next action due. Tabs: active, not in CRM, no owner, stale (14+ days), possible duplicates. |
| **CRM updates** | Review queue of AI-proposed changes (new leads, status corrections, follow-up dates, duplicates) with **Approve / Edit / Reject** and an audit log. |
| **Ask AI** | Ask anything about the pipeline; answers cite the source document and say "Not found in the data" when unsupported. |

Use **Viewing as** (top right) to switch between the whole team and one seller.

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
