import { AppShell } from "@/components/app-shell";
import { AlertsPage } from "@/components/pages/alerts-page";

export const metadata = { title: "Alerts — Voltrex Terminal" };

export default function Page() {
  return (
    <AppShell>
      <AlertsPage />
    </AppShell>
  );
}
