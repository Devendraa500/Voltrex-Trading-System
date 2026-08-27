"use client";

import {
  ChevronRight,
  LoaderCircle,
  RefreshCw,
  Sparkles,
  Target,
  TrendingUp,
  ShieldCheck,
  Activity,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";

import { CsvChart } from "@/components/csv-chart";
import { Button, Panel, PanelHeader } from "@/components/ui";
import { demoScan, demoCandles } from "@/lib/api";
import type { Candle, ScanResult, ScanRun } from "@/lib/types";
import { cn, formatInr } from "@/lib/utils";

type TerminalDashboardProps = {
  query: string;
  setQuery: (v: string) => void;
  onBrokerReady?: (ready: boolean) => void;
};

export function TerminalDashboard({ query, setQuery, onBrokerReady }: TerminalDashboardProps) {
  const [scan, setScan]                     = useState<ScanRun | null>(null);
  const [selectedSymbol, setSelectedSymbol] = useState<string>("");
  const [candles, setCandles]               = useState<Candle[]>([]);
  const [loading, setLoading]               = useState(true);
  const [refreshing, setRefreshing]         = useState(false);
  const [error, setError]                   = useState<string | null>(null);

  const selected = useMemo(
    () => scan?.results.find((r) => r.symbol === selectedSymbol) ?? scan?.results[0] ?? null,
    [scan, selectedSymbol],
  );

  const visibleResults = useMemo(() => {
    const normalized = query.trim().toUpperCase();
    return (scan?.results ?? []).filter(
      (r) => !normalized || r.symbol.includes(normalized) || r.signal.includes(normalized),
    );
  }, [query, scan]);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const result = await demoScan();
      setScan(result);
      const firstSymbol = result.results[0]?.symbol ?? "";
      setSelectedSymbol(firstSymbol);
      onBrokerReady?.(true);
      // Load candles for the first symbol immediately
      if (firstSymbol) {
        const c = await demoCandles(firstSymbol);
        setCandles(c);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [onBrokerReady]);

  useEffect(() => { void load(); }, [load]);

  // Load candles whenever selected symbol changes
  useEffect(() => {
    if (!selectedSymbol) return;
    demoCandles(selectedSymbol).then(setCandles).catch(() => setCandles([]));
  }, [selectedSymbol]);

  // Ticker tape
  const tickerItems = useMemo(
    () => (scan?.results ?? []).map((r) => ({ symbol: r.symbol, price: r.price, change: r.change_percent })),
    [scan],
  );

  if (loading) {
    return (
      <main className="loading-screen">
        <div className="brand-mark">V</div>
        <LoaderCircle className="animate-spin" />
        <p>Loading market data…</p>
      </main>
    );
  }

  return (
    <>
      {/* ── Ticker tape ──────────────────────────────────────────────── */}
      {tickerItems.length > 0 && (
        <div className="ticker-tape">
          <div className="ticker-track">
            {[...tickerItems, ...tickerItems].map((item, i) => (
              <span key={i} className="ticker-item">
                <strong>{item.symbol}</strong>
                <span className="ticker-price">{formatInr(item.price)}</span>
                <span className={cn("ticker-chg", item.change >= 0 ? "gain" : "loss")}>
                  {item.change >= 0 ? "+" : ""}{item.change.toFixed(2)}%
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="workspace-inner">
        {/* ── Hero ─────────────────────────────────────────────────── */}
        <section className="hero-strip">
          <div>
            <p className="eyebrow">VOLTREX EQUILIBRIUM ENGINE</p>
            <h1>Institutional market structure, resolved.</h1>
            <p className="hero-copy">
              Deterministic execution levels, regime intelligence, and
              advanced scanning for NSE equities.
            </p>
          </div>
          <Button onClick={() => void load(true)} disabled={refreshing}>
            {refreshing ? <LoaderCircle className="animate-spin" size={16} /> : <RefreshCw size={16} />}
            {refreshing ? "Refreshing…" : "Refresh analysis"}
          </Button>
        </section>

        {error && (
          <div className="error-banner">
            <ShieldCheck size={16} />
            <span>{error}</span>
            <button onClick={() => setError(null)}><X size={14} /></button>
          </div>
        )}

        {/* ── Metric strip ─────────────────────────────────────────── */}
        <section className="metric-grid">
          <Metric
            label="Setups resolved"
            value={String(scan?.results.length ?? 0).padStart(2, "0")}
            detail="From static NSE dataset"
            icon={<Target />}
          />
          <Metric
            label="High conviction"
            value={String(scan?.results.filter((r) => r.score >= 60).length ?? 0).padStart(2, "0")}
            detail="Grade A / B structures"
            icon={<Sparkles />}
            accent
          />
          <Metric
            label="Buy signals"
            value={String(scan?.results.filter((r) => r.signal === "BUY").length ?? 0).padStart(2, "0")}
            detail="Above TV with momentum"
            icon={<TrendingUp />}
            positive
          />
          <Metric
            label="Avg risk/reward"
            value={
              scan?.results.length
                ? (scan.results.reduce((s, r) => s + r.risk_reward, 0) / scan.results.length).toFixed(2)
                : "—"
            }
            detail="Equilibrium-calculated RR"
            icon={<ShieldCheck />}
          />
        </section>

        {/* ── Primary grid ─────────────────────────────────────────── */}
        <section className="primary-grid">
          {/* Scanner list */}
          <Panel className="scanner-panel">
            <PanelHeader
              eyebrow="01 / SIGNAL ENGINE"
              title="Ranked opportunities"
              action={
                <button className="icon-action" onClick={() => void load(true)}>
                  <RefreshCw size={14} />
                </button>
              }
            />
            <div className="table-head">
              <span>Symbol</span>
              <span>Price</span>
              <span>RR</span>
              <span>Score</span>
            </div>
            <div className="signal-list">
              <AnimatePresence initial={false}>
                {visibleResults.map((item, index) => (
                  <motion.button
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    key={item.symbol}
                    onClick={() => setSelectedSymbol(item.symbol)}
                    className={cn(
                      "signal-row",
                      selected?.symbol === item.symbol && "selected",
                      item.signal === "BUY" && "buy-row",
                    )}
                  >
                    <span className="symbol-cell">
                      <span className="rank">{String(index + 1).padStart(2, "0")}</span>
                      <span><strong>{item.symbol}</strong></span>
                    </span>
                    <span className="mono">
                      {formatInr(item.price)}
                      <small className={item.change_percent >= 0 ? "gain" : "loss"}>
                        {item.change_percent >= 0 ? "+" : ""}{item.change_percent.toFixed(2)}%
                      </small>
                    </span>
                    <span className="mono">{item.risk_reward.toFixed(2)}</span>
                    <span className="score-cell">
                      <span>{item.score.toFixed(0)}</span>
                      <i style={{ width: `${item.score}%` }} />
                    </span>
                  </motion.button>
                ))}
              </AnimatePresence>
              {!visibleResults.length && (
                <div className="empty-state">
                  <Activity />
                  <p>No results.</p>
                  <span>Try refreshing the analysis.</span>
                </div>
              )}
            </div>
          </Panel>

          {/* Chart + equilibrium */}
          <Panel className="structure-panel">
            <PanelHeader
              eyebrow="02 / MARKET STRUCTURE"
              title={selected ? `${selected.symbol} — Equilibrium chart` : "Select a symbol"}
            />
            {selected && (
              <div className="structure-meta">
                <div className="structure-meta-item">
                  <label>RSI</label>
                  <span style={{ color: selected.rsi > 70 ? "var(--red)" : selected.rsi < 30 ? "var(--green)" : "var(--text)" }}>
                    {selected.rsi.toFixed(1)}
                  </span>
                </div>
                <div className="structure-meta-item">
                  <label>ATR</label>
                  <span>{formatInr(selected.atr)}</span>
                </div>
                <div className="structure-meta-item">
                  <label>Regime</label>
                  <span style={{ color: selected.regime === "BULL" ? "var(--green)" : selected.regime === "BEAR" ? "var(--red)" : "var(--muted)" }}>
                    {selected.regime}
                  </span>
                </div>
                <div className="structure-meta-item">
                  <label>Chg</label>
                  <span className={selected.change_percent >= 0 ? "gain" : "loss"}>
                    {selected.change_percent >= 0 ? "+" : ""}{selected.change_percent.toFixed(2)}%
                  </span>
                </div>
              </div>
            )}
            <CsvChart candles={candles} selected={selected} height={300} />
            {selected && (
              <div className="level-strip">
                <Level label="QS1" value={selected.equilibrium.qs1} tone="blue"  />
                <Level label="TV"  value={selected.equilibrium.tv}  tone="green" />
                <Level label="LTP" value={selected.price}           tone="white" />
                <Level label="QR1" value={selected.equilibrium.qr1} tone="gold"  />
              </div>
            )}
          </Panel>
        </section>

        {/* ── Secondary grid ───────────────────────────────────────── */}
        <section className="secondary-grid">
          <Panel>
            <PanelHeader eyebrow="03 / EXECUTION" title="Trade construction" />
            {selected ? (
              <>
                <div className="execution-grid">
                  <ExecutionValue label="Entry"          value={selected.price}       />
                  <ExecutionValue label="Stop"           value={selected.stop_loss}   />
                  <ExecutionValue label="Target"         value={selected.target}      />
                  <ExecutionValue label="Risk / reward"  value={selected.risk_reward} raw />
                  <ExecutionValue label="Position units" value={selected.quantity}    raw />
                  <ExecutionValue label="ATR"            value={selected.atr}         raw />
                </div>
                <div style={{ padding: "8px 18px 18px" }}>
                  <span style={{ fontSize: 11, color: "var(--muted)", fontFamily: "var(--font-mono)" }}>
                    Analysis via Voltrex Equilibrium Engine · Chart data from NSE historical dataset
                  </span>
                </div>
              </>
            ) : (
              <div className="empty-state compact">Select a resolved symbol.</div>
            )}
          </Panel>

          <Panel>
            <PanelHeader
              eyebrow="04 / INTELLIGENCE"
              title="Setup interpretation"
              action={
                selected && (
                  <span className={cn(
                    "intelligence-badge",
                    selected.signal === "BUY" ? "intel-high" : selected.signal === "SELL" ? "intel-medium" : "intel-low",
                  )}>
                    {selected.signal}
                  </span>
                )
              }
            />
            {selected ? (
              <div className="intelligence">
                <p className="intelligence-summary">{selected.technical_signal}</p>
                <div className="evidence"><span className="evidence-dot" />RSI: {selected.rsi.toFixed(1)} — {selected.rsi < 30 ? "Oversold" : selected.rsi > 70 ? "Overbought" : "Neutral"}</div>
                <div className="evidence"><span className="evidence-dot" />Regime: {selected.regime} market structure</div>
                <div className="evidence"><span className="evidence-dot" />Volume ratio: {selected.volume_ratio.toFixed(2)}× 20-day average</div>
                <div className="evidence"><span className="evidence-dot" />Equilibrium grade: {selected.grade} (score {selected.score}/100)</div>
                <small style={{ color: "var(--faint)", fontSize: 10 }}>
                  For educational purposes only. Not investment advice.
                </small>
              </div>
            ) : (
              <div className="empty-state compact">Select a symbol to see analysis.</div>
            )}
          </Panel>

          <Panel>
            <PanelHeader
              eyebrow="05 / WATCHLIST"
              title="NSE equities"
              action={<span className="timestamp">{scan?.results.length ?? 0} SYMBOLS</span>}
            />
            <div className="watchlist">
              {(scan?.results ?? []).slice(0, 8).map((r) => (
                <button key={r.symbol} onClick={() => setSelectedSymbol(r.symbol)}>
                  <span>
                    <strong>{r.symbol}</strong>
                    <small>{r.signal}</small>
                  </span>
                  <span className="watch-price">
                    {formatInr(r.price)}
                    <ChevronRight size={13} />
                  </span>
                </button>
              ))}
            </div>
          </Panel>
        </section>
      </div>
    </>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Metric({ label, value, detail, icon, accent, positive }: {
  label: string; value: string; detail: string; icon: React.ReactNode; accent?: boolean; positive?: boolean;
}) {
  return (
    <Panel className={cn("metric", accent && "metric-accent")}>
      <div className="metric-icon">{icon}</div>
      <p>{label}</p>
      <strong className={positive ? "gain" : undefined}>{value}</strong>
      <span>{detail}</span>
    </Panel>
  );
}

function Level({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className={`level level-${tone}`}>
      <span>{label}</span>
      <strong>{formatInr(value)}</strong>
    </div>
  );
}

function ExecutionValue({ label, value, raw }: { label: string; value: number; raw?: boolean }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{raw ? value.toLocaleString("en-IN") : formatInr(value)}</strong>
    </div>
  );
}