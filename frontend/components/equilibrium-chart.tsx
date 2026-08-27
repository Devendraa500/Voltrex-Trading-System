"use client";

import {
  CandlestickSeries,
  ColorType,
  createChart,
  LineStyle,
  type UTCTimestamp,
} from "lightweight-charts";
import { useEffect, useRef, useState } from "react";

import type { Candle, ScanResult } from "@/lib/types";

export function EquilibriumChart({
  candles,
  selected,
  height = 290,
}: {
  candles: Candle[];
  selected: ScanResult | null;
  height?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLight, setIsLight] = useState(false);

  // Sync isLight state dynamically on client mount and when HTML classes change
  useEffect(() => {
    if (typeof window === "undefined") return;
    setIsLight(document.documentElement.classList.contains("light"));

    const observer = new MutationObserver(() => {
      setIsLight(document.documentElement.classList.contains("light"));
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Theme-dependent colors
    const tvColor = isLight ? "#10B981" : "#52e4b8";
    const qsColor = isLight ? "#3b82f6" : "#7381ff";
    const qrColor = isLight ? "#d97706" : "#d4a85f";
    const slColor = isLight ? "#ef4444" : "#ff6b79";

    const levelConfig = [
      { key: "qr3",      label: "QR3",  color: isLight ? "rgba(217,119,6,0.45)" : "rgba(212,168,95,0.45)",  dash: LineStyle.Dashed  },
      { key: "qr2",      label: "QR2",  color: isLight ? "rgba(217,119,6,0.65)" : "rgba(212,168,95,0.65)",  dash: LineStyle.Dashed  },
      { key: "qr1",      label: "QR1",  color: qrColor,                dash: LineStyle.Solid   },
      { key: "tv",       label: "TV",   color: tvColor,                dash: LineStyle.Solid   },
      { key: "qs1",      label: "QS1",  color: qsColor,                dash: LineStyle.Solid   },
      { key: "qs2",      label: "QS2",  color: isLight ? "rgba(59,130,246,0.65)" : "rgba(115,129,255,0.65)", dash: LineStyle.Dashed  },
      { key: "qs3",      label: "QS3",  color: isLight ? "rgba(59,130,246,0.45)" : "rgba(115,129,255,0.45)", dash: LineStyle.Dashed  },
      { key: "sl_price", label: "SL",   color: slColor,                dash: LineStyle.SparseDotted },
    ];

    // ── Chart instance ────────────────────────────────────────
    const chart = createChart(el, {
      height,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: isLight ? "#4b5563" : "#748196",
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 10,
      },
      grid: {
        vertLines: { color: isLight ? "rgba(0,0,0,0.03)" : "rgba(128,149,177,0.07)" },
        horzLines: { color: isLight ? "rgba(0,0,0,0.03)" : "rgba(128,149,177,0.07)" },
      },
      rightPriceScale: {
        borderColor: isLight ? "rgba(0,0,0,0.06)" : "rgba(128,149,177,0.14)",
        scaleMargins: { top: 0.08, bottom: 0.08 },
      },
      timeScale: {
        borderColor: isLight ? "rgba(0,0,0,0.06)" : "rgba(128,149,177,0.14)",
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        vertLine: { color: isLight ? "rgba(16,185,129,0.3)" : "rgba(82,228,184,0.4)", width: 1, style: LineStyle.Dashed },
        horzLine: { color: isLight ? "rgba(16,185,129,0.3)" : "rgba(82,228,184,0.4)", width: 1, style: LineStyle.Dashed },
      },
      handleScroll: true,
      handleScale: true,
    });

    // ── Candlestick series ────────────────────────────────────
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor:          isLight ? "#10B981" : "#52e4b8",
      downColor:        isLight ? "#ef4444" : "#ff6b79",
      borderUpColor:    isLight ? "#10B981" : "#52e4b8",
      borderDownColor:  isLight ? "#ef4444" : "#ff6b79",
      wickUpColor:      isLight ? "rgba(16,185,129,0.55)" : "rgba(82,228,184,0.55)",
      wickDownColor:    isLight ? "rgba(239,68,68,0.55)" : "rgba(255,107,121,0.55)",
    });

    const validCandles = candles
      .filter((c) => c.date && Number.isFinite(c.close))
      .map((c) => ({
        time: Math.floor(new Date(c.date).getTime() / 1000) as UTCTimestamp,
        open:  c.open,
        high:  c.high,
        low:   c.low,
        close: c.close,
      }))
      .sort((a, b) => a.time - b.time);

    candleSeries.setData(validCandles);

    // ── Equilibrium price lines ───────────────────────────────
    if (selected) {
      const eq = selected.equilibrium;
      for (const level of levelConfig) {
        const price = (eq as Record<string, number>)[level.key];
        if (price == null || !Number.isFinite(price) || price <= 0) continue;
        candleSeries.createPriceLine({
          price,
          color:             level.color,
          lineWidth:         level.key === "tv" || level.key === "qr1" || level.key === "qs1" ? 2 : 1,
          lineStyle:         level.dash,
          axisLabelVisible:  true,
          title:             level.label,
        });
      }

      // Entry / stop / target markers if there's an active trade setup
      if (selected.signal !== "HOLD" && selected.stop_loss > 0) {
        candleSeries.createPriceLine({
          price:            selected.price,
          color:            isLight ? "rgba(17,24,39,0.5)" : "rgba(255,255,255,0.5)",
          lineWidth:        1,
          lineStyle:        LineStyle.Dashed,
          axisLabelVisible: true,
          title:            "LTP",
        });
      }
    }

    chart.timeScale().fitContent();

    // ── Responsive resize ─────────────────────────────────────
    const observer = new ResizeObserver(() => {
      chart.applyOptions({
        width: el.clientWidth,
        height: el.clientHeight || height,
      });
    });
    observer.observe(el);

    return () => {
      observer.disconnect();
      chart.remove();
    };
  }, [candles, selected, height, isLight]);

  const tvColor = isLight ? "#10B981" : "#52e4b8";
  const qsColor = isLight ? "#3b82f6" : "#7381ff";
  const qrColor = isLight ? "#d97706" : "#d4a85f";
  const slColor = isLight ? "#ef4444" : "#ff6b79";

  return (
    <div className="chart-wrapper">
      {/* Legend overlay */}
      {selected && (
        <div className="chart-legend">
          <span className="chart-legend-item">
            <span className="chart-legend-dot" style={{ background: qrColor }} />
            QR levels
          </span>
          <span className="chart-legend-item">
            <span className="chart-legend-dot" style={{ background: tvColor }} />
            TV
          </span>
          <span className="chart-legend-item">
            <span className="chart-legend-dot" style={{ background: qsColor }} />
            QS levels
          </span>
          <span className="chart-legend-item">
            <span className="chart-legend-dot" style={{ background: slColor }} />
            SL
          </span>
        </div>
      )}
      <div ref={containerRef} className="chart" style={{ height }} />
    </div>
  );
}
