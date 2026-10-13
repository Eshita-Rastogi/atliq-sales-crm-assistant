import { TodayList } from "@/components/TodayList";
import { model } from "@/lib/model";

export default function TodayPage() {
  const nextActions = Object.fromEntries(model.accounts.map((a) => [a.id, a.next_best_action]));
  return <TodayList items={model.radar} nextActions={nextActions} />;
}
