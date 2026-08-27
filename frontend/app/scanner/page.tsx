import { AppShell } from "@/components/app-shell";
import { ScannerPage } from "@/components/pages/scanner-page";

export const metadata = { title: "Scanner — Voltrex Terminal" };

export default function Page() {
  return (
    <AppShell>
      <ScannerPage />
    </AppShell>
  );
}
