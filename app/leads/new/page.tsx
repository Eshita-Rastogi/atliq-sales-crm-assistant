import { NewLeadForm } from "@/components/NewLeadForm";
import { model } from "@/lib/model";

export default function NewLeadPage() {
  const existing = model.accounts.map((a) => ({ id: a.id, company: a.company, email: a.contact_email, owner: a.owner }));
  return <NewLeadForm existing={existing} />;
}
