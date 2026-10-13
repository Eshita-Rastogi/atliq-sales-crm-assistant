import type { LeadRow } from "@/components/LeadTable";
import { model } from "./model";

export function leadRows(): LeadRow[] {
  return model.accounts.map((a) => {
    const items = model.radar.filter((r) => r.account_id === a.id && r.due_date).sort((x, y) => x.due_date!.localeCompare(y.due_date!));
    return {
      id: a.id,
      company: a.company,
      in_crm: a.in_crm,
      source: a.source,
      owner: a.owner,
      service: a.service_interest,
      crm_stage: a.crm_stage,
      ai_stage: a.ai_stage,
      value: a.value_usd,
      last_touch: a.last_touch,
      days: a.days_since_touch,
      open: model.radar.filter((r) => r.account_id === a.id).length,
      overdue: items.filter((r) => r.days_overdue > 0).length,
      next_due: items[0]?.due_date ?? null,
      next_title: items[0]?.title ?? "",
      duplicate: a.duplicate_of.length > 0,
    };
  });
}
