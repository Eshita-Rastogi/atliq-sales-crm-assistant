import { Home } from "@/components/Home";
import { fmtDate } from "@/lib/format";
import { model } from "@/lib/model";
import { leadRows } from "@/lib/rows";

export default function Page() {
  const fieldsById = Object.fromEntries(leadRows().map((r) => [r.id, r.fields || {}]));
  const accounts = model.accounts.map((a) => ({
    fields: fieldsById[a.id] || {},
    id: a.id,
    company: a.company,
    owner: a.owner,
    value: a.value_usd,
    stage: a.ai_stage,
    in_crm: a.in_crm,
  }));
  const nextSteps = Object.fromEntries(model.accounts.map((a) => [a.id, a.next_best_action]));
  return <Home radar={model.radar} accounts={accounts} refDate={fmtDate(model.reference_date)} nextSteps={nextSteps} />;
}
