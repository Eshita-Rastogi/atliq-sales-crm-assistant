import { Home } from "@/components/Home";
import { fmtDate } from "@/lib/format";
import { model } from "@/lib/model";

export default function Page() {
  const accounts = model.accounts.map((a) => ({
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
