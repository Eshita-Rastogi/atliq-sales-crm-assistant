import { Suspense } from "react";
import { LeadsView } from "@/components/LeadsView";
import { leadRows } from "@/lib/rows";

export default function LeadsPage() {
  return (
    <Suspense>
      <LeadsView rows={leadRows()} />
    </Suspense>
  );
}
