"use client";

import { Bell, ChevronRight, Plus, Search, Trash2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useCallback, useEffect, useState } from "react";

import { api } from "@/lib/api";
import type { Alert, ScanRun, Watchlist } from "@/lib/types";
import { cn, formatInr } from "@/lib/utils";

export function AlertsPage() {
  const [alerts, setAlerts]   = useState<Alert[]>([]);
  const [scan, setScan]       = useState<ScanRun | null>(null);
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [loading, setLoading] = useState(true);

  // New alert form
  const [symbol, setSymbol]       = useState("");
  const [condition, setCondition] = useState<Alert["condition"]>("ABOVE");
  const [threshold, setThreshold] = useState("");
  const [creating, setCreating]   = useState(false);

  const refresh = useCallback(async () => {
    const [a, s, w] = await Promise.all([api.alerts(), api.latestScan(), api.watchlists()]);
    setAlerts(a);
    setScan(s);
    setWatchlists(w);
    setLoading(false);
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  async function createAlert() {
    if (!symbol) return;
    setCreating(true);
    try {
      const alert = await api.createAlert(symbol.toUpperCase(), condition, parseFloat(threshold) || 0);
      setAlerts((prev) => [alert, ...prev]);
      setSymbol(""); setThreshold("");
    } finally {
      setCreating(false);
    }
  }

  async function deleteAlert(id: string) {
    await api.deleteAlert(id);
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }

  async function toggle(id: string, active: boolean) {
    const updated = await api.toggleAlert(id, !active);
    setAlerts((prev) => prev.map((a) => a.id === id ? updated : a));
  }

  const watchlistSymbols = watchlists[0]?.symbols ?? [];
  const scanSymbols = scan?.results.map((r) => r.symbol) ?? [];
  const allSymbols = [...new Set([...watchlistSymbols, ...scanSymbols])];

  return (
    <div className="pf-page">
      <div className="pf-header">
        <div>
          <p className="eyebrow">ALERT MONITORS</p>
          <h1 className="pf-title">Price &amp; signal alerts</h1>
          <p className="pf-subtitle">Triggers are evaluated on every scanner run.</p>
        </div>
      </div>

      {/* ── Create alert form ─────────────────────────────────── */}
      <div className="al-create-panel">
        <p className="eyebrow" style={{ marginBottom: 14 }}>CREATE ALERT</p>
        <div className="al-form-row">
          {/* Symbol picker */}
          <div className="al-field">
            <label>Symbol</label>
            <input
              list="al-symbols"
              className="al-input"
              placeholder="RELIANCE"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            />
            <datalist id="al-symbols">
              {allSymbols.map((s) => <option key={s} value={s} />)}
            </datalist>
          </div>

          {/* Condition */}
          <div className="al-field">
            <label>Condition</label>
            <select
              className="al-input"
              value={condition}
              onChange={(e) => setCondition(e.target.value as Alert["condition"])}
            >
              <option value="ABOVE">Price above</option>
              <option value="BELOW">Price below</option>
              <option value="SIGNAL_BUY">Signal = BUY</option>
              <option value="SIGNAL_SELL">Signal = SELL</option>
            </select>
          </div>

          {/* Threshold */}
          {(condition === "ABOVE" || condition === "BELOW") && (
            <div className="al-field">
              <label>Threshold (₹)</label>
              <input
                type="number"
                className="al-input"
                placeholder="0.00"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
              />
            </div>
          )}

          <button
            className="button button-primary al-create-btn"
            onClick={createAlert}
            disabled={creating || !symbol}
          >
            <Plus size={14} /> Create alert
          </button>
        </div>
      </div>

      {/* ── Alert list ────────────────────────────────────────── */}
      <div className="pf-section">
        <p className="eyebrow" style={{ marginBottom: 14 }}>
          ACTIVE MONITORS
          <span style={{ marginLeft: 8, color: "var(--faint)" }}>({alerts.length})</span>
        </p>
        {alerts.length === 0 ? (
          <div className="pf-empty">
            <Bell size={28} />
            <p>No alerts configured.</p>
            <span>Create an alert above or use "Create alert" from the terminal.</span>
          </div>
        ) : (
          <div className="al-grid">
            <AnimatePresence initial={false}>
              {alerts.map((alert) => {
                const result = scan?.results.find((r) => r.symbol === alert.symbol);
                return (
                  <motion.div
                    key={alert.id} layout
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                    className={cn("al-card", alert.triggered_at && "al-triggered")}
                  >
                    <div className="al-card-top">
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span className={cn("alert-pulse", alert.active && "active")} />
                        <strong className="al-symbol">{alert.symbol}</strong>
                        <span className="al-condition">
                          {alert.condition.replace("_", " ")}
                          {alert.threshold ? ` @ ${formatInr(alert.threshold)}` : ""}
                        </span>
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          className={cn("al-toggle", alert.active && "active")}
                          onClick={() => toggle(alert.id, alert.active)}
                          title={alert.active ? "Pause" : "Activate"}
                        >
                          {alert.active ? "ACTIVE" : "PAUSED"}
                        </button>
                        <button className="pf-action-btn danger" onClick={() => deleteAlert(alert.id)}>
                          <X size={13} />
                        </button>
                      </div>
                    </div>
                    {result && (
                      <div className="al-market-row">
                        <span>Current price: <strong>{formatInr(result.price)}</strong></span>
                      </div>
                    )}
                    {alert.triggered_at && (
                      <div className="al-triggered-badge">
                        ⚡ Triggered {new Date(alert.triggered_at).toLocaleString("en-IN")}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
