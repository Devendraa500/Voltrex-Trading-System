import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// The 6 stocks we have CSV data for
const STOCKS = [
  { symbol: "RELIANCE", file: "RELIANCE.csv" },
  { symbol: "HDFCBANK",  file: "HDFCBANK.csv"  },
  { symbol: "ICICIBANK", file: "ICICIBANK.csv" },
  { symbol: "INFY",      file: "INFY.csv"      },
  { symbol: "SBIN",      file: "SBIN.csv"      },
  { symbol: "TATASTEEL", file: "TATASTEEL.csv" },
];

interface OHLCVRow {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

function parseCSV(filePath: string): OHLCVRow[] {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n").filter(Boolean);
  const rows: OHLCVRow[] = [];
  for (const line of lines) {
    const parts = line.split(",");
    if (!parts[0] || !/^\d{4}-\d{2}-\d{2}/.test(parts[0].trim())) continue;
    const date   = parts[0].trim();
    const close  = parseFloat(parts[2]);
    const high   = parseFloat(parts[3]);
    const low    = parseFloat(parts[4]);
    const open   = parseFloat(parts[5]);
    const volume = parseInt(parts[6], 10);
    if (isNaN(close) || isNaN(open)) continue;
    rows.push({ date, open, high, low, close, volume: isNaN(volume) ? 0 : volume });
  }
  return rows.sort((a, b) => a.date.localeCompare(b.date));
}

function computeRSI(closes: number[], period = 14): number {
  if (closes.length < period + 1) return 50;
  let gains = 0, losses = 0;
  for (let i = closes.length - period; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) gains += diff; else losses += Math.abs(diff);
  }
  if (losses === 0) return 100;
  const rs = gains / losses;
  return 100 - 100 / (1 + rs);
}

function computeATR(rows: OHLCVRow[], period = 14): number {
  if (rows.length < period + 1) return 0;
  const recent = rows.slice(-period - 1);
  let atrSum = 0;
  for (let i = 1; i < recent.length; i++) {
    const tr = Math.max(
      recent[i].high - recent[i].low,
      Math.abs(recent[i].high - recent[i - 1].close),
      Math.abs(recent[i].low  - recent[i - 1].close),
    );
    atrSum += tr;
  }
  return atrSum / period;
}

function computeEquilibrium(price: number) {
  const root    = Math.sqrt(price);
  const rounded = Math.round(root) ** 2;
  const tv      = rounded;
  const step    = root * 0.0271828;
  const qr1     = (root + step * 1) ** 2;
  const qr2     = (root + step * 2) ** 2;
  const qr3     = (root + step * 3) ** 2;
  const qs1     = (root - step * 1) ** 2;
  const qs2     = (root - step * 2) ** 2;
  const qs3     = (root - step * 3) ** 2;
  const sl_price = qs1 * 0.985;
  const rr_ratio = (qr1 - price) / Math.max(price - sl_price, 1);
  return { rounded, root, sum1: step, sum2: step * 2, tv, qr1, qr2, qr3, qs1, qs2, qs3, sl_price, rr_ratio };
}

function avgVolume(rows: OHLCVRow[], period = 20): number {
  const recent = rows.slice(-period);
  const total = recent.reduce((s, r) => s + r.volume, 0);
  return total / recent.length;
}

export async function GET() {
  // Resolve data dir: project root is two levels up from frontend/
  const dataDir = path.resolve(process.cwd(), "..", "data");

  const results = STOCKS.map((stock) => {
    const filePath = path.join(dataDir, stock.file);
    let rows: OHLCVRow[] = [];
    try { rows = parseCSV(filePath); } catch { /* skip */ }
    if (rows.length === 0) return null;

    const last     = rows[rows.length - 1];
    const prev     = rows[rows.length - 2] ?? last;
    const closes   = rows.map((r) => r.close);
    const rsi      = computeRSI(closes);
    const atr      = computeATR(rows);
    const eq       = computeEquilibrium(last.close);
    const volAvg   = avgVolume(rows);
    const volRatio = volAvg > 0 ? last.volume / volAvg : 1;
    const changePct = prev.close > 0 ? ((last.close - prev.close) / prev.close) * 100 : 0;

    let signal: "BUY" | "SELL" | "HOLD" = "HOLD";
    let technicalSignal = "Neutral structure";
    if (rsi < 40 && last.close < eq.tv) {
      signal = "BUY"; technicalSignal = "Oversold below TV — bullish reversion candidate";
    } else if (rsi > 65 && last.close > eq.qr1) {
      signal = "SELL"; technicalSignal = "Overbought above QR1 — mean reversion risk";
    } else if (last.close > eq.tv && rsi > 50) {
      signal = "BUY"; technicalSignal = "Above TV with momentum — continuation setup";
    }

    const regime: "BULL" | "BEAR" | "SIDEWAYS" =
      closes.slice(-50).reduce((bull, c, i, arr) => bull && (i === 0 || c >= arr[i - 1] * 0.97), true) ? "BULL"
      : closes.slice(-50).reduce((bear, c, i, arr) => bear && (i === 0 || c <= arr[i - 1] * 1.03), true) ? "BEAR"
      : "SIDEWAYS";

    const score = Math.min(100, Math.max(0,
      (signal === "BUY" ? 40 : signal === "SELL" ? 30 : 20) +
      (volRatio > 1.5 ? 20 : volRatio > 1.2 ? 10 : 0) +
      (rsi > 30 && rsi < 70 ? 15 : 0) +
      (eq.rr_ratio > 2 ? 15 : eq.rr_ratio > 1.5 ? 10 : 0) +
      (regime === "BULL" ? 10 : 0),
    ));

    const grade = score >= 80 ? "A+" : score >= 70 ? "A" : score >= 60 ? "B" : score >= 50 ? "C" : "D";
    const quantity = Math.max(1, Math.floor(50000 / Math.max(atr, 1)));

    return {
      symbol: stock.symbol, timestamp: last.date, signal, technical_signal: technicalSignal,
      regime, price: last.close, change_percent: changePct, volume: last.volume,
      volume_ratio: volRatio, rsi: Math.round(rsi * 10) / 10, atr: Math.round(atr * 100) / 100,
      stop_loss: eq.sl_price, target: eq.qr1,
      risk_reward: Math.round(eq.rr_ratio * 100) / 100, quantity, score: Math.round(score), grade,
      equilibrium: { rounded: eq.rounded, root: eq.root, sum1: eq.sum1, sum2: eq.sum2, tv: eq.tv,
        qr1: eq.qr1, qr2: eq.qr2, qr3: eq.qr3, qs1: eq.qs1, qs2: eq.qs2, qs3: eq.qs3,
        sl_price: eq.sl_price, rr_ratio: eq.rr_ratio },
    };
  }).filter(Boolean);

  results.sort((a, b) => (b?.score ?? 0) - (a?.score ?? 0));

  return NextResponse.json({
    run_id: "static-csv",
    created_at: new Date().toISOString(),
    symbols: STOCKS.map((s) => s.symbol),
    config: { source: "static_csv" },
    results,
    errors: {},
    quotes: Object.fromEntries(results.map((r) => [r!.symbol, { price: r!.price, change_percent: r!.change_percent }])),
  });
}
