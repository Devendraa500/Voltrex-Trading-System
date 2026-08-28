"use client";

import { Search } from "lucide-react";
import { useState } from "react";

import { AppShell } from "@/components/app-shell";
import { TerminalDashboard } from "@/components/terminal-dashboard";

export default function TerminalPage() {
  const [query, setQuery] = useState("");

  const searchBar = (
    <div className="command-search">
      <Search size={15} />
      <input
        id="terminal-search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search symbol, signal…"
      />
    </div>
  );

  return (
    <AppShell topbarMiddle={searchBar}>
      <TerminalDashboard query={query} setQuery={setQuery} />
    </AppShell>
  );
}