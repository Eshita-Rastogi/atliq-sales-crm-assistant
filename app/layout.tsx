import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { AppStateProvider } from "@/components/AppState";
import { Shell } from "@/components/Shell";
import { model } from "@/lib/model";
import { fmtDate } from "@/lib/format";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AtliQ Sales & CRM Assistant",
  description: "AI sales memory for AtliQ's founder-led sales team",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const radar = model.radar.map((r) => ({ id: r.signal_id, owner: r.owner, overdue: r.days_overdue }));
  const owners = Object.fromEntries(model.accounts.map((a) => [a.id, a.owner]));
  const updates = model.suggestions.map((s) => ({ id: s.id, owner: owners[s.account_id] || "" }));
  return (
    <html lang="en">
      <body className={`${geist.className} antialiased`}>
        <AppStateProvider>
          <Shell radar={radar} updates={updates} refDate={fmtDate(model.reference_date)}>
            {children}
          </Shell>
        </AppStateProvider>
      </body>
    </html>
  );
}
