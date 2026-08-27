"use client";

import {
  Activity,
  BarChart3,
  BookOpen,
  CheckCircle2,
  Clock,
  Database,
  Flame,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import { motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";

import { api } from "@/lib/api";
import type { PortfolioAnalytics, Trade } from "@/lib/types";
import { cn, formatInr } from "@/lib/utils";

const EMPTY: PortfolioAnalytics = {
  total_trades: 0, open_trades: 0, closed_trades: 0,
  wins: 0, losses: 0, win_rate: 0, total_pnl: 0,
  average_win: 0, average_loss: 0, expectancy: 0,
  profit_factor: null, max_drawdown: 0,
  sharpe_ratio: null, max_consecutive_wins: 0,
  max_consecutive_losses: 0, avg_trade_duration_days: null,
  by_symbol: {}, equity_curve: [], trades: [],
};

function StatCard({
  label, value, sub, color, icon,
}: {
  label: string; value: string; sub?: string;
  color?: "green" | "red" | "gold" | "blue"; icon?: React.ReactNode;
}) {
  const colorMap: Record<string, string> = {
    green: "var(--green)", red: "var(--red)",
    gold: "var(--gold)", blue: "var(--blue)",
  };
  const clr = color ? (colorMap[color] ?? "var(--text)") : "var(--text)";
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="pf-stat-card"
    >
      <div className="pf-stat-icon" style={{ color: clr }}>{icon}</div>
      <span className="pf-stat-label">{label}</span>
      <strong className="pf-stat-value" style={{ color: clr }}>{value}</strong>
      {sub && <span className="pf-stat-sub">{sub}</span>}
    </motion.div>
  );
}

function MiniEquityCurve({ curve }: { curve: number[] }) {
  if (curve.length < 2) return null;
  const last30 = curve.slice(-30);
  const max = Math.max(...last30.map(Math.abs)) || 1;
  return (
    <div className="pf-equity-curve">
      {last30.map((v, i) => {
        const pct = Math.min(Math.abs(v) / max, 1);
        return (
          <span
            key={i}
            className={cn("pf-equity-bar", v >= 0 ? "pos" : "neg")}
            style={{ height: `${Math.max(pct * 52, 3)}px` }}
          />
        );
      })}
    </div>
  );
}

function TradeRow({ trade, onClose, onDelete }: {
  trade: Trade & { pnl: number | null };
  onClose: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const isOpen = trade.status === "OPEN";
  const pnl = trade.pnl;
  const pnlColor = pnl == null ? "var(--muted)" : pnl >= 0 ? "var(--green)" : "var(--red)";

  return (
    <motion.tr
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="pf-trade-row"
    >
      <td>
        <div className="pf-symbol">
          <strong>{trade.symbol}</strong>
        </div>
      </td>
      <td className="mono">{formatInr(trade.entry_price)}</td>
      <td className="mono">{trade.exit_price != null ? formatInr(trade.exit_price) : <span className="pf-open-tag">OPEN</span>}</td>
      <td className="mono">{formatInr(trade.stop_loss)}</td>
      <td className="mono">{formatInr(trade.target)}</td>
      <td className="mono">{trade.quantity.toLocaleString("en-IN")}</td>
      <td className="mono" style={{ color: pnlColor, fontWeight: 600 }}>
        {pnl != null ? (pnl >= 0 ? "+" : "") + formatInr(pnl) : "—"}
      </td>
      <td>
        <span className={cn("pf-status-badge", isOpen ? "open" : pnl != null && pnl >= 0 ? "win" : "loss")}>
          {isOpen ? "OPEN" : pnl != null && pnl >= 0 ? "WIN" : "LOSS"}
        </span>
      </td>
      <td className="pf-actions">
        {isOpen && (
          <button
            className="pf-action-btn"
            title="Close trade"
            onClick={() => onClose(trade.id)}
          >
            <CheckCircle2 size={13} />
          </button>
        )}
        <button
          className="pf-action-btn danger"
          title="Delete"
          onClick={() => onDelete(trade.id)}
        >
          <X size={13} />
        </button>
      </td>
    </motion.tr>
  );
}

export function PortfolioPage() {
  const [data, setData] = useState<PortfolioAnalytics>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"all" | "open" | "closed">("all");
  const [closing, setClosing] = useState<string | null>(null);
  const [closePrice, setClosePrice] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.analytics();
      setData(result);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const trades = data.trades ?? [];
  const filtered =
    tab === "open" ? trades.filter((t) => t.status === "OPEN") :
      tab === "closed" ? trades.filter((t) => t.status === "CLOSED") :
        trades;

  async function handleClose(id: string) {
    const price = parseFloat(closePrice);
    if (!closePrice || isNaN(price)) {
      setClosing(id);
      return;
    }
    await api.closeTrade(id, price);
    setClosing(null);
    setClosePrice("");
    void refresh();
  }

  async function handleDelete(id: string) {
    await api.deleteTrade(id);
    void refresh();
  }

  const hasTrades = trades.length > 0;

  return (
    <div className="pf-page">
      {/* ── Header ────────────────────────────────────────────── */}
      <div className="pf-header">
        <div>
          <p className="eyebrow">PORTFOLIO JOURNAL</p>
          <h1 className="pf-title">Trade analytics &amp; history</h1>
          <p className="pf-subtitle">
            All entries from the Voltrex equilibrium scanner. Close trades to compute P&amp;L.
          </p>
        </div>
        <button className="pf-refresh-btn" onClick={refresh} disabled={loading}>
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* ── Stats grid ────────────────────────────────────────── */}
      <div className="pf-stats-grid">
        <StatCard
          label="Realized P&L"
          value={formatInr(data.total_pnl)}
          sub={`${data.closed_trades} closed trades`}
          color={data.total_pnl >= 0 ? "green" : "red"}
          icon={data.total_pnl >= 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
        />
        <StatCard
          label="Win Rate"
          value={`${data.win_rate.toFixed(1)}%`}
          sub={`${data.wins}W / ${data.losses}L`}
          color={data.win_rate >= 55 ? "green" : data.win_rate >= 40 ? "gold" : "red"}
          icon={<Activity size={18} />}
        />
        <StatCard
          label="Sharpe Ratio"
          value={data.sharpe_ratio != null ? data.sharpe_ratio.toFixed(2) : "—"}
          sub="Annualised (√252)"
          color={data.sharpe_ratio != null ? (data.sharpe_ratio > 1 ? "green" : data.sharpe_ratio > 0 ? "gold" : "red") : undefined}
          icon={<BarChart3 size={18} />}
        />
        <StatCard
          label="Max Drawdown"
          value={formatInr(data.max_drawdown)}
          sub="Peak-to-trough"
          color={data.max_drawdown > 0 ? "red" : undefined}
          icon={<TrendingDown size={18} />}
        />
        <StatCard
          label="Expectancy"
          value={formatInr(data.expectancy)}
          sub="Per trade average"
          color={data.expectancy >= 0 ? "green" : "red"}
          icon={<Database size={18} />}
        />
        <StatCard
          label="Profit Factor"
          value={data.profit_factor != null ? data.profit_factor.toFixed(2) : "—"}
          sub="Gross W / Gross L"
          color={data.profit_factor != null ? (data.profit_factor > 1.5 ? "green" : data.profit_factor > 1 ? "gold" : "red") : undefined}
          icon={<Flame size={18} />}
        />
        <StatCard
          label="Open Positions"
          value={String(data.open_trades)}
          sub="Active journal entries"
          color="blue"
          icon={<BookOpen size={18} />}
        />
        <StatCard
          label="Avg Hold"
          value={data.avg_trade_duration_days != null ? `${data.avg_trade_duration_days}d` : "—"}
          sub="Calendar days per trade"
          icon={<Clock size={18} />}
        />
      </div>

      {/* ── Equity curve + streaks ────────────────────────────── */}
      {hasTrades && (
        <div className="pf-curve-row">
          <div className="pf-curve-panel">
            <p className="eyebrow">EQUITY CURVE</p>
            {data.equity_curve.length > 1 ? (
              <MiniEquityCurve curve={data.equity_curve} />
            ) : (
              <p className="pf-curve-empty">Close trades to build the equity curve.</p>
            )}
          </div>
          {(data.max_consecutive_wins > 0 || data.max_consecutive_losses > 0) && (
            <div className="pf-streak-panel">
              <p className="eyebrow">STREAKS</p>
              <div className="pf-streak-row">
                <span className="pf-streak-item win">
                  {data.max_consecutive_wins}W streak
                </span>
                <span className="pf-streak-item loss">
                  {data.max_consecutive_losses}L streak
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Per-symbol breakdown ─────────────────────────────── */}
      {Object.keys(data.by_symbol).length > 0 && (
        <div className="pf-section">
          <p className="eyebrow" style={{ marginBottom: 12 }}>SYMBOL BREAKDOWN</p>
          <div className="pf-symbol-grid">
            {Object.entries(data.by_symbol).map(([sym, stats]) => (
              <div key={sym} className="pf-symbol-card">
                <strong>{sym}</strong>
                <span className="pf-symbol-trades">{stats.trades} trades</span>
                <span style={{ color: stats.total_pnl >= 0 ? "var(--green)" : "var(--red)", fontFamily: "var(--font-mono)", fontSize: 12 }}>
                  {stats.total_pnl >= 0 ? "+" : ""}{formatInr(stats.total_pnl)}
                </span>
                <div className="pf-symbol-winbar">
                  <div className="pf-symbol-winbar-fill" style={{ width: `${stats.win_rate}%` }} />
                </div>
                <span className="pf-symbol-winrate">{stats.win_rate.toFixed(0)}% win</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Trade table ───────────────────────────────────────── */}
      <div className="pf-section">
        <div className="pf-table-header">
          <p className="eyebrow" style={{ margin: 0 }}>TRADE HISTORY</p>
          <div className="pf-tabs">
            {(["all", "open", "closed"] as const).map((t) => (
              <button
                key={t}
                className={cn("pf-tab", tab === t && "active")}
                onClick={() => setTab(t)}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
                <span className="pf-tab-count">
                  {t === "all" ? trades.length :
                    t === "open" ? trades.filter((x) => x.status === "OPEN").length :
                      trades.filter((x) => x.status === "CLOSED").length}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Close trade inline form */}
        {closing != null && (
          <div className="pf-close-form">
            <span>Enter exit price for trade #{closing}</span>
            <input
              type="number"
              placeholder="Exit price"
              value={closePrice}
              onChange={(e) => setClosePrice(e.target.value)}
              className="pf-close-input"
              autoFocus
            />
            <button className="button button-primary" onClick={() => handleClose(closing)}>
              Confirm close
            </button>
            <button className="button button-ghost" onClick={() => { setClosing(null); setClosePrice(""); }}>
              Cancel
            </button>
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="pf-empty">
            <Database size={28} />
            <p>No {tab === "all" ? "" : tab} trades yet.</p>
            <span>
              {tab === "open"
                ? "Journal a setup from the terminal to create an open position."
                : tab === "closed"
                  ? "Close an open position to record realized P&L."
                  : "Run a scan and journal setups from the terminal."}
            </span>
          </div>
        ) : (
          <div className="pf-table-wrapper">
            <table className="pf-table">
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th>Entry</th>
                  <th>Exit</th>
                  <th>Stop</th>
                  <th>Target</th>
                  <th>Qty</th>
                  <th>P&amp;L</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((trade) => (
                  <TradeRow
                    key={trade.id}
                    trade={trade}
                    onClose={(id) => { setClosing(id); setClosePrice(""); }}
                    onDelete={handleDelete}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
