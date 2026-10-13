import { UpdatesQueue } from "@/components/UpdatesQueue";
import { model } from "@/lib/model";

export default function UpdatesPage() {
  const companies = Object.fromEntries(model.accounts.map((a) => [a.id, a.company]));
  return <UpdatesQueue items={model.suggestions} companies={companies} />;
}
