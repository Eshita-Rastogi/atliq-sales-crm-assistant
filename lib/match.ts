// Duplicate detection used when a lead is created (prevention) — same rules as the pipeline.

const STOP = new Set(["inc", "ltd", "llc", "group", "the", "pvt", "co", "and", "advisory", "agency", "solutions", "technologies"]);

export const nameKey = (s: string) =>
  s.toLowerCase().replace(/&/g, " ").replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter((x) => x && !STOP.has(x))[0] || "";

const FREE_MAIL = new Set(["gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "icloud.com"]);

export interface Existing {
  id: string;
  company: string;
  email: string;
  owner: string;
}

export function findDuplicates(company: string, email: string, existing: Existing[]) {
  const key = nameKey(company);
  const mail = email.trim().toLowerCase();
  const domain = mail.includes("@") ? mail.split("@")[1] : "";
  return existing
    .map((e) => {
      const reasons: string[] = [];
      if (mail && e.email && e.email.toLowerCase() === mail) reasons.push("same contact email");
      else if (domain && !FREE_MAIL.has(domain) && e.email.toLowerCase().endsWith("@" + domain)) reasons.push(`same email domain (${domain})`);
      if (key && key.length >= 3 && nameKey(e.company) === key) reasons.push("similar company name");
      return { ...e, reasons };
    })
    .filter((e) => e.reasons.length);
}
