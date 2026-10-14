# Capstone 1 — AtliQ Sales & CRM Assistant · Submission

**Eshita Rastogi** · Codebasics AI PM · submitted 14 Oct 2026

> AtliQ doesn't lack leads — it lacks memory. ~$410k of pipeline was waiting on AtliQ, not the client. This assistant reads every email, note and meeting, pulls out each promise, client ask and deadline with the exact quote, tells each founder what to do today — and updates the CRM when they act. AI suggests, people decide.

| # | Step | Deliverable | File / link |
|---|---|---|---|
| 1 | Problem Discovery & User Research | Persona, empathy map, 5 Whys, root-cause problem statement, proposed solution | [1_Problem_Discovery_and_User_Research.xlsx](1_Problem_Discovery_and_User_Research.xlsx) |
| 2 | AI Opportunity Mapping | Miro board: 10-step sales workflow, pain points, AI cards, ethical risk cards and mitigations | [Miro board](https://miro.com/welcomeonboard/VmdZZURTR2FrV01lM25Bd2MrQkRjTGpZUUZvRHc1R0N0U010SDk2c01hWlBZclo2QTF1cDdOMXl1cm5Dbk4zWElnbTdUUVd2RHoxTDNuYjJxNk54MmZuQWs2ZnRycUJKT2NvakQ3ZGMrOTUzbWZaRko2aURCMkpnODVORjRYQkFNakdSWkpBejJWRjJhRnhhb1UwcS9BPT0hdjE=?share_link_id=957455336387) |
| 3 | AI PRD | PRD V1.1 with a dedicated **North Star & Metrics** section (§12), guardrails, evals, flow diagram | [3_AI_PRD_AtliQ_Sales_CRM_Assistant.docx](3_AI_PRD_AtliQ_Sales_CRM_Assistant.docx) · [flow diagram](3_PRD_Flow_Diagram.png) |
| 4 | Cost Estimation | Models, tokens per interaction, volumes, infrastructure, savings: **$2.31 / month vs ~$394 of founder time** | [4_Cost_Estimation.xlsx](4_Cost_Estimation.xlsx) |
| 5 | Working prototype | Code + README (how to run), deployed on Vercel. Eval **12 / 12** against the dataset's answer key | **Live:** https://atliq-sales-crm-assistant-eshita-rastogi.vercel.app · **Code + README:** [repo root](../README.md) |
| 6 | Presentation | 16 slides: problem & discovery, opportunity, solution & walkthrough, success metrics, risks & guardrails | [6_Presentation_Deck.pptx](6_Presentation_Deck.pptx) · [PDF](6_Presentation_Deck.pdf) |
| 7 | Stakeholder demo video | ~5 min pitch to AtliQ's founders and CEO, with the live prototype on real dataset scenarios | **Video:** VIDEO_LINK_HERE · [script](7_Demo_Video_Script.docx) |

## How to try the prototype in 2 minutes
1. Open the live link and pick **Karandeep** on the start screen (no login).
2. **Home** shows his top 5 actions. Open **#4 GlobalMart**: the CRM says "Proposal Sent", but the emails show Negotiation, and a promise ("Will respond by Friday") is overdue — with the source quote.
3. **Draft reply**: unknown answers appear as yellow **[TBD]**, never guessed. Nothing is ever sent by the AI.
4. **Mark done** → the stage and activity log update.
5. **🎙 Record / log meeting** → **▶ Try the demo recording** → AI minutes + follow-ups with real dates.
6. **How this AI works** explains what the AI does and never does (Microsoft HAX guidelines).
