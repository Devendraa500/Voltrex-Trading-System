"use client";

import {
  Activity,
  Bell,
  BookOpen,
  CircleDollarSign,
  Gauge,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

// ── Theme toggle ─────────────────────────────────────────────────────────────
function useTheme() {
  const [isLight, setIsLight] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("voltrex-theme");
    const light = saved === "light";
    setIsLight(light);
    document.documentElement.classList.toggle("light", light);
  }, []);

  const toggle = (e?: React.MouseEvent) => {
    const doc = document as any;
    if (!e || !doc.startViewTransition) {
      setIsLight((prev) => {
        const next = !prev;
        document.documentElement.classList.toggle("light", next);
        localStorage.setItem("voltrex-theme", next ? "light" : "dark");
        return next;
      });
      return;
    }
    const x = e.clientX;
    const y = e.clientY;
    const endRadius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    const transition = doc.startViewTransition(() => {
      setIsLight((prev) => {
        const next = !prev;
        document.documentElement.classList.toggle("light", next);
        localStorage.setItem("voltrex-theme", next ? "light" : "dark");
        return next;
      });
    });
    transition.ready.then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${endRadius}px at ${x}px ${y}px)`] },
        { duration: 450, easing: "ease-in-out", pseudoElement: "::view-transition-new(root)" },
      );
    });
  };

  return { isLight, toggle };
}

function ThemeToggle({ isLight, onToggle }: { isLight: boolean; onToggle: (e: React.MouseEvent<HTMLButtonElement>) => void }) {
  return (
    <button
      type="button"
      className={`theme-toggle-btn lightbulb-toggle ${isLight ? "is-light" : "is-dark"}`}
      onClick={onToggle}
      title={isLight ? "Switch to dark mode" : "Switch to light mode"}
      aria-label={isLight ? "Switch to dark mode" : "Switch to light mode"}
    >
      <svg width="1.6em" height="1.6em" viewBox="0 0 32 32" aria-hidden="true" className="lightbulb-svg">
        <path className="lightbulb-filament" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
          d="M14.6 27.1c0-3.4 0-6.8-.1-10.2-.2-1-1.1-1.7-2-1.7-1.2-.1-2.3 1-2.2 2.3.1 1 .9 1.9 2.1 2h7.2c1.1-.1 2-1 2.1-2 .1-1.2-1-2.3-2.2-2.3-.9 0-1.7.7-2 1.7 0 3.4 0 6.8-.1 10.2" />
        <path className="lightbulb-outline" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
          d="M9.4 9.9c1.8-1.8 4.1-2.7 6.6-2.7 5.1 0 9.3 4.2 9.3 9.3 0 2.3-.8 4.4-2.3 6.1-.7.8-2 2.8-2.5 4.4 0 .2-.2.4-.5.4-.2 0-.4-.2-.4-.5v-.1c.5-1.8 2-3.9 2.7-4.8 1.4-1.5 2.1-3.5 2.1-5.6 0-4.7-3.7-8.5-8.4-8.5-2.3 0-4.4.9-5.9 2.5-1.6 1.6-2.5 3.7-2.5 6 0 2.1.7 4 2.1 5.6.8.9 2.2 2.9 2.7 4.9 0 .2-.1.5-.4.5h-.1c-.2 0-.4-.1-.4-.4-.5-1.7-1.8-3.7-2.5-4.5-1.5-1.7-2.3-3.9-2.3-6.1 0-2.3 1-4.7 2.7-6.5z" />
        <path stroke="currentColor" strokeWidth="2" d="M19.8 27.5h-7.6" />
        <path stroke="currentColor" strokeWidth="2" d="M19.8 29.2h-7.6" />
        <path stroke="currentColor" strokeWidth="2" d="M19.8 30.9h-7.6" />
        <g className="lightbulb-rays" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <path d="M16 5V1.3" /><path d="M27.5 15.8h3.9" /><path d="M23.6 7.9l2.7-2.5" />
          <path d="M8.4 7.9L5.7 5.4" /><path d="M4.5 15.8H.6" />
        </g>
      </svg>
    </button>
  );
}

const NAV_ITEMS = [
  { id: "terminal",  href: "/",          icon: <Gauge />,            label: "Terminal"  },
  { id: "scanner",   href: "/scanner",   icon: <Activity />,         label: "Scanner"   },
  { id: "watchlist", href: "/watchlist", icon: <BookOpen />,         label: "Watchlist" },
  { id: "alerts",    href: "/alerts",    icon: <Bell />,             label: "Alerts"    },
  { id: "portfolio", href: "/portfolio", icon: <CircleDollarSign />, label: "Portfolio" },
];

type AppShellProps = {
  children: React.ReactNode;
  topbarMiddle?: React.ReactNode;
  brokerLabel?: string;
};

export function AppShell({ children, topbarMiddle }: AppShellProps) {
  const pathname = usePathname();
  const { isLight, toggle: toggleTheme } = useTheme();
  const [open, setOpen] = useState(false);

  useEffect(() => { setOpen(false); }, [pathname]);

  return (
    <div className="terminal-shell">
      {/* ── Topbar ────────────────────────────────────────────────────── */}
      <header className="topbar" style={{ gridColumn: "1 / -1" }}>
        <div className="brand">
          <div className="brand-mark">V</div>
          <div><strong>VOLTREX</strong><span>TERMINAL</span></div>
        </div>

        {topbarMiddle !== undefined ? topbarMiddle : <div aria-hidden />}

        <div className="system-status">
          <ThemeToggle isLight={isLight} onToggle={toggleTheme} />
          <div className="system-status-badge">
            <span className="status-dot online" />
            <div>
              <strong>NSE DATA LIVE</strong>
              <span>Powered by TradingView</span>
            </div>
          </div>
        </div>
      </header>

      {/* ── Sidebar nav ──────────────────────────────────────────────── */}
      <motion.nav
        className="rail"
        style={{ gridRow: "2 / -1" }}
        initial={false}
        animate={{ width: open ? 170 : 62 }}
        transition={{ type: "spring", stiffness: 260, damping: 28, mass: 0.8 }}
        onHoverStart={() => setOpen(true)}
        onHoverEnd={() => setOpen(false)}
      >
        <div className="rail-group">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link href={item.href} key={item.id} prefetch style={{ textDecoration: "none" }}>
                <motion.div
                  className={cn("rail-item", active && "active")}
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                >
                  <span className="rail-item-icon">{item.icon}</span>
                  <AnimatePresence initial={false}>
                    {open && (
                      <motion.span
                        className="rail-item-label"
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -8 }}
                        transition={{ duration: 0.13, ease: "easeOut" }}
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.div>
              </Link>
            );
          })}
        </div>
      </motion.nav>

      {/* ── Page content ─────────────────────────────────────────────── */}
      <main className={cn("shell-main", open && "workspace-blurred")} style={{ gridRow: "2 / -1" }}>
        {children}
      </main>
    </div>
  );
}
