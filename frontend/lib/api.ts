import type { Candle, ScanRun } from "./types";

/**
 * Fetches the demo scan data from the local Next.js API route,
 * which parses the static CSV files in /data/.
 */
export async function demoScan(): Promise<ScanRun> {
  const response = await fetch("/api/demo-scan");
  if (!response.ok) {
    throw new Error(`Demo scan failed: ${response.status}`);
  }
  return response.json() as Promise<ScanRun>;
}

/**
 * Fetches OHLCV candles for a symbol from the CSV-backed API route.
 */
export async function demoCandles(symbol: string): Promise<Candle[]> {
  const response = await fetch(`/api/candles/${encodeURIComponent(symbol)}`);
  if (!response.ok) return [];
  const data = await response.json() as { candles: Candle[] };
  return data.candles ?? [];
}

// WS_URL kept as empty string so app-shell.tsx import doesn't crash.
export const WS_URL = "";

// Stub api object kept so legacy import sites compile.
export const api = {
  health:          (..._args: any[]) => Promise.resolve({ status: "ok", zerodha_configured: false, environment: "demo" }),
  latestScan:      (..._args: any[]) => demoScan(),
  runScan:         (..._args: any[]) => demoScan(),
  candles:         async (symbol: string, ..._args: any[]) => ({ candles: await demoCandles(symbol) }),
  watchlists:      (..._args: any[]) => Promise.resolve([] as any[]),
  updateWatchlist: (..._args: any[]) => Promise.resolve({} as any),
  alerts:          (..._args: any[]) => Promise.resolve([] as any[]),
  createAlert:     (..._args: any[]) => Promise.resolve({ id: "demo-alert", symbol: "RELIANCE", condition: "ABOVE", threshold: 0, active: true, created_at: new Date().toISOString() } as any),
  toggleAlert:     (..._args: any[]) => Promise.resolve({} as any),
  deleteAlert:     (..._args: any[]) => Promise.resolve({ success: true }),
  trades:          (..._args: any[]) => Promise.resolve([] as any[]),
  createTrade:     (..._args: any[]) => Promise.resolve({} as any),
  closeTrade:      (..._args: any[]) => Promise.resolve({} as any),
  deleteTrade:     (..._args: any[]) => Promise.resolve({ success: true }),
  analytics:       (..._args: any[]) => Promise.resolve({
    total_trades: 0, open_trades: 0, closed_trades: 0, wins: 0, losses: 0,
    win_rate: 0, total_pnl: 0, average_win: 0, average_loss: 0, expectancy: 0,
    profit_factor: null, max_drawdown: 0, sharpe_ratio: null,
    max_consecutive_wins: 0, max_consecutive_losses: 0, avg_trade_duration_days: null,
    by_symbol: {}, equity_curve: [], trades: [],
  }),
  explain: (..._args: any[]) => Promise.resolve({
    summary: "", confidence: "LOW", evidence: [], risks: [], disclaimer: "",
  }),
};

export const authApi = {
  register: (..._args: any[]) => Promise.reject(new Error("Auth not available")),
  login:    (..._args: any[]) => Promise.reject(new Error("Auth not available")),
  me:       (..._args: any[]) => Promise.reject(new Error("Auth not available")),
};

