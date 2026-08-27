"use client";

import { Activity, LoaderCircle, Play, RefreshCw, Maximize2, Minimize2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";

import { EquilibriumChart } from "@/components/equilibrium-chart";
import { SignalBadge } from "@/components/ui";
import { api } from "@/lib/api";
import type { Candle, ScanResult, ScanRun } from "@/lib/types";
import { cn, formatInr } from "@/lib/utils";

export function ScannerPage() {
  const [scan, setScan] = useState<ScanRun | null>(null);
  const [scanning, setScanning] = useState(false);
  const [selected, setSelected] = useState<ScanResult | null>(null);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  const refresh = useCallback(async () => {
    const latest = await api.latestScan();
    setScan(latest);
    if (latest.results[0]) setSelected(latest.results[0]);
    setLoading(false);
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  useEffect(() => {
    if (!selected?.symbol) return;
    api.candles(selected.symbol).then((r) => setCandles(r.candles)).catch(() => { });
  }, [selected]);

  const visible = useMemo(() => {
    const q = query.trim().toUpperCase();
    return (scan?.results ?? []).filter(
      (r) => !q || r.symbol.includes(q) || r.signal.includes(q),
    );
  }, [query, scan]);

  async function runScan() {
    setScanning(true);
    try {
      const result = await api.runScan([]);
      setScan(result);
      if (result.results[0]) setSelected(result.results[0]);
    } finally {
      setScanning(false);
    }
  }

  return (
    <div className="sp-page">
      <div className="sp-header">
        <div>
          <p className="eyebrow">SIGNAL ENGINE</p>
          <h1 className="sp-title">Equilibrium scanner</h1>
          <p className="sp-subtitle">Ranked NSE opportunities from the Voltrex harmonic engine.</p>
        </div>
        <div className="sp-header-actions">
          <input
            className="sp-search"
            placeholder="Filter symbol, signal..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button className="button button-primary" onClick={runScan} disabled={scanning}>
            {scanning ? <LoaderCircle size={14} className="animate-spin" /> : <Play size={14} />}
            {scanning ? "Scanning..." : "Run scan"}
          </button>
          <button className="pf-refresh-btn" onClick={refresh} disabled={loading}>
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      <div className="sp-layout">
        {/* Left: signal list */}
        <div className="sp-list-panel">
          {scan?.run_id && (
            <div className="scan-meta">
              <div className="scan-meta-item"><span>RUN</span><strong>#{scan.run_id}</strong></div>
              <div className="scan-meta-item"><span>SYMBOLS</span><strong>{scan.symbols.length}</strong></div>
              <div className="scan-meta-item"><span>ERRORS</span><strong>{Object.keys(scan.errors).length}</strong></div>
              {scan.created_at && (
                <div className="scan-meta-item" style={{ marginLeft: "auto" }}>
                  <span>{new Date(scan.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
              )}
            </div>
          )}

          <div className="table-head" style={{ gridTemplateColumns: "1.5fr 1.2fr 0.8fr 1fr" }}>
            <span>Symbol</span><span>Price</span><span>RR</span><span>Score</span>
          </div>

          <div className="sp-signal-list">
            <AnimatePresence initial={false}>
              {visible.map((item, i) => (
                <motion.button
                  key={item.symbol} layout
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className={cn(
                    "signal-row",
                    selected?.symbol === item.symbol && "selected",
                    item.signal === "BUY" && "buy-row"
                  )}
                  style={{ gridTemplateColumns: "1.5fr 1.2fr 0.8fr 1fr" }}
                  onClick={() => setSelected(item)}
                >
                  <span className="symbol-cell">
                    <span className="rank">{String(i + 1).padStart(2, "0")}</span>
                    <span>
                      <strong>{item.symbol}</strong>
                    </span>
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
            {!visible.length && (
              <div className="empty-state">
                <Activity />
                <p>No results yet.</p>
                <span>Run the equilibrium scanner above.</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column wrapper */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", flex: 1 }}>
          {/* Right: chart + levels */}
          <div className="sp-chart-panel" style={{ minHeight: 450 }}>
            {selected ? (
              <>
                <div className="panel-header" style={{ padding: "14px 18px 0" }}>
                  <div>
                    <p className="eyebrow">02 / MARKET STRUCTURE</p>
                    <h2 style={{ margin: 0, fontSize: 15 }}>{selected.symbol} equilibrium map</h2>
                  </div>
                </div>
                <div className="structure-meta">
                  {[

                    {
                      label: "RSI", value: selected.rsi.toFixed(1),
                      color: selected.rsi > 70 ? "var(--red)" : selected.rsi < 30 ? "var(--green)" : undefined
                    },
                    { label: "ATR", value: formatInr(selected.atr) },
                    {
                      label: "Vol ×", value: `${selected.volume_ratio.toFixed(2)}x`,
                      color: selected.volume_ratio >= 1.2 ? "var(--green)" : undefined
                    },
                    {
                      label: "Chg", value: `${selected.change_percent >= 0 ? "+" : ""}${selected.change_percent.toFixed(2)}%`,
                      color: selected.change_percent >= 0 ? "var(--green)" : "var(--red)"
                    },
                  ].map((m) => (
                    <div className="structure-meta-item" key={m.label}>
                      <label>{m.label}</label>
                      <span style={{ color: m.color }}>{m.value}</span>
                    </div>
                  ))}
                </div>
                <EquilibriumChart candles={candles} selected={selected} />
                <div className="level-strip" style={{ gridTemplateColumns: "repeat(4, 1fr) 52px" }}>
                  <div className="level level-blue"><span>QS1</span><strong>{formatInr(selected.equilibrium.qs1)}</strong></div>
                  <div className="level level-green"><span>TV</span><strong>{formatInr(selected.equilibrium.tv)}</strong></div>
                  <div className="level level-white"><span>LTP</span><strong>{formatInr(selected.price)}</strong></div>
                  <div className="level level-gold"><span>QR1</span><strong>{formatInr(selected.equilibrium.qr1)}</strong></div>
                  <button
                    className="level level-expand"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "transparent",
                      border: "none",
                      borderLeft: "1px solid var(--line)",
                      color: "var(--muted)",
                      cursor: "pointer",
                      padding: 0,
                      transition: "color 0.2s, background-color 0.2s",
                    }}
                    onClick={() => setIsExpanded(true)}
                    title="Expand Chart"
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = "var(--green)";
                      e.currentTarget.style.backgroundColor = "rgba(82, 228, 184, 0.08)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = "var(--muted)";
                      e.currentTarget.style.backgroundColor = "transparent";
                    }}
                  >
                    <Maximize2 size={16} />
                  </button>
                </div>
              </>
            ) : (
              <div className="empty-state" style={{ minHeight: 400 }}>
                <Activity />
                <p>Select a symbol to view the chart.</p>
              </div>
            )}
          </div>

          {/* New Standalone Simulator Card */}
          <EquilibriumSimulator initialPrice={selected?.price} />
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(3, 7, 18, 0.25)",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
              zIndex: 9999,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "24px",
            }}
            onClick={() => setIsExpanded(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              style={{
                width: "100%",
                maxWidth: "1200px",
                backgroundColor: "#0d0e12",
                border: "1px solid var(--line)",
                borderRadius: "12px",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div
                style={{
                  padding: "16px 24px",
                  borderBottom: "1px solid var(--line)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <p className="eyebrow" style={{ margin: 0, color: "var(--green)" }}>
                    02 / MARKET STRUCTURE
                  </p>
                  <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 600, color: "var(--text)" }}>
                    {selected.symbol} equilibrium map (expanded)
                  </h2>
                </div>

                <button
                  onClick={() => setIsExpanded(false)}
                  style={{
                    background: "rgba(255, 255, 255, 0.03)",
                    border: "1px solid var(--line)",
                    borderRadius: "6px",
                    color: "var(--muted)",
                    cursor: "pointer",
                    padding: "8px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "color 0.2s, background-color 0.2s, border-color 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "var(--red)";
                    e.currentTarget.style.backgroundColor = "rgba(255, 107, 121, 0.1)";
                    e.currentTarget.style.borderColor = "rgba(255, 107, 121, 0.2)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "var(--muted)";
                    e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.03)";
                    e.currentTarget.style.borderColor = "var(--line)";
                  }}
                >
                  <Minimize2 size={18} />
                </button>
              </div>

              {/* Modal Structure Meta */}
              <div
                className="structure-meta"
                style={{
                  padding: "12px 24px",
                  backgroundColor: "rgba(255, 255, 255, 0.01)",
                  borderBottom: "1px solid var(--line)",
                  display: "flex",
                  gap: "24px",
                }}
              >
                {[

                  {
                    label: "RSI", value: selected.rsi.toFixed(1),
                    color: selected.rsi > 70 ? "var(--red)" : selected.rsi < 30 ? "var(--green)" : undefined
                  },
                  { label: "ATR", value: formatInr(selected.atr) },
                  {
                    label: "Vol ×", value: `${selected.volume_ratio.toFixed(2)}x`,
                    color: selected.volume_ratio >= 1.2 ? "var(--green)" : undefined
                  },
                  {
                    label: "Chg", value: `${selected.change_percent >= 0 ? "+" : ""}${selected.change_percent.toFixed(2)}%`,
                    color: selected.change_percent >= 0 ? "var(--green)" : "var(--red)"
                  },
                ].map((m) => (
                  <div className="structure-meta-item" key={m.label} style={{ borderRight: "none", marginRight: 0 }}>
                    <label>{m.label}</label>
                    <span style={{ color: m.color }}>{m.value}</span>
                  </div>
                ))}
              </div>

              {/* Modal Chart Container */}
              <div style={{ padding: "24px 24px 16px 24px", minHeight: 0 }}>
                <EquilibriumChart candles={candles} selected={selected} height={420} />
              </div>

              {/* Modal Level Strip */}
              <div className="level-strip" style={{ gridTemplateColumns: "repeat(4, 1fr)", borderTop: "1px solid var(--line)" }}>
                <div className="level level-blue" style={{ padding: "14px 24px" }}>
                  <span style={{ fontSize: "8px" }}>QS1</span>
                  <strong style={{ fontSize: "12px", marginTop: "6px" }}>{formatInr(selected.equilibrium.qs1)}</strong>
                </div>
                <div className="level level-green" style={{ padding: "14px 24px" }}>
                  <span style={{ fontSize: "8px" }}>TV</span>
                  <strong style={{ fontSize: "12px", marginTop: "6px" }}>{formatInr(selected.equilibrium.tv)}</strong>
                </div>
                <div className="level level-white" style={{ padding: "14px 24px" }}>
                  <span style={{ fontSize: "8px" }}>LTP</span>
                  <strong style={{ fontSize: "12px", marginTop: "6px" }}>{formatInr(selected.price)}</strong>
                </div>
                <div className="level level-gold" style={{ padding: "14px 24px" }}>
                  <span style={{ fontSize: "8px" }}>QR1</span>
                  <strong style={{ fontSize: "12px", marginTop: "6px" }}>{formatInr(selected.equilibrium.qr1)}</strong>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function EquilibriumSimulator({ initialPrice }: { initialPrice?: number }) {
  const [inputVal, setInputVal] = useState<string>("100.0");

  useEffect(() => {
    if (initialPrice != null) {
      setInputVal(initialPrice.toString());
    }
  }, [initialPrice]);

  const numVal = parseFloat(inputVal) || 0;

  const levels = useMemo(() => {
    if (numVal <= 0) return null;

    let rounded: number;
    if (numVal >= 40000) {
      rounded = Math.round(numVal / 100) * 100;
    } else {
      rounded = Math.round(numVal / 10) * 10;
    }

    const root = Math.sqrt(rounded);
    const sum1 = Math.floor(root);
    const sum2 = rounded > sum1 * (sum1 + 1) ? sum1 + 2 : sum1 + 1;

    const tv = sum1 * sum2;

    const qr1_raw = sum1 * (sum2 + 2);
    const qr2_raw = sum1 * (sum2 + 4);
    const qs1_raw = sum1 * (sum2 - 2);

    const qr1 = qr1_raw - sum1;
    const qr2 = qr2_raw - sum1;
    const qr3 = sum1 * (sum2 + 6) - sum1;

    const qs1 = qs1_raw + sum1;
    const qs2 = sum1 * (sum2 - 4) + sum1;
    const qs3 = sum1 * (sum2 - 6) + sum1;

    const difference = qr1_raw - qs1_raw;
    const sl_points = difference / 6;
    const option_sl = sl_points / 3;
    const sl_price = tv - sl_points;

    const reward = qr1 - tv;
    const risk = tv - sl_price;
    const rr_ratio = risk ? reward / risk : 0;

    return {
      rounded,
      root: Math.round(root * 100) / 100,
      sum1,
      sum2,
      tv: Math.round(tv * 100) / 100,
      qr1: Math.round(qr1 * 100) / 100,
      qr2: Math.round(qr2 * 100) / 100,
      qr3: Math.round(qr3 * 100) / 100,
      qs1: Math.round(qs1 * 100) / 100,
      qs2: Math.round(qs2 * 100) / 100,
      qs3: Math.round(qs3 * 100) / 100,
      sl_points: Math.round(sl_points * 100) / 100,
      option_sl: Math.round(option_sl * 100) / 100,
      sl_price: Math.round(sl_price * 100) / 100,
      rr_ratio: Math.round(rr_ratio * 100) / 100,
    };
  }, [numVal]);

  return (
    <div className="sp-chart-panel" style={{ minHeight: "auto", padding: "20px" }}>
      <div className="panel-header" style={{ padding: "0 0 16px 0", borderBottom: "1px solid var(--line)" }}>
        <div>
          <p className="eyebrow" style={{ color: "var(--green)" }}>03 / EQUILIBRIUM SIMULATOR</p>
          <h2 style={{ margin: 0, fontSize: 15 }}>Square-root harmonic projection matrix</h2>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "24px", marginTop: "16px" }}>
        {/* Input box */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <label style={{ font: "8px var(--font-mono)", color: "var(--faint)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
              Input Stock LTP
            </label>
            <input
              type="number"
              className="sp-search"
              style={{ width: "100%", height: "38px" }}
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder="Enter LTP..."
            />
          </div>
          {levels && (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", font: "11px var(--font-mono)", color: "var(--muted)" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Root (rounded):</span>
                <strong style={{ color: "var(--text)" }}>{levels.root}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Rounded Base:</span>
                <strong style={{ color: "var(--text)" }}>{levels.rounded}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Option SL Points:</span>
                <strong style={{ color: "var(--text)" }}>{levels.option_sl}</strong>
              </div>
            </div>
          )}
        </div>

        {/* Results Matrix */}
        {levels ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
            <div className="level level-white" style={{ flex: 1, padding: "10px" }}>
              <span>LTP (Simulated)</span>
              <strong>{formatInr(numVal)}</strong>
            </div>
            <div className="level level-green" style={{ flex: 1, padding: "10px" }}>
              <span>True Value (TV)</span>
              <strong>{formatInr(levels.tv)}</strong>
            </div>
            <div className="level level-gold" style={{ flex: 1, padding: "10px" }}>
              <span>Stop Loss (SL)</span>
              <strong style={{ color: "var(--red)" }}>{formatInr(levels.sl_price)}</strong>
            </div>

            <div className="level level-blue" style={{ flex: 1, padding: "10px" }}>
              <span>QS1 Level</span>
              <strong>{formatInr(levels.qs1)}</strong>
            </div>
            <div className="level level-blue" style={{ flex: 1, padding: "10px" }}>
              <span>QS2 Level</span>
              <strong>{formatInr(levels.qs2)}</strong>
            </div>
            <div className="level level-blue" style={{ flex: 1, padding: "10px" }}>
              <span>QS3 Level</span>
              <strong>{formatInr(levels.qs3)}</strong>
            </div>

            <div className="level level-gold" style={{ flex: 1, padding: "10px" }}>
              <span>QR1 Level</span>
              <strong>{formatInr(levels.qr1)}</strong>
            </div>
            <div className="level level-gold" style={{ flex: 1, padding: "10px" }}>
              <span>QR2 Level</span>
              <strong>{formatInr(levels.qr2)}</strong>
            </div>
            <div className="level level-gold" style={{ flex: 1, padding: "10px" }}>
              <span>QR3 Level</span>
              <strong>{formatInr(levels.qr3)}</strong>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", border: "1px dashed var(--line)", borderRadius: "8px", color: "var(--faint)", fontSize: "12px" }}>
            Enter a valid price to calculate equilibrium matrix.
          </div>
        )}
      </div>
    </div>
  );
}
