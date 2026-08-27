import { AppShell } from "@/components/app-shell";
import { PortfolioPage } from "@/components/pages/portfolio-page";

export const metadata = { title: "Portfolio — Voltrex Terminal" };

export default function Page() {
  return (
    <AppShell>
      <PortfolioPage />
    </AppShell>
  );
}
