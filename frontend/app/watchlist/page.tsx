import { AppShell } from "@/components/app-shell";
import { WatchlistPage } from "@/components/pages/watchlist-page";

export const metadata = { title: "Watchlist — Voltrex Terminal" };

export default function Page() {
  return (
    <AppShell>
      <WatchlistPage />
    </AppShell>
  );
}
