"use client";

import { BookOpen, ChevronRight, Plus, Search, Trash2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useCallback, useEffect, useState } from "react";

import { api } from "@/lib/api";
import type { ScanRun, Watchlist } from "@/lib/types";
import { cn, formatInr } from "@/lib/utils";

export function WatchlistPage() {
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [scan, setScan]             = useState<ScanRun | null>(null);
  const [loading, setLoading]       = useState(true);
  const [addSymbol, setAddSymbol]   = useState("");

  const refresh = useCallback(async () => {
    const [w, s] = await Promise.all([api.watchlists(), api.latestScan()]);
    setWatchlists(w);
    setScan(s);
    setLoading(false);
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const wl = watchlists[0];

  async function addToWatchlist() {
    if (!wl || !addSymbol.trim()) return;
    const sym = addSymbol.trim().toUpperCase();
    if (wl.symbols.includes(sym)) { setAddSymbol(""); return; }
    const updated = await api.updateWatchlist(wl, [...wl.symbols, sym]);
    setWatchlists((prev) => prev.map((w) => w.id === updated.id ? updated : w));
    setAddSymbol("");
  }

  async function removeSymbol(symbol: string) {
    if (!wl) return;
    const updated = await api.updateWatchlist(wl, wl.symbols.filter((s) => s !== symbol));
    setWatchlists((prev) => prev.map((w) => w.id === updated.id ? updated : w));
  }

  const scanSymbols = scan?.results.map((r) => r.symbol) ?? [];
  const suggestions = scanSymbols.filter((s) => !(wl?.symbols ?? []).includes(s));

  return (
    <div className="pf-page">
      <div className="pf-header">
        <div>
          <p className="eyebrow">WATCHLIST MANAGER</p>
          <h1 className="pf-title">{wl?.name ?? "Core Equities"}</h1>
          <p className="pf-subtitle">
            {wl?.symbols.length ?? 0} tracked symbols · Symbols here are included in scanner runs.
          </p>
        </div>
      </div>

      {/* ── Add symbol ────────────────────────────────────────── */}
      <div className="al-create-panel">
        <p className="eyebrow" style={{ marginBottom: 14 }}>ADD SYMBOL</p>
        <div className="al-form-row">
          <div className="al-field" style={{ flex: 1 }}>
            <label>NSE Symbol</label>
            <input
              list="wl-symbols"
              className="al-input"
              placeholder="e.g. BAJFINANCE"
              value={addSymbol}
              onChange={(e) => setAddSymbol(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && addToWatchlist()}
            />
            <datalist id="wl-symbols">
              {suggestions.map((s) => <option key={s} value={s} />)}
            </datalist>
          </div>
          <button className="button button-primary al-create-btn" onClick={addToWatchlist} disabled={!addSymbol.trim()}>
            <Plus size={14} /> Add
          </button>
        </div>
      </div>

      {/* ── Symbol grid ───────────────────────────────────────── */}
      <div className="pf-section">
        <p className="eyebrow" style={{ marginBottom: 14 }}>TRACKED SYMBOLS</p>
        {!wl?.symbols.length ? (
          <div className="pf-empty">
            <BookOpen size={28} />
            <p>Watchlist is empty.</p>
            <span>Add NSE equity symbols above.</span>
          </div>
        ) : (
          <div className="wl-grid">
            <AnimatePresence initial={false}>
              {(wl?.symbols ?? []).map((sym) => {
                const result = scan?.results.find((r) => r.symbol === sym);
                const quote = scan?.quotes?.[sym];
                return (
                  <motion.div
                    key={sym} layout
                    initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                    className="wl-card"
                  >
                    <div className="wl-card-top">
                      <strong className="wl-symbol">{sym}</strong>
                      <button className="pf-action-btn danger" onClick={() => removeSymbol(sym)}>
                        <X size={13} />
                      </button>
                    </div>
                    {result ? (
                      <>
                        <div className="wl-price">{formatInr(result.price)}</div>
                        <div className={cn("wl-change", result.change_percent >= 0 ? "gain" : "loss")}>
                          {result.change_percent >= 0 ? "+" : ""}{result.change_percent.toFixed(2)}%
                        </div>

                      </>
                    ) : quote ? (
                      <>
                        <div className="wl-price">{formatInr(quote.price)}</div>
                        <div className={cn("wl-change", quote.change_percent >= 0 ? "gain" : "loss")}>
                          {quote.change_percent >= 0 ? "+" : ""}{quote.change_percent.toFixed(2)}%
                        </div>

                      </>
                    ) : (
                      <div className="wl-awaiting">AWAITING SCAN</div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* ── Suggestions from last scan ────────────────────────── */}
      {suggestions.length > 0 && (
        <div className="pf-section">
          <p className="eyebrow" style={{ marginBottom: 14 }}>FROM LAST SCAN (not in watchlist)</p>
          <div className="wl-suggestions">
            {suggestions.map((sym) => {
              const result = scan?.results.find((r) => r.symbol === sym)!;
              return (
                <button key={sym} className="wl-suggestion-row" onClick={() => { setAddSymbol(sym); }}>
                  <strong>{sym}</strong>
                  <span className="mono" style={{ fontSize: 11 }}>{formatInr(result.price)}</span>
                  <span className={cn(result.change_percent >= 0 ? "gain" : "loss")} style={{ fontSize: 11 }}>
                    {result.change_percent >= 0 ? "+" : ""}{result.change_percent.toFixed(2)}%
                  </span>
                  <Plus size={12} style={{ marginLeft: "auto", color: "var(--green)" }} />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
