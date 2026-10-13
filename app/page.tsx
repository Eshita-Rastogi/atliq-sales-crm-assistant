import { PipelineBoard } from "@/components/PipelineBoard";
import { model } from "@/lib/model";

export default function Page() {
  const cards = model.accounts.map((a) => {
    const items = model.radar.filter((r) => r.account_id === a.id);
    return {
      id: a.id,
      company: a.company,
      owner: a.owner,
      value_usd: a.value_usd,
      ai_stage: a.ai_stage,
      crm_stage: a.crm_stage,
      in_crm: a.in_crm,
      days_since_touch: a.days_since_touch,
      duplicate_of: a.duplicate_of,
      competitor: a.competitor,
      service_interest: a.service_interest,
      overdue: items.filter((r) => r.days_overdue > 0).length,
      open: items.length,
    };
  });
  return <PipelineBoard cards={cards} kpis={model.kpis} />;
}
