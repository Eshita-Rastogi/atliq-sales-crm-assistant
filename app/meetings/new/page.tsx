import { Suspense } from "react";
import { LogMeeting } from "@/components/LogMeeting";
import { model } from "@/lib/model";

export default function NewMeetingPage() {
  const leads = [...model.accounts]
    .sort((a, b) => a.company.localeCompare(b.company))
    .map((a) => ({ id: a.id, company: a.company, owner: a.owner, value: a.value_usd }));
  return (
    <Suspense>
      <LogMeeting leads={leads} />
    </Suspense>
  );
}
