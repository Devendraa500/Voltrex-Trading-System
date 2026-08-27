export type Equilibrium = {
  rounded: number;
  root: number;
  sum1: number;
  sum2: number;
  tv: number;
  qr1: number;
  qr2: number;
  qr3: number;
  qs1: number;
  qs2: number;
  qs3: number;
  sl_price: number;
  rr_ratio: number;
};

export type ScanResult = {
  symbol: string;
  timestamp: string;
  signal: "BUY" | "SELL" | "HOLD";
  technical_signal: string;
  regime: "BULL" | "BEAR" | "SIDEWAYS";
  price: number;
  change_percent: number;
  volume: number;
  volume_ratio: number;
  rsi: number;
  atr: number;
  stop_loss: number;
  target: number;
  risk_reward: number;
  quantity: number;
  score: number;
  grade: string;
  equilibrium: Equilibrium;
};

export type ScanRun = {
  run_id: string | null;
  created_at: string | null;
  symbols: string[];
  config: Record<string, unknown>;
  results: ScanResult[];
  errors: Record<string, string>;
  quotes?: Record<string, { price: number; change_percent: number }>;
  triggered_alerts?: Alert[];
};

export type Watchlist = {
  id: string;
  user_id: string;
  name: string;
  symbols: string[];
  created_at: string;
};

export type Alert = {
  id: string;
  user_id: string;
  symbol: string;
  condition: "ABOVE" | "BELOW" | "SIGNAL_BUY" | "SIGNAL_SELL";
  threshold: number;
  active: boolean;
  created_at: string;
  triggered_at: string | null;
};

export type Trade = {
  id: string;
  symbol: string;
  side: "BUY" | "SELL";
  status: "OPEN" | "CLOSED";
  entry_price: number;
  exit_price: number | null;
  stop_loss: number;
  target: number;
  quantity: number;
  opened_at: string;
  closed_at: string | null;
  notes: string;
};

export type PortfolioAnalytics = {
  total_trades: number;
  open_trades: number;
  closed_trades: number;
  wins: number;
  losses: number;
  win_rate: number;
  total_pnl: number;
  average_win: number;
  average_loss: number;
  expectancy: number;
  profit_factor: number | null;
  max_drawdown: number;
  sharpe_ratio: number | null;
  max_consecutive_wins: number;
  max_consecutive_losses: number;
  avg_trade_duration_days: number | null;
  by_symbol: Record<string, { trades: number; wins: number; win_rate: number; total_pnl: number }>;
  equity_curve: number[];
  trades: Array<Trade & { pnl: number | null }>;
};

export type Candle = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type User = {
  id: string;
  name: string;
  email: string;
  trader_id: string;
  account_tier: string;
  created_at: string;
};
