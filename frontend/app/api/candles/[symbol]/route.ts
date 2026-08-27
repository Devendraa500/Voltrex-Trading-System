import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

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

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await params;
  const upperSymbol = symbol.toUpperCase();
  const dataDir  = path.resolve(process.cwd(), "..", "data");
  const filePath = path.join(dataDir, `${upperSymbol}.csv`);

  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ candles: [] });
  }

  const rows = parseCSV(filePath);
  const candles = rows.slice(-365).map((r) => ({
    date:   r.date,
    open:   r.open,
    high:   r.high,
    low:    r.low,
    close:  r.close,
    volume: r.volume,
  }));

  return NextResponse.json({ candles });
}