import { LeadTable } from "@/components/LeadTable";
import { leadRows } from "@/lib/rows";

export default function LeadsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Lead tracking</h1>
        <p className="text-sm text-slate-500">
          Every lead from the CRM plus the ones found only in emails and notes. Track owner, real stage, last touch and the next action due.
        </p>
      </div>
      <LeadTable rows={leadRows()} />
    </div>
  );
}
