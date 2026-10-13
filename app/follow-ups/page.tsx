import { Suspense } from "react";
import { FollowUps } from "@/components/FollowUps";
import { model } from "@/lib/model";

export default function FollowUpsPage() {
  const nextSteps = Object.fromEntries(model.accounts.map((a) => [a.id, a.next_best_action]));
  const values = Object.fromEntries(model.accounts.map((a) => [a.id, a.value_usd]));
  const stages = Object.fromEntries(model.accounts.map((a) => [a.id, a.ai_stage]));
  return (
    <Suspense>
      <FollowUps items={model.radar} nextSteps={nextSteps} values={values} stages={stages} />
    </Suspense>
  );
}
