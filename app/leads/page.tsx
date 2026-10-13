import { Suspense } from "react";
import { LeadsView } from "@/components/LeadsView";
import { leadRows } from "@/lib/rows";
import { model } from "@/lib/model";

export default function LeadsPage() {
  return (
    <Suspense>
      <LeadsView
        rows={leadRows()}
        items={model.radar.map((r) => ({ signal_id: r.signal_id, account_id: r.account_id, days_overdue: r.days_overdue, due_date: r.due_date, title: r.title }))}
      />
    </Suspense>
  );
}
