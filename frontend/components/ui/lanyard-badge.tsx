"use client";

import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";

/**
 * Lanyard Badge — a physics-based event badge hanging from a verlet-simulated strap.
 * Drag to swing, click to flip. Shows user info on the card faces.
 */

interface LanyardBadgeProps {
  name?: string;
  role?: string;
  email?: string;
  title?: string;
  subtitle?: string;
  cardWidth?: number;
  height?: string;
  className?: string;
  strapColor?: string;
  inkColor?: string;
  cardColor?: string;
  onDismiss?: () => void;
  dismissLabel?: string;
}

type Pt = { x: number; y: number; px: number; py: number; w: number };
type Lnk = [number, number, number];

function integrate(pts: Pt[], dt: number, gravity: number, damping: number) {
  for (const p of pts) {
    if (!p.w) continue;
    const vx = (p.x - p.px) * damping;
    const vy = (p.y - p.py) * damping;
    p.px = p.x;
    p.py = p.y;
    p.x += vx;
    p.y += vy + gravity * dt * dt;
  }
}

function solve(pts: Pt[], links: Lnk[], iterations: number) {
  for (let k = 0; k < iterations; k++) {
    for (const [i, j, rest] of links) {
      const a = pts[i];
      const b = pts[j];
      const ws = a.w + b.w;
      if (!ws) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.hypot(dx, dy) || 1e-6;
      const f = (d - rest) / (d * ws);
      a.x += dx * f * a.w;
      a.y += dy * f * a.w;
      b.x -= dx * f * b.w;
      b.y -= dy * f * b.w;
    }
  }
}

export default function LanyardBadge({
  name = "Trader",
  role = "Quantitative Analyst",
  email = "",
  title = "VOLTREX",
  subtitle = "Institutional Trading Terminal · 2026",
  cardWidth = 240,
  height = "100svh",
  className = "",
  strapColor = "#141312",
  inkColor = "#b59a6c",
  cardColor = "#0a0a0a",
  onDismiss,
  dismissLabel = "SEE PLANS →",
}: LanyardBadgeProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);
  const [showBack, setShowBack] = useState(false);

  const cw = cardWidth;
  const ch = Math.round(cw * 1.58);
  const ringR = Math.max(7, Math.round(cw * 0.036));
  const clipH = Math.round(cw * 0.1);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    const card = cardRef.current;
    const inner = innerRef.current;
    const ctx = canvas?.getContext("2d");
    if (!root || !canvas || !card || !inner || !ctx) return;

    const sw = Math.max(14, Math.round(cw * 0.1));
    const lowLen = sw * 1.6;
    const arm = ringR * 2 + clipH + ch * 0.45;
    const N = 6;
    const STEP = 1 / 120;
    const GRAVITY = 2400;
    const ITER = 18;

    let pts: Pt[] = [];
    let links: Lnk[] = [];
    let left: number[] = [];
    let right: number[] = [];
    let low: number[] = [];
    let iB = 0, iT = 0, iC = 0;
    let strandRest = 1;
    let dpr = 1;
    let W = 1, H = 1;

    const spin = { a: 0, v: 0 };
    let spinTarget = 0;

    const add = (x: number, y: number, w: number) => {
      pts.push({ x, y, px: x, py: y, w });
      return pts.length - 1;
    };

    const strand = (from: number, to: number, n: number, slack: number) => {
      const a = pts[from];
      const b = pts[to];
      const rest = (Math.hypot(b.x - a.x, b.y - a.y) * slack) / n;
      const ids = [from];
      for (let i = 1; i < n; i++) ids.push(add(a.x + ((b.x - a.x) * i) / n, a.y + ((b.y - a.y) * i) / n, 1));
      ids.push(to);
      for (let i = 0; i < n; i++) links.push([ids[i], ids[i + 1], rest]);
      return { ids, rest };
    };

    const build = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = Math.max(1, root.clientWidth);
      H = Math.max(1, root.clientHeight);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);

      pts = [];
      links = [];
      const cx = W / 2;
      const spread = Math.min(W * 0.16, cw * 0.55);
      const top = -sw * 2;
      // Position buckle higher so card lands near vertical center
      const bY = Math.max(H * 0.08, Math.min(H * 0.22, H * 0.5 - (lowLen + ringR * 2 + clipH + ch) * 0.5 - 20));

      const aL = add(cx - spread, top, 0);
      iB = add(cx, bY, 1.4);
      const l = strand(aL, iB, N, 1.03);
      const aR = add(cx + spread, top, 0);
      const r = strand(aR, iB, N, 1.03);
      iT = add(cx, bY + lowLen, 0.8);
      const lo = strand(iB, iT, 3, 1);
      iC = add(cx, bY + lowLen + arm, 0.25);
      links.push([iT, iC, arm]);
      left = l.ids;
      right = r.ids;
      low = lo.ids;
      strandRest = l.rest;

      // Enter mid-swing
      pts[iC].x += cw * 0.55;
      pts[iC].px = pts[iC].x - 2;
      spin.v = 5;
    };

    const ribbon = (ids: number[], color: string, restLen: number) => {
      for (let i = 0; i < ids.length - 1; i++) {
        const a = pts[ids[i]];
        const b = pts[ids[i + 1]];
        const dx = (b.x - a.x) * dpr;
        const dy = (b.y - a.y) * dpr;
        const len = Math.hypot(dx, dy) || 1e-6;
        const nx = dy / len;
        const ny = -dx / len;
        const hw = (sw * dpr) / 2;

        ctx.beginPath();
        ctx.moveTo(a.x * dpr + nx * hw, a.y * dpr + ny * hw);
        ctx.lineTo(b.x * dpr + nx * hw, b.y * dpr + ny * hw);
        ctx.lineTo(b.x * dpr - nx * hw, b.y * dpr - ny * hw);
        ctx.lineTo(a.x * dpr - nx * hw, a.y * dpr - ny * hw);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
      }
    };

    const draw = () => {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ribbon(left, strapColor, strandRest);
      ribbon(right, strapColor, strandRest);
      ribbon(low, strapColor, strandRest);

      // Buckle
      const B = pts[iB];
      ctx.setTransform(dpr, 0, 0, dpr, B.x * dpr, B.y * dpr);
      const u = sw / 20;
      ctx.shadowColor = "rgba(0,0,0,0.3)";
      ctx.shadowBlur = 6 * dpr;
      const g = ctx.createLinearGradient(-16 * u, 0, 16 * u, 0);
      g.addColorStop(0, "#f4efe4");
      g.addColorStop(0.45, "#b9b0a0");
      g.addColorStop(0.55, "#8f8778");
      g.addColorStop(1, "#ece6da");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.roundRect(-15 * u, -14 * u, 30 * u, 17 * u, 3 * u);
      ctx.fill();
      ctx.beginPath();
      ctx.roundRect(-11 * u, 1 * u, 22 * u, 15 * u, [2 * u, 2 * u, 6 * u, 6 * u]);
      ctx.fill();
      ctx.shadowColor = "transparent";

      // Ring
      const T = pts[iT];
      ctx.setTransform(dpr, 0, 0, dpr, T.x * dpr, (T.y + ringR * 0.8) * dpr);
      ctx.lineWidth = Math.max(2.5, ringR * 0.38);
      ctx.strokeStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, ringR, 0, Math.PI * 2);
      ctx.stroke();
    };

    const place = () => {
      const T = pts[iT];
      const C = pts[iC];
      const swing = Math.atan2(C.x - T.x, C.y - T.y);
      card.style.transform = `translate3d(${(T.x - cw / 2).toFixed(2)}px,${(T.y + ringR).toFixed(2)}px,0) rotate(${(-swing).toFixed(4)}rad)`;
      inner.style.transform = `perspective(1100px) rotateY(${spin.a.toFixed(4)}rad)`;
    };

    type Drag = { id: number; ox: number; oy: number; tx: number; ty: number; sx: number; sy: number; moved: boolean };
    let drag: Drag | null = null;

    const local = (e: PointerEvent) => {
      const r = root.getBoundingClientRect();
      return [e.clientX - r.left, e.clientY - r.top];
    };

    const flip = () => {
      spinTarget = spinTarget === 0 ? Math.PI : 0;
      setShowBack(spinTarget !== 0);
    };

    const onDown = (e: PointerEvent) => {
      if (e.button > 0) return;
      const [x, y] = local(e);
      const T = pts[iT];
      drag = { id: e.pointerId, ox: T.x - x, oy: T.y - y, tx: T.x, ty: T.y, sx: x, sy: y, moved: false };
      pts[iT].w = 0;
      card.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.id) return;
      const [x, y] = local(e);
      drag.tx = x + drag.ox;
      drag.ty = y + drag.oy;
      if (Math.hypot(x - drag.sx, y - drag.sy) > 5) drag.moved = true;
    };
    const onUp = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.id) return;
      if (!drag.moved) flip();
      drag = null;
      pts[iT].w = 0.8;
    };

    card.addEventListener("pointerdown", onDown);
    card.addEventListener("pointermove", onMove);
    card.addEventListener("pointerup", onUp);
    card.addEventListener("pointercancel", onUp);

    let raf = 0;
    let acc = 0;
    let last = performance.now();
    let t = 0;

    const tick = (now: number) => {
      acc += Math.min(0.05, (now - last) / 1000);
      last = now;
      let steps = 0;
      while (acc >= STEP && steps < 8) {
        acc -= STEP;
        steps++;
        t += STEP;
        if (drag) {
          const T = pts[iT];
          T.px = T.x;
          T.py = T.y;
          T.x += (drag.tx - T.x) * 0.35;
          T.y += (drag.ty - T.y) * 0.35;
        }
        const C = pts[iC];
        if (!drag) {
          C.x += (22 * Math.sin(t * 0.7) + 12 * Math.sin(t * 1.9)) * STEP * STEP;
        }
        integrate(pts, STEP, GRAVITY, 0.992);
        solve(pts, links, ITER);

        // Spin physics
        spin.v += (-(spin.a - spinTarget) * 18 - spin.v * 3.2) * STEP;
        spin.a += spin.v * STEP;
      }
      draw();
      place();
      raf = requestAnimationFrame(tick);
    };

    build();
    draw();
    place();
    raf = requestAnimationFrame(tick);

    const observer = new ResizeObserver(() => {
      if (Math.abs(root.clientWidth - W) < 1 && Math.abs(root.clientHeight - H) < 1) return;
      build();
    });
    observer.observe(root);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      card.removeEventListener("pointerdown", onDown);
      card.removeEventListener("pointermove", onMove);
      card.removeEventListener("pointerup", onUp);
      card.removeEventListener("pointercancel", onUp);
    };
  }, [cw, ch, ringR, clipH, strapColor]);

  const face: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    borderRadius: cw * 0.06,
    overflow: "hidden",
    backfaceVisibility: "hidden",
    WebkitBackfaceVisibility: "hidden",
    boxShadow: "0 18px 40px -12px rgba(0,0,0,0.55), 0 2px 6px rgba(0,0,0,0.3), 0 0 60px -10px rgba(180,160,130,0.15), inset 0 1px 0 rgba(255,255,255,0.12)",
    border: "1px solid rgba(255,255,255,0.08)",
  };

  const s = cw / 240;

  return (
    <div
      ref={rootRef}
      className={"fixed inset-0 z-[9999] flex items-center justify-center select-none " + className}
      style={{ height, background: "rgba(4,5,12,0.55)", backdropFilter: "blur(10px)" }}
    >
      {/* Animated shine overlay for ambient shimmer */}
      <style>{`
        @keyframes badgeShine {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .badge-shine-overlay {
          position: absolute;
          inset: 0;
          pointer-events: none;
          border-radius: inherit;
          background: linear-gradient(
            105deg,
            transparent 30%,
            rgba(255,255,255,0.08) 42%,
            rgba(255,255,255,0.22) 50%,
            rgba(255,255,255,0.08) 58%,
            transparent 70%
          );
          background-size: 200% 100%;
          animation: badgeShine 3s ease-in-out infinite;
          z-index: 5;
        }
      `}</style>
      {/* Close / Dismiss */}
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="absolute top-6 right-6 z-20 px-5 py-2.5 rounded-full border border-white/15 bg-white/[0.06] text-[#b9becf] text-xs font-mono tracking-wider hover:bg-white/10 transition-colors backdrop-blur-xl"
        >
          {dismissLabel}
        </button>
      )}

      <div className="absolute top-6 left-6 z-20 text-xs font-mono text-[#b9becf] tracking-wider opacity-70">
        VOLTREX TRADING SYSTEM · ID BADGE GENERATED
      </div>

      <canvas
        ref={canvasRef}
        aria-hidden="true"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
      />

      <div
        ref={cardRef}
        role="button"
        tabIndex={0}
        aria-label="Badge. Drag to swing, press to flip."
        className="absolute left-0 top-0 outline-none"
        style={{ width: cw, height: ch + ringR + clipH, transformOrigin: "50% 0", cursor: "grab", touchAction: "none", willChange: "transform" }}
      >
        {/* Badge clip */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            left: "50%",
            top: 0,
            width: cw * 0.075,
            height: clipH + cw * 0.05,
            transform: "translateX(-50%)",
            borderRadius: cw * 0.02,
            background: "linear-gradient(90deg, #f4efe4, #a8a090 50%, #ece6da)",
            boxShadow: "0 1px 3px rgba(0,0,0,0.35)",
            zIndex: 2,
          }}
        />

        <div
          ref={innerRef}
          style={{ position: "absolute", left: 0, right: 0, top: ringR + clipH * 0.6, height: ch, transformStyle: "preserve-3d" }}
        >
          {/* FRONT */}
          <div style={face}>
            <div className="relative h-full w-full flex flex-col justify-between" style={{ background: cardColor, color: "#eef0f6" }}>
              {/* Top Accent & Micro Header */}
              <div>
                <div style={{ height: 4 * s, background: `linear-gradient(90deg, ${inkColor}, #ffffff, ${inkColor})` }} />
                <div className="flex items-center justify-between px-3 py-1" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}>
                  <span style={{ fontSize: 5.5 * s, fontFamily: '"Space Mono", monospace', letterSpacing: "0.2em", color: "#8e94a8" }}>
                    NSE·IN-VTX-0982
                  </span>
                  <span className="flex items-center gap-1" style={{ fontSize: 5.5 * s, fontFamily: '"Space Mono", monospace', color: inkColor }}>
                    <span style={{ width: 4 * s, height: 4 * s, borderRadius: "50%", background: "#10b981", display: "inline-block" }} />
                    SEC LVL 4
                  </span>
                </div>
              </div>

              {/* Smart Card Chip & NFC row */}
              <div className="flex items-center justify-between px-4 pt-1">
                {/* EMV Gold Chip SVG */}
                <div style={{ width: 34 * s, height: 26 * s, borderRadius: 4 * s, background: "linear-gradient(135deg, #d4af37 0%, #aa820a 50%, #f3e5ab 100%)", padding: 2 * s, boxShadow: "inset 0 1px 2px rgba(255,255,255,0.4), 0 2px 4px rgba(0,0,0,0.4)" }}>
                  <svg viewBox="0 0 34 26" fill="none" style={{ width: "100%", height: "100%" }}>
                    <rect x="0.5" y="0.5" width="33" height="25" rx="3" stroke="#8a6909" strokeWidth="0.8" fill="none" />
                    <line x1="11" y1="1" x2="11" y2="25" stroke="#8a6909" strokeWidth="0.7" />
                    <line x1="23" y1="1" x2="23" y2="25" stroke="#8a6909" strokeWidth="0.7" />
                    <line x1="1" y1="13" x2="33" y2="13" stroke="#8a6909" strokeWidth="0.7" />
                    <circle cx="17" cy="13" r="3.5" fill="#f3e5ab" stroke="#8a6909" strokeWidth="0.7" />
                  </svg>
                </div>

                {/* Hologram Badge */}
                <div style={{
                  padding: `${2 * s}px ${6 * s}px`,
                  borderRadius: 4 * s,
                  background: "linear-gradient(120deg, rgba(255,255,255,0.15), rgba(181,154,108,0.3), rgba(64,156,255,0.2))",
                  border: "1px solid rgba(255,255,255,0.2)",
                  display: "flex",
                  alignItems: "center",
                  gap: 3 * s,
                }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 10 * s, height: 10 * s, color: inkColor }}>
                    <path d="M8.5 16.5a5 5 0 0 1 0-9" strokeLinecap="round" />
                    <path d="M12 19a8.5 8.5 0 0 1 0-14" strokeLinecap="round" />
                    <path d="M15.5 21.5a12 12 0 0 1 0-19" strokeLinecap="round" />
                  </svg>
                  <span style={{ fontSize: 6 * s, fontFamily: '"Space Mono", monospace', letterSpacing: "0.15em", color: "#eef0f6", fontWeight: 700 }}>
                    QUANT DESK
                  </span>
                </div>
              </div>

              {/* Brand & Title */}
              <div className="px-4 py-1">
                <div style={{ fontFamily: '"Space Mono", monospace', fontSize: 6.5 * s, letterSpacing: "0.25em", color: inkColor, textTransform: "uppercase" }}>
                  VOLTREX QUANTITATIVE
                </div>
                <div style={{ fontSize: 20 * s, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.05, marginTop: 2 * s }}>
                  {title}
                </div>
                <div style={{ fontSize: 6.5 * s, marginTop: 3 * s, color: "#8e94a8", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                  {subtitle}
                </div>
              </div>

              {/* Center Clearance Meta + Harmonic Rose Watermark */}
              <div className="px-4 py-1.5 flex items-center justify-between" style={{ background: "rgba(255,255,255,0.02)", borderTop: "1px solid rgba(255,255,255,0.06)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 5.5 * s, fontFamily: '"Space Mono", monospace', color: "#8e94a8", letterSpacing: "0.12em" }}>
                    CLEARANCE: T+0 COLOCATED
                  </div>
                  <div style={{ fontSize: 5.5 * s, fontFamily: '"Space Mono", monospace', color: "#b9becf", letterSpacing: "0.12em", marginTop: 2 * s }}>
                    GATEWAY: BKC-DC2 (0.38ms)
                  </div>
                  <div style={{ fontSize: 5.5 * s, fontFamily: '"Space Mono", monospace', color: inkColor, letterSpacing: "0.12em", marginTop: 2 * s }}>
                    ID: #VTX-8492-AX7
                  </div>
                </div>

                <svg viewBox="-30 -30 60 60" fill="none" stroke={inkColor} strokeWidth={0.9} style={{ width: 36 * s, height: 36 * s, opacity: 0.75, flexShrink: 0 }}>
                  <circle r={26} strokeDasharray="2 2" />
                  <circle r={18} />
                  <polygon points="0,-18 4,-4 18,0 4,4 0,18 -4,4 -18,0 -4,-4" fill="rgba(181,154,108,0.15)" stroke={inkColor} strokeWidth={0.8} />
                  <circle r={3} fill={inkColor} />
                </svg>
              </div>

              {/* Barcode & Security Hash Footer */}
              <div className="px-4 pb-2.5">
                <div className="flex items-center justify-between mb-1" style={{ height: 20 * s, opacity: 0.85 }}>
                  {[3, 1, 2, 1, 4, 1, 2, 3, 1, 3, 2, 1, 1, 4, 2, 1, 3, 1, 2, 4, 1, 2, 3, 1, 2, 1, 3, 4, 1, 2, 1, 3].map((w, idx) => (
                    <div
                      key={idx}
                      style={{
                        width: `${w * 0.85 * s}px`,
                        height: "100%",
                        background: idx % 2 === 0 ? "#eef0f6" : "transparent",
                      }}
                    />
                  ))}
                </div>
                <div className="flex items-center justify-between" style={{ fontSize: 5 * s, fontFamily: '"Space Mono", monospace', color: "#8e94a8", letterSpacing: "0.15em" }}>
                  <span>*VTX-2026-NSE-9982*</span>
                  <span>SHA-256 ENCRYPTED</span>
                </div>
              </div>
            </div>
            <div className="badge-shine-overlay" />
          </div>

          {/* BACK */}
          <div style={{ ...face, transform: "rotateY(180deg)" }}>
            <div className="relative h-full w-full flex flex-col justify-between" style={{ background: cardColor, color: "#eef0f6" }}>
              {/* Micro Header Strip */}
              <div>
                <div style={{ height: 4 * s, background: `linear-gradient(90deg, #ffffff, ${inkColor}, #ffffff)` }} />
                <div className="flex items-center justify-between px-3 py-1" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}>
                  <span style={{ fontSize: 5.5 * s, fontFamily: '"Space Mono", monospace', letterSpacing: "0.2em", color: "#8e94a8" }}>
                    DOSSIER · CONFIDENTIAL
                  </span>
                  <span style={{ fontSize: 5.5 * s, fontFamily: '"Space Mono", monospace', color: "#10b981", letterSpacing: "0.15em" }}>
                    STATUS: ACTIVE
                  </span>
                </div>
              </div>

              {/* Magnetic Stripe */}
              <div
                style={{
                  height: 22 * s,
                  background: "linear-gradient(180deg, #1b1b1f 0%, #0d0d10 50%, #17171a 100%)",
                  borderTop: "1px solid rgba(255,255,255,0.06)",
                  borderBottom: "1px solid rgba(255,255,255,0.06)",
                  position: "relative",
                }}
              >
                <div style={{ position: "absolute", inset: 0, opacity: 0.15, backgroundImage: "repeating-linear-gradient(0deg, #fff, #fff 1px, transparent 1px, transparent 4px)" }} />
              </div>

              {/* Trader Identity Section */}
              <div className="px-4 py-1">
                <div style={{ fontFamily: '"Space Mono", monospace', fontSize: 6 * s, letterSpacing: "0.25em", color: inkColor, textTransform: "uppercase" }}>
                  AUTHORIZED OPERATOR
                </div>
                <div style={{ fontSize: 17 * s, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.1, marginTop: 2 * s }}>
                  {name}
                </div>
                <div style={{ fontSize: 7.5 * s, marginTop: 2 * s, color: "#b9becf", letterSpacing: "0.12em", textTransform: "uppercase" }}>
                  {role}
                </div>
                {email && (
                  <div style={{ fontSize: 6.5 * s, marginTop: 2 * s, color: "#8e94a8", fontFamily: '"Space Mono", monospace' }}>
                    {email}
                  </div>
                )}
              </div>

              {/* 4-Cell Quantitative Parameters Grid */}
              <div className="px-4 py-0.5">
                <div className="grid grid-cols-2 gap-1.5" style={{ fontSize: 5.2 * s, fontFamily: '"Space Mono", monospace' }}>
                  <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", padding: `${2.5 * s}px ${5 * s}px`, borderRadius: 4 * s }}>
                    <div style={{ color: "#8e94a8", letterSpacing: "0.1em" }}>DESK</div>
                    <div style={{ color: "#eef0f6", fontWeight: 600, marginTop: 1 }}>Harmonic HFT</div>
                  </div>
                  <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", padding: `${2.5 * s}px ${5 * s}px`, borderRadius: 4 * s }}>
                    <div style={{ color: "#8e94a8", letterSpacing: "0.1em" }}>MARGIN CAP</div>
                    <div style={{ color: "#10b981", fontWeight: 600, marginTop: 1 }}>₹50,000,000</div>
                  </div>
                  <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", padding: `${2.5 * s}px ${5 * s}px`, borderRadius: 4 * s }}>
                    <div style={{ color: "#8e94a8", letterSpacing: "0.1em" }}>ROUTER</div>
                    <div style={{ color: "#eef0f6", fontWeight: 600, marginTop: 1 }}>Smart SOR-v4</div>
                  </div>
                  <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", padding: `${2.5 * s}px ${5 * s}px`, borderRadius: 4 * s }}>
                    <div style={{ color: "#8e94a8", letterSpacing: "0.1em" }}>ALGO AUDIT</div>
                    <div style={{ color: inkColor, fontWeight: 600, marginTop: 1 }}>SEBI PASSED</div>
                  </div>
                </div>
              </div>

              {/* QR Code Matrix & Security Validation */}
              <div className="px-4 py-1 flex items-center justify-between">
                <div style={{ background: "#ffffff", padding: 2.5 * s, borderRadius: 4 * s, flexShrink: 0 }}>
                  <svg viewBox="0 0 29 29" style={{ width: 26 * s, height: 26 * s, display: "block" }}>
                    <rect x="0" y="0" width="7" height="7" fill="#000" />
                    <rect x="1" y="1" width="5" height="5" fill="#fff" />
                    <rect x="2" y="2" width="3" height="3" fill="#000" />

                    <rect x="22" y="0" width="7" height="7" fill="#000" />
                    <rect x="23" y="1" width="5" height="5" fill="#fff" />
                    <rect x="24" y="2" width="3" height="3" fill="#000" />

                    <rect x="0" y="22" width="7" height="7" fill="#000" />
                    <rect x="1" y="23" width="5" height="5" fill="#fff" />
                    <rect x="2" y="24" width="3" height="3" fill="#000" />

                    <rect x="8" y="3" width="2" height="2" fill="#000" />
                    <rect x="12" y="3" width="2" height="2" fill="#000" />
                    <rect x="16" y="3" width="2" height="2" fill="#000" />
                    <rect x="3" y="8" width="2" height="2" fill="#000" />
                    <rect x="3" y="12" width="2" height="2" fill="#000" />
                    <rect x="3" y="16" width="2" height="2" fill="#000" />

                    <rect x="10" y="10" width="4" height="4" fill="#000" />
                    <rect x="16" y="11" width="3" height="2" fill="#000" />
                    <rect x="11" y="16" width="2" height="3" fill="#000" />
                    <rect x="15" y="16" width="4" height="3" fill="#000" />
                    <rect x="21" y="10" width="3" height="3" fill="#000" />
                    <rect x="10" y="21" width="3" height="3" fill="#000" />
                    <rect x="15" y="22" width="3" height="2" fill="#000" />
                    <rect x="21" y="15" width="2" height="4" fill="#000" />
                    <rect x="23" y="22" width="3" height="3" fill="#000" />
                  </svg>
                </div>

                <div style={{ marginLeft: 8 * s, flex: 1 }}>
                  <div style={{ fontSize: 5.2 * s, fontFamily: '"Space Mono", monospace', color: inkColor, fontWeight: 700 }}>
                    DIGITALLY SIGNED
                  </div>
                  <div style={{ fontSize: 4.6 * s, fontFamily: '"Space Mono", monospace', color: "#8e94a8", marginTop: 1, lineHeight: 1.2 }}>
                    SCAN FOR LIVE CLEARING VALIDATION
                  </div>
                  <div style={{ fontSize: 4.2 * s, fontFamily: '"Space Mono", monospace', color: "#666", marginTop: 1 }}>
                    HASH: 7d1a98c2...e890f4
                  </div>
                </div>
              </div>

              {/* Bottom Regulatory Strip */}
              <div
                style={{
                  background: strapColor,
                  borderRadius: `${14 * s}px ${14 * s}px 0 0`,
                  padding: `${5 * s}px ${10 * s}px`,
                  color: inkColor,
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 5.2 * s, fontFamily: '"Space Mono", monospace', letterSpacing: "0.2em", textTransform: "uppercase", opacity: 0.9 }}>
                  VERIFIED OPERATOR · VOLTREX SYSTEM
                </div>
                <div style={{ fontSize: 4 * s, color: "#8e94a8", marginTop: 1, letterSpacing: "0.05em" }}>
                  NON-TRANSFERABLE · IMMEDIATE REVOCATION UPON BREACH
                </div>
              </div>
            </div>
            <div className="badge-shine-overlay" />
          </div>
        </div>
      </div>

      {/* Bottom CTA Button */}
      {onDismiss && (
        <div className="absolute bottom-14 z-30 flex flex-col items-center">
          <button
            onClick={onDismiss}
            className="flex items-center gap-2 px-8 py-3 rounded-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 text-white font-mono text-xs sm:text-sm tracking-wider font-semibold shadow-lg shadow-orange-500/30 transition-all cursor-pointer hover:scale-105 active:scale-95"
          >
            <span>{dismissLabel}</span>
          </button>
        </div>
      )}

      <div className="absolute bottom-5 text-center text-xs text-[#8e94a8] font-mono z-20 pointer-events-none">
        Drag the badge to swing · Click to flip · Press &quot;{dismissLabel}&quot; to explore plans
      </div>
    </div>
  );
}
