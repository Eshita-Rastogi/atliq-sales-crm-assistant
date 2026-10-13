# Eval report — AtliQ Sales & CRM Assistant

Generated 2026-10-13T16:15 · models: openai/gpt-oss-20b (extraction) / openai/gpt-oss-120b (reasoning) · reference date 2026-07-10

**12/12 checks passed**

| Check | Result | Pass |
|---|---|---|
| Signal recall — dropped follow-ups caught (answer key) | 30/30 (100%) | ✅ |
| Critical deals present in Deal Radar | FinEdge #1, NovaPharma #6, ShopSwift #2, Meridian #4, HealthFirst #5 | ✅ |
| Critical deals ranked in top 15 | FinEdge #1, NovaPharma #6, ShopSwift #2, Meridian #4, HealthFirst #5 | ✅ |
| Leads missing from CRM detected | 5/5: harbor, nimbus, lumino, pixelworks, ridgeline | ✅ |
| Meridian duplicate flagged (L-1003 / L-1027) | Looks like the same client entered twice (different owners). Review and merge manually. | ✅ |
| GlobalMart L-1004 / L-1040 flagged as separate opportunity (not merged) | Same client, different service line — may be a separate opportunity. Review before merging. | ✅ |
| Kaveri no longer 'Lost' (vendor failed, demo held) | AI stage: Re-engaged | ✅ |
| ClearPath re-opened (budget unfrozen) | AI stage: Re-engaged | ✅ |
| Trustline moved past 'Proposal Sent' (approved) | AI stage: Negotiation | ✅ |
| Date accuracy on key deadlines | ShopSwift SOW: 2026-07-15 ✓; NovaPharma questionnaire: 2026-07-24 ✓; HealthFirst board: 2026-07-14 ✓; Quantia revisit (Q2 2026): 2026-06-30 ✓ | ✅ |
| Grounding — every kept quote exists verbatim in its source | 124/124 verbatim; 2 model outputs dropped by the quote check | ✅ |
| Answer-key notes excluded from AI input | 0 documents contain editorial notes | ✅ |
