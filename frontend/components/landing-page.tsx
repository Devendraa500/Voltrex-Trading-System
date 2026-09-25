"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Lenis from "lenis";
import * as d3 from "d3";
import { ParticleWave } from "@/components/particle-wave";
import { SplineSceneBasic } from "@/components/spline-scene-basic";
import { usePerfTier } from "@/hooks/use-perf-tier";
import MercuryLogin from "@/components/mercury-login";
import LanyardBadge from "@/components/ui/lanyard-badge";

export function LandingPage() {
  const router = useRouter();
  const perfTier = usePerfTier();
  const [showLogin, setShowLogin] = useState(false);
  const [badgeUser, setBadgeUser] = useState<{ name: string; email: string; role: string } | null>(null);
  const fluidCanvasRef = useRef<HTMLCanvasElement>(null);
  const earthCanvasRef = useRef<HTMLCanvasElement>(null);
  const earthPanelRef = useRef<HTMLDivElement>(null);
  const navCtaMountRef = useRef<HTMLSpanElement>(null);
  const requestAccessMountRef = useRef<HTMLSpanElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const subRef = useRef<HTMLParagraphElement>(null);
  const waitlistFormRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    // ── 1. Lenis Smooth Scroll ───────────────────────────────────────
    const lenis = new Lenis({ smoothWheel: true });
    let lenisRafId: number;
    function raf(t: number) {
      lenis.raf(t);
      lenisRafId = requestAnimationFrame(raf);
    }
    lenisRafId = requestAnimationFrame(raf);

    // ── 2. Word-by-word split & reveal ───────────────────────────────
    function splitWords(el: HTMLElement | null) {
      if (!el) return [];
      const text = el.textContent || "";
      const words = text.split(" ");
      el.innerHTML = words
        .map((w, i) => `<span class="word">${w}</span>${i < words.length - 1 ? " " : ""}`)
        .join("");
      return Array.from(el.querySelectorAll<HTMLElement>(".word"));
    }

    const headingWords = splitWords(headingRef.current);
    const subWords = splitWords(subRef.current);

    function easeOutCubic(t: number) {
      return 1 - Math.pow(1 - t, 3);
    }

    function animateWords(
      words: HTMLElement[],
      baseDelay: number,
      stagger: number,
      duration: number,
      fromY: number,
    ) {
      words.forEach((word, i) => {
        const delay = baseDelay + i * stagger;
        setTimeout(() => {
          const start = performance.now();
          function frame(now: number) {
            const t = Math.min(1, (now - start) / duration);
            const eased = easeOutCubic(t);
            word.style.opacity = String(eased);
            word.style.transform = `translateY(${fromY * (1 - eased)}px)`;
            if (t < 1) requestAnimationFrame(frame);
          }
          requestAnimationFrame(frame);
        }, delay);
      });
    }

    function reveal(id: string, delay: number) {
      setTimeout(() => {
        const el = document.getElementById(id);
        if (el) el.classList.add("revealed");
      }, delay);
    }

    reveal("nav", 150);
    reveal("badge", 320);
    animateWords(headingWords, 480, 85, 720, 26);
    animateWords(subWords, 1150, 22, 600, 14);
    reveal("formWrap", 1450);
    reveal("footer", 1650);

    const formEl = waitlistFormRef.current;
    const handleFormSubmit = (e: Event) => {
      e.preventDefault();
      router.push("/terminal");
    };
    if (formEl) formEl.addEventListener("submit", handleFormSubmit);

    // ── 3. Liquid Metal Buttons Mount ────────────────────────────────
    let navCleanup: (() => void) | undefined;
    let reqCleanup: (() => void) | undefined;

    if (navCtaMountRef.current) {
      navCleanup = mountLiquidMetalButton(navCtaMountRef.current, {
        label: "Login / Signup",
        type: "button",
        onClick: () => {
          setShowLogin(true);
        },
      })?.destroy;
    }

    if (requestAccessMountRef.current) {
      reqCleanup = mountLiquidMetalButton(requestAccessMountRef.current, {
        label: "Request Access",
        type: "submit",
        onClick: () => {
          router.push("/terminal");
        },
      })?.destroy;
    }

    // ── 4. Fluid simulation engine (only on high tier) ────────────────
    let fluidCleanup: (() => void) | undefined;
    if (perfTier === "high" && fluidCanvasRef.current) {
      fluidCleanup = fluidSimulation(fluidCanvasRef.current);
    }

    // ── 5. Rotating Earth (high & medium tiers) ─────────────────────
    let earthCleanup: (() => void) | undefined;
    if (perfTier !== "low" && earthCanvasRef.current && earthPanelRef.current) {
      earthCleanup = initRotatingEarth(earthPanelRef.current, earthCanvasRef.current);
    }

    return () => {
      cancelAnimationFrame(lenisRafId);
      lenis.destroy();
      if (formEl) formEl.removeEventListener("submit", handleFormSubmit);
      navCleanup?.();
      reqCleanup?.();
      fluidCleanup?.();
      earthCleanup?.();
    };
  }, [router, perfTier]);

  return (
    <>
    <div className="landing-page-body">
      <section className="hero">
        {/* ParticleWave: only on high tier */}
        {perfTier === "high" && <ParticleWave />}

        {/* Fluid canvas: only on high tier */}
        {perfTier === "high" && (
          <canvas ref={fluidCanvasRef} className="fluid-canvas" aria-hidden="true" />
        )}

        {/* Static gradient fallback for medium/low tiers */}
        {perfTier !== "high" && (
          <div
            className="absolute inset-0 z-0"
            style={{
              background: "radial-gradient(ellipse at 30% 50%, rgba(82,228,184,0.08) 0%, transparent 60%), radial-gradient(ellipse at 70% 30%, rgba(100,140,255,0.06) 0%, transparent 50%), #04050c",
            }}
            aria-hidden="true"
          />
        )}

        <div className="scrim" aria-hidden="true" />

        <header className="nav" id="nav">
          <a className="brand" href="/">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M2.5 9c2.5 0 2.5 4.2 5 4.2S10 9 12 9s2.5 4.2 5 4.2S19.5 9 21.5 9"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
              <path
                d="M2.5 15c2.5 0 2.5 4.2 5 4.2S10 15 12 15s2.5 4.2 5 4.2S19.5 15 21.5 15"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                opacity="0.5"
              />
            </svg>
            <span>Voltrex</span>
          </a>

          <nav className="nav-pill">
            <a href="/terminal">Equilibrium Engine</a>
            <a href="/scanner">Scanner</a>
            <a href="/terminal">Architecture</a>
            <a href="/terminal">API</a>
          </nav>

          <span ref={navCtaMountRef} id="navCtaMount" className="liquid-btn-mount" />
        </header>

        {/* Earth globe: high & medium tiers only */}
        {perfTier !== "low" && (
          <div className="earth-panel" id="earthPanel" ref={earthPanelRef}>
            <canvas ref={earthCanvasRef} id="earthCanvas" />
          </div>
        )}

        <div className="center-col">
          <p className="badge" id="badge">
            NSE Equities · Square-Root Harmonic Engine
          </p>

          <h1 className="heading" id="heading" ref={headingRef}>
            Institutional Market Structure, Resolved
          </h1>

          <p className="sub" id="sub" ref={subRef}>
            Voltrex deterministically maps liquidity zones, True Value equilibrium,
            QR/QS levels, and ranked opportunities across Indian equities.
          </p>

          <div className="form-wrap" id="formWrap">
            <form className="waitlist" id="waitlistForm" ref={waitlistFormRef}>
              <div className="glass-bar">
                <input
                  type="email"
                  required
                  placeholder="Get early access to the terminal"
                />
                <span
                  ref={requestAccessMountRef}
                  id="requestAccessMount"
                  className="liquid-btn-mount"
                />
              </div>
            </form>
          </div>
        </div>

        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 text-neutral-400 text-xs font-mono animate-bounce opacity-75 pointer-events-none">
          <span>Scroll to explore 3D topology</span>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </section>

      {/* ── Lower Fullscreen Section: Spline 3D + KineticGrid (high & medium only) ── */}
      {perfTier !== "low" ? (
        <SplineSceneBasic />
      ) : (
        <footer className="w-full py-8 border-t border-white/10 text-center text-xs text-neutral-500 font-mono bg-[#04050c]">
          © 2026 Voltrex Trading System — engineered for quantitative equities analysis.
        </footer>
      )}
    </div>

      {/* ── Mercury Login Overlay ── */}
      {showLogin && (
        <MercuryLogin
          onClose={() => setShowLogin(false)}
          onSuccess={(user) => {
            setShowLogin(false);
            setBadgeUser(user);
          }}
        />
      )}

      {/* ── Lanyard Badge (ID Card) Overlay ── */}
      {badgeUser && (
        <LanyardBadge
          name={badgeUser.name}
          email={badgeUser.email}
          role={badgeUser.role}
          title="VOLTREX"
          subtitle="Institutional Trading Terminal · 2026"
          onDismiss={() => {
            setBadgeUser(null);
            router.push("/terminal");
          }}
        />
      )}
    </>
  );
}

// ── Liquid Metal Button Builder ──────────────────────────────────────────────
function measureLabelWidth(label: string) {
  if (typeof document === "undefined") return 120;
  const span = document.createElement("span");
  span.style.visibility = "hidden";
  span.style.position = "absolute";
  span.style.whiteSpace = "nowrap";
  span.style.fontSize = "14px";
  span.style.fontFamily = '"Onest", sans-serif';
  span.style.fontWeight = "400";
  span.textContent = label;
  document.body.appendChild(span);
  const w = span.getBoundingClientRect().width;
  document.body.removeChild(span);
  return w;
}

function mountLiquidMetalButton(
  mountEl: HTMLElement,
  {
    label,
    type = "button",
    onClick,
  }: { label: string; type?: "button" | "submit"; onClick?: (e: Event) => void }
) {
  if (!mountEl) return;
  mountEl.innerHTML = "";

  const textWidth = measureLabelWidth(label);
  const width = Math.max(120, Math.ceil(textWidth) + 56);
  const height = 46;
  const innerWidth = width - 4;
  const innerHeight = height - 4;

  let isHovered = false;
  let isPressed = false;
  let rippleId = 0;
  let animId = 0;

  const wrap = document.createElement("div");
  wrap.style.position = "relative";
  wrap.style.display = "inline-block";

  const perspectiveEl = document.createElement("div");
  perspectiveEl.style.perspective = "1000px";
  perspectiveEl.style.perspectiveOrigin = "50% 50%";

  const stage = document.createElement("div");
  Object.assign(stage.style, {
    position: "relative",
    width: `${width}px`,
    height: `${height}px`,
    transformStyle: "preserve-3d",
    transition: "all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1), width 0.4s ease, height 0.4s ease",
    transform: "none",
  });

  // Label layer
  const labelLayer = document.createElement("div");
  Object.assign(labelLayer.style, {
    position: "absolute",
    top: "0",
    left: "0",
    width: `${width}px`,
    height: `${height}px`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    transformStyle: "preserve-3d",
    transition: "all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1), width 0.4s ease, height 0.4s ease, gap 0.4s ease",
    transform: "translateZ(20px)",
    zIndex: "30",
    pointerEvents: "none",
  });
  const labelSpan = document.createElement("span");
  Object.assign(labelSpan.style, {
    fontSize: "14px",
    color: "#eef0f6",
    fontWeight: "400",
    textShadow: "0px 1px 2px rgba(0, 0, 0, 0.5)",
    transition: "all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)",
    transform: "scale(1)",
    whiteSpace: "nowrap",
  });
  labelSpan.textContent = label;
  labelLayer.appendChild(labelSpan);

  // Inner dark base layer
  const baseLayer = document.createElement("div");
  Object.assign(baseLayer.style, {
    position: "absolute",
    top: "0",
    left: "0",
    width: `${width}px`,
    height: `${height}px`,
    transformStyle: "preserve-3d",
    transition: "all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1), width 0.4s ease, height 0.4s ease",
    transform: "translateZ(10px) translateY(0) scale(1)",
    zIndex: "20",
  });
  const baseInner = document.createElement("div");
  Object.assign(baseInner.style, {
    width: `${innerWidth}px`,
    height: `${innerHeight}px`,
    margin: "2px",
    borderRadius: "100px",
    background: "linear-gradient(180deg, #202020 0%, #000000 100%)",
    boxShadow: "none",
    transition: "all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1), width 0.4s ease, height 0.4s ease, box-shadow 0.15s cubic-bezier(0.4, 0, 0.2, 1)",
  });
  baseLayer.appendChild(baseInner);

  // Shader layer
  const shaderOuter = document.createElement("div");
  Object.assign(shaderOuter.style, {
    position: "absolute",
    top: "0",
    left: "0",
    width: `${width}px`,
    height: `${height}px`,
    transformStyle: "preserve-3d",
    transition: "all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1), width 0.4s ease, height 0.4s ease",
    transform: "translateZ(0px) translateY(0) scale(1)",
    zIndex: "10",
  });
  const shadowWrap = document.createElement("div");
  Object.assign(shadowWrap.style, {
    height: `${height}px`,
    width: `${width}px`,
    borderRadius: "100px",
    boxShadow:
      "0px 0px 0px 1px rgba(0, 0, 0, 0.3), 0px 36px 14px 0px rgba(0, 0, 0, 0.02), 0px 20px 12px 0px rgba(0, 0, 0, 0.08), 0px 9px 9px 0px rgba(0, 0, 0, 0.12), 0px 2px 5px 0px rgba(0, 0, 0, 0.15)",
    transition: "all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1), width 0.4s ease, height 0.4s ease, box-shadow 0.15s cubic-bezier(0.4, 0, 0.2, 1)",
    background: "rgb(0 0 0 / 0)",
  });
  const shaderContainer = document.createElement("div");
  shaderContainer.className = "shader-container-exploded";
  Object.assign(shaderContainer.style, {
    borderRadius: "100px",
    overflow: "hidden",
    position: "relative",
    width: `${width}px`,
    maxWidth: `${width}px`,
    height: `${height}px`,
    transition: "width 0.4s ease, height 0.4s ease",
  });

  const shaderCanvas = document.createElement("canvas");
  shaderCanvas.width = width;
  shaderCanvas.height = height;
  Object.assign(shaderCanvas.style, {
    width: "100%",
    height: "100%",
    position: "absolute",
    top: "0",
    left: "0",
    borderRadius: "100px",
  });
  shaderContainer.appendChild(shaderCanvas);
  shadowWrap.appendChild(shaderContainer);
  shaderOuter.appendChild(shadowWrap);

  // WebGL Liquid Metal shader implementation
  const gl = shaderCanvas.getContext("webgl");
  let speedUniform = 0.45;
  if (gl) {
    const glCtx = gl;
    const vs = `
      attribute vec2 position;
      void main() {
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `;
    const fs = `
      precision mediump float;
      uniform vec2 u_res;
      uniform float u_time;
      uniform float u_speed;
      void main() {
        vec2 st = gl_FragCoord.xy / u_res.xy;
        vec2 p = (st - 0.5) * 2.0;
        p.x *= u_res.x / u_res.y;
        float len = length(p);
        float angle = atan(p.y, p.x) + u_time * u_speed * 1.6;
        float wave = sin(len * 7.0 - u_time * u_speed * 2.8) * cos(angle * 3.0);
        
        vec3 dark = vec3(0.06, 0.07, 0.10);
        vec3 mid = vec3(0.32, 0.35, 0.44);
        vec3 bright = vec3(0.88, 0.91, 0.98);

        float t = clamp(wave * 0.5 + 0.5, 0.0, 1.0);
        vec3 col = mix(dark, mid, smoothstep(0.1, 0.6, t));
        col = mix(col, bright, pow(t, 5.0));

        gl_FragColor = vec4(col, 1.0);
      }
    `;

    function createShader(type: number, src: string) {
      const s = glCtx.createShader(type)!;
      glCtx.shaderSource(s, src);
      glCtx.compileShader(s);
      return s;
    }

    const prg = glCtx.createProgram()!;
    glCtx.attachShader(prg, createShader(glCtx.VERTEX_SHADER, vs));
    glCtx.attachShader(prg, createShader(glCtx.FRAGMENT_SHADER, fs));
    glCtx.linkProgram(prg);
    glCtx.useProgram(prg);

    const buf = glCtx.createBuffer();
    glCtx.bindBuffer(glCtx.ARRAY_BUFFER, buf);
    glCtx.bufferData(
      glCtx.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      glCtx.STATIC_DRAW
    );
    const pos = glCtx.getAttribLocation(prg, "position");
    glCtx.enableVertexAttribArray(pos);
    glCtx.vertexAttribPointer(pos, 2, glCtx.FLOAT, false, 0, 0);

    const uRes = glCtx.getUniformLocation(prg, "u_res");
    const uTime = glCtx.getUniformLocation(prg, "u_time");
    const uSpeed = glCtx.getUniformLocation(prg, "u_speed");

    glCtx.uniform2f(uRes, width, height);

    const startTime = performance.now();
    function renderShader(now: number) {
      const elapsed = (now - startTime) / 1000;
      glCtx.viewport(0, 0, width, height);
      glCtx.uniform1f(uTime, elapsed);
      glCtx.uniform1f(uSpeed, speedUniform);
      glCtx.drawArrays(glCtx.TRIANGLES, 0, 6);
      animId = requestAnimationFrame(renderShader);
    }
    animId = requestAnimationFrame(renderShader);
  }

  // Interactive button element
  const btn = document.createElement("button");
  btn.type = type;
  btn.setAttribute("aria-label", label);
  Object.assign(btn.style, {
    position: "absolute",
    top: "0",
    left: "0",
    width: `${width}px`,
    height: `${height}px`,
    background: "transparent",
    border: "none",
    cursor: "pointer",
    outline: "none",
    zIndex: "40",
    transformStyle: "preserve-3d",
    transform: "translateZ(25px)",
    transition: "all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1), width 0.4s ease, height 0.4s ease",
    overflow: "hidden",
    borderRadius: "100px",
  });

  stage.appendChild(labelLayer);
  stage.appendChild(baseLayer);
  stage.appendChild(shaderOuter);
  stage.appendChild(btn);
  perspectiveEl.appendChild(stage);
  wrap.appendChild(perspectiveEl);
  mountEl.appendChild(wrap);

  function updatePressVisual() {
    const t = isPressed ? "translateY(1px) scale(0.98)" : "translateY(0) scale(1)";
    baseLayer.style.transform = `translateZ(10px) ${t}`;
    shaderOuter.style.transform = `translateZ(0px) ${t}`;
    baseInner.style.boxShadow = isPressed
      ? "inset 0px 2px 4px rgba(0, 0, 0, 0.4), inset 0px 1px 2px rgba(0, 0, 0, 0.3)"
      : "none";
    shadowWrap.style.boxShadow = isPressed
      ? "0px 0px 0px 1px rgba(0, 0, 0, 0.5), 0px 1px 2px 0px rgba(0, 0, 0, 0.3)"
      : isHovered
      ? "0px 0px 0px 1px rgba(0, 0, 0, 0.4), 0px 12px 6px 0px rgba(0, 0, 0, 0.05), 0px 8px 5px 0px rgba(0, 0, 0, 0.1), 0px 4px 4px 0px rgba(0, 0, 0, 0.15), 0px 1px 2px 0px rgba(0, 0, 0, 0.2)"
      : "0px 0px 0px 1px rgba(0, 0, 0, 0.3), 0px 36px 14px 0px rgba(0, 0, 0, 0.02), 0px 20px 12px 0px rgba(0, 0, 0, 0.08), 0px 9px 9px 0px rgba(0, 0, 0, 0.12), 0px 2px 5px 0px rgba(0, 0, 0, 0.15)";
  }

  btn.addEventListener("mouseenter", () => {
    isHovered = true;
    speedUniform = 0.95;
    updatePressVisual();
  });
  btn.addEventListener("mouseleave", () => {
    isHovered = false;
    isPressed = false;
    speedUniform = 0.45;
    updatePressVisual();
  });
  btn.addEventListener("mousedown", () => {
    isPressed = true;
    updatePressVisual();
  });
  btn.addEventListener("mouseup", () => {
    isPressed = false;
    updatePressVisual();
  });

  btn.addEventListener("click", (e) => {
    speedUniform = 1.8;
    setTimeout(() => {
      speedUniform = isHovered ? 0.95 : 0.45;
    }, 300);

    const rect = btn.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const ripple = document.createElement("span");
    Object.assign(ripple.style, {
      position: "absolute",
      left: `${x}px`,
      top: `${y}px`,
      width: "20px",
      height: "20px",
      borderRadius: "50%",
      background: "radial-gradient(circle, rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0) 70%)",
      pointerEvents: "none",
      animation: "ripple-animation 0.6s ease-out",
    });
    btn.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);

    onClick?.(e);
  });

  return {
    destroy: () => {
      cancelAnimationFrame(animId);
    },
  };
}

// ── Rotating Earth (verbatim per spec) ───────────────────────────────────────
function initRotatingEarth(panel: HTMLElement, earthCanvas: HTMLCanvasElement) {
  if (!panel || !earthCanvas || typeof d3 === "undefined") return;

  const context = earthCanvas.getContext("2d");
  if (!context) return;

  function getContainerSize() {
    const rect = panel.getBoundingClientRect();
    const w = Math.max(160, rect.width || 320);
    const h = w; // square aspect
    return { w, h };
  }

  let { w: containerWidth, h: containerHeight } = getContainerSize();
  let radius = Math.min(containerWidth, containerHeight) / 2.2;

  const dpr = window.devicePixelRatio || 1;
  earthCanvas.width = containerWidth * dpr;
  earthCanvas.height = containerHeight * dpr;
  earthCanvas.style.width = `${containerWidth}px`;
  earthCanvas.style.height = `${containerHeight}px`;
  context.scale(dpr, dpr);

  const projection = d3
    .geoOrthographic()
    .scale(radius)
    .translate([containerWidth / 2, containerHeight / 2])
    .clipAngle(90);

  const path = d3.geoPath().projection(projection).context(context);

  function pointInPolygon(point: [number, number], polygon: number[][]) {
    const [x, y] = point;
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const [xi, yi] = polygon[i];
      const [xj, yj] = polygon[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
        inside = !inside;
      }
    }
    return inside;
  }

  function pointInFeature(point: [number, number], feature: any) {
    const geometry = feature.geometry;
    if (geometry.type === "Polygon") {
      const coordinates = geometry.coordinates;
      if (!pointInPolygon(point, coordinates[0])) return false;
      for (let i = 1; i < coordinates.length; i++) {
        if (pointInPolygon(point, coordinates[i])) return false;
      }
      return true;
    } else if (geometry.type === "MultiPolygon") {
      for (const polygon of geometry.coordinates) {
        if (pointInPolygon(point, polygon[0])) {
          let inHole = false;
          for (let i = 1; i < polygon.length; i++) {
            if (pointInPolygon(point, polygon[i])) {
              inHole = true;
              break;
            }
          }
          if (!inHole) return true;
        }
      }
      return false;
    }
    return false;
  }

  function generateDotsInPolygon(feature: any, dotSpacing = 16) {
    const dots: [number, number][] = [];
    const bounds = d3.geoBounds(feature);
    const [[minLng, minLat], [maxLng, maxLat]] = bounds;
    const stepSize = dotSpacing * 0.08;
    for (let lng = minLng; lng <= maxLng; lng += stepSize) {
      for (let lat = minLat; lat <= maxLat; lat += stepSize) {
        const point: [number, number] = [lng, lat];
        if (pointInFeature(point, feature)) dots.push(point);
      }
    }
    return dots;
  }

  const allDots: [number, number][] = [];
  let landFeatures: any = null;

  function render() {
    if (!context) return;
    context.clearRect(0, 0, containerWidth, containerHeight);

    const currentScale = projection.scale();
    const scaleFactor = currentScale / radius;

    context.beginPath();
    context.arc(containerWidth / 2, containerHeight / 2, currentScale, 0, 2 * Math.PI);
    context.fillStyle = "#000000";
    context.fill();
    context.strokeStyle = "#ffffff";
    context.lineWidth = 2 * scaleFactor;
    context.stroke();

    if (landFeatures) {
      const graticule = d3.geoGraticule();
      context.beginPath();
      path(graticule());
      context.strokeStyle = "#ffffff";
      context.lineWidth = 1 * scaleFactor;
      context.globalAlpha = 0.25;
      context.stroke();
      context.globalAlpha = 1;

      context.beginPath();
      landFeatures.features.forEach((feature: any) => {
        path(feature);
      });
      context.strokeStyle = "#ffffff";
      context.lineWidth = 1 * scaleFactor;
      context.stroke();

      allDots.forEach((dot) => {
        const projected = projection(dot);
        if (
          projected &&
          projected[0] >= 0 &&
          projected[0] <= containerWidth &&
          projected[1] >= 0 &&
          projected[1] <= containerHeight
        ) {
          context.beginPath();
          context.arc(projected[0], projected[1], 1.2 * scaleFactor, 0, 2 * Math.PI);
          context.fillStyle = "#999999";
          context.fill();
        }
      });
    }
  }

  async function loadWorldData() {
    try {
      const response = await fetch(
        "https://raw.githubusercontent.com/martynafford/natural-earth-geojson/refs/heads/master/110m/physical/ne_110m_land.json"
      );
      if (!response.ok) throw new Error("Failed to load land data");
      landFeatures = await response.json();

      landFeatures.features.forEach((feature: any) => {
        const dots = generateDotsInPolygon(feature, 16);
        dots.forEach(([lng, lat]) => allDots.push([lng, lat]));
      });

      render();
      panel.classList.add("revealed");
    } catch {
      panel.classList.add("revealed");
    }
  }

  const rotation: [number, number] = [0, 0];
  let autoRotate = true;
  const rotationSpeed = 0.1;

  const timer = d3.timer(() => {
    if (autoRotate) {
      rotation[0] += rotationSpeed;
      projection.rotate(rotation);
      render();
    }
  });

  const onMouseDown = (event: MouseEvent) => {
    autoRotate = false;
    const startX = event.clientX;
    const startY = event.clientY;
    const startRotation = [...rotation];

    function handleMouseMove(moveEvent: MouseEvent) {
      const sensitivity = 0.5;
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      rotation[0] = startRotation[0] + dx * sensitivity;
      rotation[1] = startRotation[1] - dy * sensitivity;
      rotation[1] = Math.max(-90, Math.min(90, rotation[1]));
      projection.rotate(rotation);
      render();
    }

    function handleMouseUp() {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      setTimeout(() => {
        autoRotate = true;
      }, 10);
    }

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const onWheel = (event: WheelEvent) => {
    event.preventDefault();
    const scaleFactor = event.deltaY > 0 ? 0.9 : 1.1;
    const newRadius = Math.max(radius * 0.5, Math.min(radius * 3, projection.scale() * scaleFactor));
    projection.scale(newRadius);
    render();
  };

  const onResize = () => {
    const size = getContainerSize();
    containerWidth = size.w;
    containerHeight = size.h;
    radius = Math.min(containerWidth, containerHeight) / 2.2;
    const dpr2 = window.devicePixelRatio || 1;
    earthCanvas.width = containerWidth * dpr2;
    earthCanvas.height = containerHeight * dpr2;
    earthCanvas.style.width = `${containerWidth}px`;
    earthCanvas.style.height = `${containerHeight}px`;
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.scale(dpr2, dpr2);
    projection.scale(radius).translate([containerWidth / 2, containerHeight / 2]);
    render();
  };

  earthCanvas.addEventListener("mousedown", onMouseDown);
  earthCanvas.addEventListener("wheel", onWheel, { passive: false });
  window.addEventListener("resize", onResize);

  loadWorldData();

  return () => {
    timer.stop();
    earthCanvas.removeEventListener("mousedown", onMouseDown);
    earthCanvas.removeEventListener("wheel", onWheel);
    window.removeEventListener("resize", onResize);
  };
}

// ── Fluid simulation engine (verbatim per spec) ──────────────────────────────
function fluidSimulation(canvas: HTMLCanvasElement) {
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;

  const config = {
    SIM_RESOLUTION: 200,
    DYE_RESOLUTION: 512,
    DENSITY_DISSIPATION: 0.958,
    VELOCITY_DISSIPATION: 0.96,
    PRESSURE_DISSIPATION: 0.8,
    PRESSURE_ITERATIONS: 20,
    CURL: 42,
    SPLAT_RADIUS: 0.22,
    SHADING: true,
    COLORFUL: true,
    PAUSED: false,
    BACK_COLOR: { r: 4, g: 5, b: 12 },
    TRANSPARENT: true,
    BLOOM: false,
    BLOOM_ITERATIONS: 8,
    BLOOM_RESOLUTION: 256,
    BLOOM_INTENSITY: 0.8,
    BLOOM_THRESHOLD: 0.8,
    BLOOM_SOFT_KNEE: 0.7,
  };

  function pointerPrototype(this: any) {
    this.id = -1;
    this.x = 0;
    this.y = 0;
    this.dx = 0;
    this.dy = 0;
    this.down = false;
    this.moved = false;
    this.color = [30, 0, 300];
  }

  const pointers: any[] = [];
  const splatStack: number[] = [];
  const bloomFramebuffers: any[] = [];
  pointers.push(new (pointerPrototype as any)());

  const { gl, ext } = getWebGLContext(canvas);
  if (!gl || !ext) return () => {};

  if (isMobile()) config.SHADING = false;
  if (!ext.supportLinearFiltering) {
    config.SHADING = false;
    config.BLOOM = false;
  }

  function getWebGLContext(canv: HTMLCanvasElement) {
    const params = { alpha: true, depth: false, stencil: false, antialias: false, preserveDrawingBuffer: false };
    let glCtx: any = canv.getContext("webgl2", params);
    const isWebGL2 = !!glCtx;
    if (!isWebGL2) glCtx = canv.getContext("webgl", params) || canv.getContext("experimental-webgl", params);

    let halfFloat: any;
    let supportLinearFiltering: any;
    if (isWebGL2) {
      glCtx.getExtension("EXT_color_buffer_float");
      supportLinearFiltering = glCtx.getExtension("OES_texture_float_linear");
    } else {
      halfFloat = glCtx.getExtension("OES_texture_half_float");
      supportLinearFiltering = glCtx.getExtension("OES_texture_half_float_linear");
    }

    glCtx.clearColor(0.0, 0.0, 0.0, 1.0);

    const halfFloatTexType = isWebGL2 ? glCtx.HALF_FLOAT : halfFloat?.HALF_FLOAT_OES;
    let formatRGBA: any;
    let formatRG: any;
    let formatR: any;

    if (isWebGL2) {
      formatRGBA = getSupportedFormat(glCtx, glCtx.RGBA16F, glCtx.RGBA, halfFloatTexType);
      formatRG = getSupportedFormat(glCtx, glCtx.RG16F, glCtx.RG, halfFloatTexType);
      formatR = getSupportedFormat(glCtx, glCtx.R16F, glCtx.RED, halfFloatTexType);
    } else {
      formatRGBA = getSupportedFormat(glCtx, glCtx.RGBA, glCtx.RGBA, halfFloatTexType);
      formatRG = getSupportedFormat(glCtx, glCtx.RGBA, glCtx.RGBA, halfFloatTexType);
      formatR = getSupportedFormat(glCtx, glCtx.RGBA, glCtx.RGBA, halfFloatTexType);
    }

    return {
      gl: glCtx,
      ext: {
        formatRGBA,
        formatRG,
        formatR,
        halfFloatTexType,
        supportLinearFiltering,
      },
    };
  }

  function getSupportedFormat(glCtx: any, internalFormat: any, format: any, type: any) {
    if (!supportRenderTextureFormat(glCtx, internalFormat, format, type)) {
      switch (internalFormat) {
        case glCtx.R16F:
          return getSupportedFormat(glCtx, glCtx.RG16F, glCtx.RG, type);
        case glCtx.RG16F:
          return getSupportedFormat(glCtx, glCtx.RGBA16F, glCtx.RGBA, type);
        default:
          return null;
      }
    }
    return { internalFormat, format };
  }

  function supportRenderTextureFormat(glCtx: any, internalFormat: any, format: any, type: any) {
    const texture = glCtx.createTexture();
    glCtx.bindTexture(glCtx.TEXTURE_2D, texture);
    glCtx.texParameteri(glCtx.TEXTURE_2D, glCtx.TEXTURE_MIN_FILTER, glCtx.NEAREST);
    glCtx.texParameteri(glCtx.TEXTURE_2D, glCtx.TEXTURE_MAG_FILTER, glCtx.NEAREST);
    glCtx.texParameteri(glCtx.TEXTURE_2D, glCtx.TEXTURE_WRAP_S, glCtx.CLAMP_TO_EDGE);
    glCtx.texParameteri(glCtx.TEXTURE_2D, glCtx.TEXTURE_WRAP_T, glCtx.CLAMP_TO_EDGE);
    glCtx.texImage2D(glCtx.TEXTURE_2D, 0, internalFormat, 4, 4, 0, format, type, null);

    const fbo = glCtx.createFramebuffer();
    glCtx.bindFramebuffer(glCtx.FRAMEBUFFER, fbo);
    glCtx.framebufferTexture2D(glCtx.FRAMEBUFFER, glCtx.COLOR_ATTACHMENT0, glCtx.TEXTURE_2D, texture, 0);

    const status = glCtx.checkFramebufferStatus(glCtx.FRAMEBUFFER);
    return status === glCtx.FRAMEBUFFER_COMPLETE;
  }

  function isMobile() {
    return /Mobi|Android/i.test(navigator.userAgent);
  }

  class GLProgram {
    uniforms: any = {};
    program: any;
    constructor(vertexShader: any, fragmentShader: any) {
      this.uniforms = {};
      this.program = gl.createProgram();

      gl.attachShader(this.program, vertexShader);
      gl.attachShader(this.program, fragmentShader);
      gl.linkProgram(this.program);

      if (!gl.getProgramParameter(this.program, gl.LINK_STATUS))
        throw gl.getProgramInfoLog(this.program);

      const uniformCount = gl.getProgramParameter(this.program, gl.ACTIVE_UNIFORMS);
      for (let i = 0; i < uniformCount; i++) {
        const uniformName = gl.getActiveUniform(this.program, i).name;
        this.uniforms[uniformName] = gl.getUniformLocation(this.program, uniformName);
      }
    }

    bind() {
      gl.useProgram(this.program);
    }
  }

  function compileShader(type: any, source: string) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
      throw gl.getShaderInfoLog(shader);

    return shader;
  }

  const baseVertexShader = compileShader(
    gl.VERTEX_SHADER,
    `
        precision highp float;
        attribute vec2 aPosition;
        varying vec2 vUv;
        varying vec2 vL;
        varying vec2 vR;
        varying vec2 vT;
        varying vec2 vB;
        uniform vec2 texelSize;
        void main () {
            vUv = aPosition * 0.5 + 0.5;
            vL = vUv - vec2(texelSize.x, 0.0);
            vR = vUv + vec2(texelSize.x, 0.0);
            vT = vUv + vec2(0.0, texelSize.y);
            vB = vUv - vec2(0.0, texelSize.y);
            gl_Position = vec4(aPosition, 0.0, 1.0);
        }
    `
  );

  const clearShader = compileShader(
    gl.FRAGMENT_SHADER,
    `
        precision mediump float;
        precision mediump sampler2D;
        varying highp vec2 vUv;
        uniform sampler2D uTexture;
        uniform float value;
        void main () {
            gl_FragColor = value * texture2D(uTexture, vUv);
        }
    `
  );

  const colorShader = compileShader(
    gl.FRAGMENT_SHADER,
    `
        precision mediump float;
        uniform vec4 color;
        void main () {
            gl_FragColor = color;
        }
    `
  );

  const backgroundShader = compileShader(
    gl.FRAGMENT_SHADER,
    `
        precision highp float;
        precision highp sampler2D;
        varying vec2 vUv;
        uniform sampler2D uTexture;
        uniform float aspectRatio;
        #define SCALE 25.0
        void main () {
            vec2 uv = floor(vUv * SCALE * vec2(aspectRatio, 1.0));
            float v = mod(uv.x + uv.y, 2.0);
            v = v * 0.1 + 0.8;
            gl_FragColor = vec4(vec3(v), 1.0);
        }
    `
  );

  const displayShader = compileShader(
    gl.FRAGMENT_SHADER,
    `
        precision highp float;
        precision highp sampler2D;
        varying vec2 vUv;
        uniform sampler2D uTexture;
        void main () {
            vec3 C = texture2D(uTexture, vUv).rgb;
            float a = max(C.r, max(C.g, C.b));
            gl_FragColor = vec4(C, a);
        }
    `
  );

  const displayBloomShader = compileShader(
    gl.FRAGMENT_SHADER,
    `
        precision highp float;
        precision highp sampler2D;
        varying vec2 vUv;
        uniform sampler2D uTexture;
        uniform sampler2D uBloom;
        uniform sampler2D uDithering;
        uniform vec2 ditherScale;
        void main () {
            vec3 C = texture2D(uTexture, vUv).rgb;
            vec3 bloom = texture2D(uBloom, vUv).rgb;
            vec3 noise = texture2D(uDithering, vUv * ditherScale).rgb;
            noise = noise * 2.0 - 1.0;
            bloom += noise / 800.0;
            bloom = pow(bloom.rgb, vec3(1.0 / 2.2));
            C += bloom;
            float a = max(C.r, max(C.g, C.b));
            gl_FragColor = vec4(C, a);
        }
    `
  );

  const displayShadingShader = compileShader(
    gl.FRAGMENT_SHADER,
    `
        precision highp float;
        precision highp sampler2D;
        varying vec2 vUv;
        varying vec2 vL;
        varying vec2 vR;
        varying vec2 vT;
        varying vec2 vB;
        uniform sampler2D uTexture;
        uniform vec2 texelSize;
        void main () {
            vec3 L = texture2D(uTexture, vL).rgb;
            vec3 R = texture2D(uTexture, vR).rgb;
            vec3 T = texture2D(uTexture, vT).rgb;
            vec3 B = texture2D(uTexture, vB).rgb;
            vec3 C = texture2D(uTexture, vUv).rgb;
            float dx = length(R) - length(L);
            float dy = length(T) - length(B);
            vec3 n = normalize(vec3(dx, dy, length(texelSize)));
            vec3 l = vec3(0.0, 0.0, 1.0);
            float diffuse = clamp(dot(n, l) + 0.7, 0.7, 1.0);
            C.rgb *= diffuse;
            float a = max(C.r, max(C.g, C.b));
            gl_FragColor = vec4(C, a);
        }
    `
  );

  const displayBloomShadingShader = compileShader(
    gl.FRAGMENT_SHADER,
    `
        precision highp float;
        precision highp sampler2D;
        varying vec2 vUv;
        varying vec2 vL;
        varying vec2 vR;
        varying vec2 vT;
        varying vec2 vB;
        uniform sampler2D uTexture;
        uniform sampler2D uBloom;
        uniform sampler2D uDithering;
        uniform vec2 ditherScale;
        uniform vec2 texelSize;
        void main () {
            vec3 L = texture2D(uTexture, vL).rgb;
            vec3 R = texture2D(uTexture, vR).rgb;
            vec3 T = texture2D(uTexture, vT).rgb;
            vec3 B = texture2D(uTexture, vB).rgb;
            vec3 C = texture2D(uTexture, vUv).rgb;
            float dx = length(R) - length(L);
            float dy = length(T) - length(B);
            vec3 n = normalize(vec3(dx, dy, length(texelSize)));
            vec3 l = vec3(0.0, 0.0, 1.0);
            float diffuse = clamp(dot(n, l) + 0.7, 0.7, 1.0);
            C *= diffuse;
            vec3 bloom = texture2D(uBloom, vUv).rgb;
            vec3 noise = texture2D(uDithering, vUv * ditherScale).rgb;
            noise = noise * 2.0 - 1.0;
            bloom += noise / 800.0;
            bloom = pow(bloom.rgb, vec3(1.0 / 2.2));
            C += bloom;
            float a = max(C.r, max(C.g, C.b));
            gl_FragColor = vec4(C, a);
        }
    `
  );

  const bloomPrefilterShader = compileShader(
    gl.FRAGMENT_SHADER,
    `
        precision mediump float;
        precision mediump sampler2D;
        varying vec2 vUv;
        uniform sampler2D uTexture;
        uniform vec3 curve;
        uniform float threshold;
        void main () {
            vec3 c = texture2D(uTexture, vUv).rgb;
            float br = max(c.r, max(c.g, c.b));
            float rq = clamp(br - curve.x, 0.0, curve.y);
            rq = curve.z * rq * rq;
            c *= max(rq, br - threshold) / max(br, 0.0001);
            gl_FragColor = vec4(c, 0.0);
        }
    `
  );

  const bloomBlurShader = compileShader(
    gl.FRAGMENT_SHADER,
    `
        precision mediump float;
        precision mediump sampler2D;
        varying vec2 vL;
        varying vec2 vR;
        varying vec2 vT;
        varying vec2 vB;
        uniform sampler2D uTexture;
        void main () {
            vec4 sum = vec4(0.0);
            sum += texture2D(uTexture, vL);
            sum += texture2D(uTexture, vR);
            sum += texture2D(uTexture, vT);
            sum += texture2D(uTexture, vB);
            sum *= 0.25;
            gl_FragColor = sum;
        }
    `
  );

  const bloomFinalShader = compileShader(
    gl.FRAGMENT_SHADER,
    `
        precision mediump float;
        precision mediump sampler2D;
        varying vec2 vL;
        varying vec2 vR;
        varying vec2 vT;
        varying vec2 vB;
        uniform sampler2D uTexture;
        uniform float intensity;
        void main () {
            vec4 sum = vec4(0.0);
            sum += texture2D(uTexture, vL);
            sum += texture2D(uTexture, vR);
            sum += texture2D(uTexture, vT);
            sum += texture2D(uTexture, vB);
            sum *= 0.25;
            gl_FragColor = sum * intensity;
        }
    `
  );

  const splatShader = compileShader(
    gl.FRAGMENT_SHADER,
    `
        precision highp float;
        precision highp sampler2D;
        varying vec2 vUv;
        uniform sampler2D uTarget;
        uniform float aspectRatio;
        uniform vec3 color;
        uniform vec2 point;
        uniform float radius;
        void main () {
            vec2 p = vUv - point.xy;
            p.x *= aspectRatio;
            vec3 splat = exp(-dot(p, p) / radius) * color;
            vec3 base = texture2D(uTarget, vUv).xyz;
            gl_FragColor = vec4(base + splat, 1.0);
        }
    `
  );

  const advectionManualFilteringShader = compileShader(
    gl.FRAGMENT_SHADER,
    `
        precision highp float;
        precision highp sampler2D;
        varying vec2 vUv;
        uniform sampler2D uVelocity;
        uniform sampler2D uSource;
        uniform vec2 texelSize;
        uniform vec2 dyeTexelSize;
        uniform float dt;
        uniform float dissipation;
        vec4 bilerp (sampler2D sam, vec2 uv, vec2 tsize) {
            vec2 st = uv / tsize - 0.5;
            vec2 iuv = floor(st);
            vec2 fuv = fract(st);
            vec4 a = texture2D(sam, (iuv + vec2(0.5, 0.5)) * tsize);
            vec4 b = texture2D(sam, (iuv + vec2(1.5, 0.5)) * tsize);
            vec4 c = texture2D(sam, (iuv + vec2(0.5, 1.5)) * tsize);
            vec4 d = texture2D(sam, (iuv + vec2(1.5, 1.5)) * tsize);
            return mix(mix(a, b, fuv.x), mix(c, d, fuv.x), fuv.y);
        }
        void main () {
            vec2 coord = vUv - dt * bilerp(uVelocity, vUv, texelSize).xy * texelSize;
            gl_FragColor = dissipation * bilerp(uSource, coord, dyeTexelSize);
            gl_FragColor.a = 1.0;
        }
    `
  );

  const advectionShader = compileShader(
    gl.FRAGMENT_SHADER,
    `
        precision highp float;
        precision highp sampler2D;
        varying vec2 vUv;
        uniform sampler2D uVelocity;
        uniform sampler2D uSource;
        uniform vec2 texelSize;
        uniform float dt;
        uniform float dissipation;
        void main () {
            vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;
            gl_FragColor = dissipation * texture2D(uSource, coord);
            gl_FragColor.a = 1.0;
        }
    `
  );

  const divergenceShader = compileShader(
    gl.FRAGMENT_SHADER,
    `
        precision mediump float;
        precision mediump sampler2D;
        varying highp vec2 vUv;
        varying highp vec2 vL;
        varying highp vec2 vR;
        varying highp vec2 vT;
        varying highp vec2 vB;
        uniform sampler2D uVelocity;
        void main () {
            float L = texture2D(uVelocity, vL).x;
            float R = texture2D(uVelocity, vR).x;
            float T = texture2D(uVelocity, vT).y;
            float B = texture2D(uVelocity, vB).y;
            vec2 C = texture2D(uVelocity, vUv).xy;
            if (vL.x < 0.0) { L = -C.x; }
            if (vR.x > 1.0) { R = -C.x; }
            if (vT.y > 1.0) { T = -C.y; }
            if (vB.y < 0.0) { B = -C.y; }
            float div = 0.5 * (R - L + T - B);
            gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
        }
    `
  );

  const curlShader = compileShader(
    gl.FRAGMENT_SHADER,
    `
        precision mediump float;
        precision mediump sampler2D;
        varying highp vec2 vUv;
        varying highp vec2 vL;
        varying highp vec2 vR;
        varying highp vec2 vT;
        varying highp vec2 vB;
        uniform sampler2D uVelocity;
        void main () {
            float L = texture2D(uVelocity, vL).y;
            float R = texture2D(uVelocity, vR).y;
            float T = texture2D(uVelocity, vT).x;
            float B = texture2D(uVelocity, vB).x;
            float vorticity = R - L - T + B;
            gl_FragColor = vec4(0.5 * vorticity, 0.0, 0.0, 1.0);
        }
    `
  );

  const vorticityShader = compileShader(
    gl.FRAGMENT_SHADER,
    `
        precision highp float;
        precision highp sampler2D;
        varying vec2 vUv;
        varying vec2 vL;
        varying vec2 vR;
        varying vec2 vT;
        varying vec2 vB;
        uniform sampler2D uVelocity;
        uniform sampler2D uCurl;
        uniform float curl;
        uniform float dt;
        void main () {
            float L = texture2D(uCurl, vL).x;
            float R = texture2D(uCurl, vR).x;
            float T = texture2D(uCurl, vT).x;
            float B = texture2D(uCurl, vB).x;
            float C = texture2D(uCurl, vUv).x;
            vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
            force /= length(force) + 0.0001;
            force *= curl * C;
            force.y *= -1.0;
            vec2 vel = texture2D(uVelocity, vUv).xy;
            gl_FragColor = vec4(vel + force * dt, 0.0, 1.0);
        }
    `
  );

  const pressureShader = compileShader(
    gl.FRAGMENT_SHADER,
    `
        precision mediump float;
        precision mediump sampler2D;
        varying highp vec2 vUv;
        varying highp vec2 vL;
        varying highp vec2 vR;
        varying highp vec2 vT;
        varying highp vec2 vB;
        uniform sampler2D uPressure;
        uniform sampler2D uDivergence;
        vec2 boundary (vec2 uv) {
            return uv;
        }
        void main () {
            float L = texture2D(uPressure, boundary(vL)).x;
            float R = texture2D(uPressure, boundary(vR)).x;
            float T = texture2D(uPressure, boundary(vT)).x;
            float B = texture2D(uPressure, boundary(vB)).x;
            float C = texture2D(uPressure, vUv).x;
            float divergence = texture2D(uDivergence, vUv).x;
            float pressure = (L + R + B + T - divergence) * 0.25;
            gl_FragColor = vec4(pressure, 0.0, 0.0, 1.0);
        }
    `
  );

  const gradientSubtractShader = compileShader(
    gl.FRAGMENT_SHADER,
    `
        precision mediump float;
        precision mediump sampler2D;
        varying highp vec2 vUv;
        varying highp vec2 vL;
        varying highp vec2 vR;
        varying highp vec2 vT;
        varying highp vec2 vB;
        uniform sampler2D uPressure;
        uniform sampler2D uVelocity;
        vec2 boundary (vec2 uv) {
            return uv;
        }
        void main () {
            float L = texture2D(uPressure, boundary(vL)).x;
            float R = texture2D(uPressure, boundary(vR)).x;
            float T = texture2D(uPressure, boundary(vT)).x;
            float B = texture2D(uPressure, boundary(vB)).x;
            vec2 velocity = texture2D(uVelocity, vUv).xy;
            velocity.xy -= vec2(R - L, T - B);
            gl_FragColor = vec4(velocity, 0.0, 1.0);
        }
    `
  );

  const blit = (() => {
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, 1, -1]), gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([0, 1, 2, 0, 2, 3]), gl.STATIC_DRAW);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(0);

    return (destination: any) => {
      gl.bindFramebuffer(gl.FRAMEBUFFER, destination);
      gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
    };
  })();

  let simWidth: number, simHeight: number, dyeWidth: number, dyeHeight: number;
  let density: any, velocity: any, divergence: any, curl: any, pressure: any, bloom: any;

  const ditheringTexture = createNoiseTexture(256);

  const clearProgram = new GLProgram(baseVertexShader, clearShader);
  const colorProgram = new GLProgram(baseVertexShader, colorShader);
  const backgroundProgram = new GLProgram(baseVertexShader, backgroundShader);
  const displayProgram = new GLProgram(baseVertexShader, displayShader);
  const displayBloomProgram = new GLProgram(baseVertexShader, displayBloomShader);
  const displayShadingProgram = new GLProgram(baseVertexShader, displayShadingShader);
  const displayBloomShadingProgram = new GLProgram(baseVertexShader, displayBloomShadingShader);
  const bloomPrefilterProgram = new GLProgram(baseVertexShader, bloomPrefilterShader);
  const bloomBlurProgram = new GLProgram(baseVertexShader, bloomBlurShader);
  const bloomFinalProgram = new GLProgram(baseVertexShader, bloomFinalShader);
  const splatProgram = new GLProgram(baseVertexShader, splatShader);
  const advectionProgram = new GLProgram(
    baseVertexShader,
    ext.supportLinearFiltering ? advectionShader : advectionManualFilteringShader
  );
  const divergenceProgram = new GLProgram(baseVertexShader, divergenceShader);
  const curlProgram = new GLProgram(baseVertexShader, curlShader);
  const vorticityProgram = new GLProgram(baseVertexShader, vorticityShader);
  const pressureProgram = new GLProgram(baseVertexShader, pressureShader);
  const gradienSubtractProgram = new GLProgram(baseVertexShader, gradientSubtractShader);

  function initFramebuffers() {
    const simRes = getResolution(config.SIM_RESOLUTION);
    const dyeRes = getResolution(config.DYE_RESOLUTION);

    simWidth = simRes.width;
    simHeight = simRes.height;
    dyeWidth = dyeRes.width;
    dyeHeight = dyeRes.height;

    const texType = ext.halfFloatTexType;
    const rgba = ext.formatRGBA;
    const rg = ext.formatRG;
    const r = ext.formatR;
    const filtering = ext.supportLinearFiltering ? gl.LINEAR : gl.NEAREST;

    if (density == null)
      density = createDoubleFBO(dyeWidth, dyeHeight, rgba.internalFormat, rgba.format, texType, filtering);
    else
      density = resizeDoubleFBO(density, dyeWidth, dyeHeight, rgba.internalFormat, rgba.format, texType, filtering);

    if (velocity == null)
      velocity = createDoubleFBO(simWidth, simHeight, rg.internalFormat, rg.format, texType, filtering);
    else
      velocity = resizeDoubleFBO(velocity, simWidth, simHeight, rg.internalFormat, rg.format, texType, filtering);

    divergence = createFBO(simWidth, simHeight, r.internalFormat, r.format, texType, gl.NEAREST);
    curl = createFBO(simWidth, simHeight, r.internalFormat, r.format, texType, gl.NEAREST);
    pressure = createDoubleFBO(simWidth, simHeight, r.internalFormat, r.format, texType, gl.NEAREST);

    initBloomFramebuffers();
  }

  function initBloomFramebuffers() {
    const res = getResolution(config.BLOOM_RESOLUTION);

    const texType = ext.halfFloatTexType;
    const rgba = ext.formatRGBA;
    const filtering = ext.supportLinearFiltering ? gl.LINEAR : gl.NEAREST;

    bloom = createFBO(res.width, res.height, rgba.internalFormat, rgba.format, texType, filtering);

    bloomFramebuffers.length = 0;
    for (let i = 0; i < config.BLOOM_ITERATIONS; i++) {
      const width = res.width >> (i + 1);
      const height = res.height >> (i + 1);

      if (width < 2 || height < 2) break;

      const fbo = createFBO(width, height, rgba.internalFormat, rgba.format, texType, filtering);
      bloomFramebuffers.push(fbo);
    }
  }

  function createFBO(w: number, h: number, internalFormat: any, format: any, type: any, param: any) {
    gl.activeTexture(gl.TEXTURE0);
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, param);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, param);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, w, h, 0, format, type, null);

    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    gl.viewport(0, 0, w, h);
    gl.clear(gl.COLOR_BUFFER_BIT);

    return {
      texture,
      fbo,
      width: w,
      height: h,
      attach(id: number) {
        gl.activeTexture(gl.TEXTURE0 + id);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        return id;
      },
    };
  }

  function createDoubleFBO(w: number, h: number, internalFormat: any, format: any, type: any, param: any) {
    let fbo1 = createFBO(w, h, internalFormat, format, type, param);
    let fbo2 = createFBO(w, h, internalFormat, format, type, param);

    return {
      get read() {
        return fbo1;
      },
      set read(value) {
        fbo1 = value;
      },
      get write() {
        return fbo2;
      },
      set write(value) {
        fbo2 = value;
      },
      swap() {
        const temp = fbo1;
        fbo1 = fbo2;
        fbo2 = temp;
      },
    };
  }

  function resizeFBO(target: any, w: number, h: number, internalFormat: any, format: any, type: any, param: any) {
    const newFBO = createFBO(w, h, internalFormat, format, type, param);
    clearProgram.bind();
    gl.uniform1i(clearProgram.uniforms.uTexture, target.attach(0));
    gl.uniform1f(clearProgram.uniforms.value, 1);
    blit(newFBO.fbo);
    return newFBO;
  }

  function resizeDoubleFBO(
    target: any,
    w: number,
    h: number,
    internalFormat: any,
    format: any,
    type: any,
    param: any
  ) {
    target.read = resizeFBO(target.read, w, h, internalFormat, format, type, param);
    target.write = createFBO(w, h, internalFormat, format, type, param);
    return target;
  }

  function createNoiseTexture(size: number) {
    const data = new Uint8Array(size * size * 3);
    for (let i = 0; i < data.length; i++) data[i] = Math.floor(Math.random() * 256);
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, size, size, 0, gl.RGB, gl.UNSIGNED_BYTE, data);
    return {
      texture,
      width: size,
      height: size,
      attach(id: number) {
        gl.activeTexture(gl.TEXTURE0 + id);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        return id;
      },
    };
  }

  initFramebuffers();
  multipleSplats(34);
  for (let i = 0; i < 8; i++) splatStack.push(10 + Math.floor(Math.random() * 10));

  let lastColorChangeTime = Date.now();
  let virtualSeeded = false;
  let orbitAngle = 0;
  let vPrevX = 0,
    vPrevY = 0;
  let virtualColor: any = null;
  let lastVColorTime = 0;
  const engineStart = Date.now();
  const ORBIT_RADIUS = 420;
  const ORBIT_SPEED = 0.0185;
  const ORBIT_START_DELAY = 700;

  let rafHandle = 0;
  let destroyed = false;

  function update() {
    if (destroyed) return;
    resizeCanvas();
    driveVirtualPointer();
    input();
    if (!config.PAUSED) step(0.016);
    render(null);
    rafHandle = requestAnimationFrame(update);
  }

  update();

  function driveVirtualPointer() {
    if (Date.now() - engineStart < ORBIT_START_DELAY) return;
    const cx = canvas.width * 0.2;
    const cy = canvas.height * 0.5;
    const r = Math.min(ORBIT_RADIUS, canvas.width * 0.24, canvas.height * 0.42);
    orbitAngle += ORBIT_SPEED;
    const x = cx + Math.cos(orbitAngle) * r;
    const y = cy + Math.sin(orbitAngle) * r;
    if (!virtualSeeded) {
      virtualSeeded = true;
      vPrevX = x;
      vPrevY = y;
      return;
    }
    if (!virtualColor || Date.now() - lastVColorTime > 120) {
      virtualColor = generateColor();
      virtualColor.r *= 3.2;
      virtualColor.g *= 3.2;
      virtualColor.b *= 3.2;
      lastVColorTime = Date.now();
    }
    const dx = (x - vPrevX) * 9.0;
    const dy = (y - vPrevY) * 9.0;
    vPrevX = x;
    vPrevY = y;
    splat(x, y, dx, dy, virtualColor);
  }

  function input() {
    if (splatStack.length > 0) multipleSplats(splatStack.pop()!);

    for (let i = 0; i < pointers.length; i++) {
      const p = pointers[i];
      if (p.moved) {
        splat(p.x, p.y, p.dx, p.dy, p.color);
        p.moved = false;
      }
    }

    if (!config.COLORFUL) return;

    if (lastColorChangeTime + 100 < Date.now()) {
      lastColorChangeTime = Date.now();
      for (let i = 0; i < pointers.length; i++) {
        const p = pointers[i];
        p.color = generateColor();
      }
    }
  }

  function step(dt: number) {
    gl.disable(gl.BLEND);
    gl.viewport(0, 0, simWidth, simHeight);

    curlProgram.bind();
    gl.uniform2f(curlProgram.uniforms.texelSize, 1.0 / simWidth, 1.0 / simHeight);
    gl.uniform1i(curlProgram.uniforms.uVelocity, velocity.read.attach(0));
    blit(curl.fbo);

    vorticityProgram.bind();
    gl.uniform2f(vorticityProgram.uniforms.texelSize, 1.0 / simWidth, 1.0 / simHeight);
    gl.uniform1i(vorticityProgram.uniforms.uVelocity, velocity.read.attach(0));
    gl.uniform1i(vorticityProgram.uniforms.uCurl, curl.attach(1));
    gl.uniform1f(vorticityProgram.uniforms.curl, config.CURL);
    gl.uniform1f(vorticityProgram.uniforms.dt, dt);
    blit(velocity.write.fbo);
    velocity.swap();

    divergenceProgram.bind();
    gl.uniform2f(divergenceProgram.uniforms.texelSize, 1.0 / simWidth, 1.0 / simHeight);
    gl.uniform1i(divergenceProgram.uniforms.uVelocity, velocity.read.attach(0));
    blit(divergence.fbo);

    clearProgram.bind();
    gl.uniform1i(clearProgram.uniforms.uTexture, pressure.read.attach(0));
    gl.uniform1f(clearProgram.uniforms.value, config.PRESSURE_DISSIPATION);
    blit(pressure.write.fbo);
    pressure.swap();

    pressureProgram.bind();
    gl.uniform2f(pressureProgram.uniforms.texelSize, 1.0 / simWidth, 1.0 / simHeight);
    gl.uniform1i(pressureProgram.uniforms.uDivergence, divergence.attach(0));
    for (let i = 0; i < config.PRESSURE_ITERATIONS; i++) {
      gl.uniform1i(pressureProgram.uniforms.uPressure, pressure.read.attach(1));
      blit(pressure.write.fbo);
      pressure.swap();
    }

    gradienSubtractProgram.bind();
    gl.uniform2f(gradienSubtractProgram.uniforms.texelSize, 1.0 / simWidth, 1.0 / simHeight);
    gl.uniform1i(gradienSubtractProgram.uniforms.uPressure, pressure.read.attach(0));
    gl.uniform1i(gradienSubtractProgram.uniforms.uVelocity, velocity.read.attach(1));
    blit(velocity.write.fbo);
    velocity.swap();

    advectionProgram.bind();
    gl.uniform2f(advectionProgram.uniforms.texelSize, 1.0 / simWidth, 1.0 / simHeight);
    if (!ext.supportLinearFiltering)
      gl.uniform2f(advectionProgram.uniforms.dyeTexelSize, 1.0 / simWidth, 1.0 / simHeight);
    const velocityId = velocity.read.attach(0);
    gl.uniform1i(advectionProgram.uniforms.uVelocity, velocityId);
    gl.uniform1i(advectionProgram.uniforms.uSource, velocityId);
    gl.uniform1f(advectionProgram.uniforms.dt, dt);
    gl.uniform1f(advectionProgram.uniforms.dissipation, config.VELOCITY_DISSIPATION);
    blit(velocity.write.fbo);
    velocity.swap();

    gl.viewport(0, 0, dyeWidth, dyeHeight);

    if (!ext.supportLinearFiltering)
      gl.uniform2f(advectionProgram.uniforms.dyeTexelSize, 1.0 / dyeWidth, 1.0 / dyeHeight);
    gl.uniform1i(advectionProgram.uniforms.uVelocity, velocity.read.attach(0));
    gl.uniform1i(advectionProgram.uniforms.uSource, density.read.attach(1));
    gl.uniform1f(advectionProgram.uniforms.dissipation, config.DENSITY_DISSIPATION);
    blit(density.write.fbo);
    density.swap();
  }

  function render(target: any) {
    if (config.BLOOM) applyBloom(density.read, bloom);

    if (target == null || !config.TRANSPARENT) {
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.enable(gl.BLEND);
    } else {
      gl.disable(gl.BLEND);
    }

    const width = target == null ? gl.drawingBufferWidth : dyeWidth;
    const height = target == null ? gl.drawingBufferHeight : dyeHeight;

    gl.viewport(0, 0, width, height);

    if (!config.TRANSPARENT) {
      colorProgram.bind();
      const bc = config.BACK_COLOR;
      gl.uniform4f(colorProgram.uniforms.color, bc.r / 255, bc.g / 255, bc.b / 255, 1);
      blit(target);
    }

    if (config.SHADING) {
      const program = config.BLOOM ? displayBloomShadingProgram : displayShadingProgram;
      program.bind();
      gl.uniform2f(program.uniforms.texelSize, 1.0 / width, 1.0 / height);
      gl.uniform1i(program.uniforms.uTexture, density.read.attach(0));
      if (config.BLOOM) {
        gl.uniform1i(program.uniforms.uBloom, bloom.attach(1));
        gl.uniform1i(program.uniforms.uDithering, ditheringTexture.attach(2));
        const scale = getTextureScale(ditheringTexture, width, height);
        gl.uniform2f(program.uniforms.ditherScale, scale.x, scale.y);
      }
    } else {
      const program = config.BLOOM ? displayBloomProgram : displayProgram;
      program.bind();
      gl.uniform1i(program.uniforms.uTexture, density.read.attach(0));
      if (config.BLOOM) {
        gl.uniform1i(program.uniforms.uBloom, bloom.attach(1));
        gl.uniform1i(program.uniforms.uDithering, ditheringTexture.attach(2));
        const scale = getTextureScale(ditheringTexture, width, height);
        gl.uniform2f(program.uniforms.ditherScale, scale.x, scale.y);
      }
    }

    blit(target);
  }

  function applyBloom(source: any, destination: any) {
    if (bloomFramebuffers.length < 2) return;

    let last = destination;

    gl.disable(gl.BLEND);
    bloomPrefilterProgram.bind();
    const knee = config.BLOOM_THRESHOLD * config.BLOOM_SOFT_KNEE + 0.0001;
    const curve0 = config.BLOOM_THRESHOLD - knee;
    const curve1 = knee * 2;
    const curve2 = 0.25 / knee;
    gl.uniform3f(bloomPrefilterProgram.uniforms.curve, curve0, curve1, curve2);
    gl.uniform1f(bloomPrefilterProgram.uniforms.threshold, config.BLOOM_THRESHOLD);
    gl.uniform1i(bloomPrefilterProgram.uniforms.uTexture, source.attach(0));
    gl.viewport(0, 0, last.width, last.height);
    blit(last.fbo);

    bloomBlurProgram.bind();
    for (let i = 0; i < bloomFramebuffers.length; i++) {
      const dest = bloomFramebuffers[i];
      gl.uniform2f(bloomBlurProgram.uniforms.texelSize, 1.0 / last.width, 1.0 / last.height);
      gl.uniform1i(bloomBlurProgram.uniforms.uTexture, last.attach(0));
      gl.viewport(0, 0, dest.width, dest.height);
      blit(dest.fbo);
      last = dest;
    }

    gl.blendFunc(gl.ONE, gl.ONE);
    gl.enable(gl.BLEND);

    for (let i = bloomFramebuffers.length - 2; i >= 0; i--) {
      const baseTex = bloomFramebuffers[i];
      gl.uniform2f(bloomBlurProgram.uniforms.texelSize, 1.0 / last.width, 1.0 / last.height);
      gl.uniform1i(bloomBlurProgram.uniforms.uTexture, last.attach(0));
      gl.viewport(0, 0, baseTex.width, baseTex.height);
      blit(baseTex.fbo);
      last = baseTex;
    }

    gl.disable(gl.BLEND);
    bloomFinalProgram.bind();
    gl.uniform2f(bloomFinalProgram.uniforms.texelSize, 1.0 / last.width, 1.0 / last.height);
    gl.uniform1i(bloomFinalProgram.uniforms.uTexture, last.attach(0));
    gl.uniform1f(bloomFinalProgram.uniforms.intensity, config.BLOOM_INTENSITY);
    gl.viewport(0, 0, destination.width, destination.height);
    blit(destination.fbo);
  }

  function splat(x: number, y: number, dx: number, dy: number, color: any) {
    gl.viewport(0, 0, simWidth, simHeight);
    splatProgram.bind();
    gl.uniform1i(splatProgram.uniforms.uTarget, velocity.read.attach(0));
    gl.uniform1f(splatProgram.uniforms.aspectRatio, canvas.width / canvas.height);
    gl.uniform2f(splatProgram.uniforms.point, x / canvas.width, 1.0 - y / canvas.height);
    gl.uniform3f(splatProgram.uniforms.color, dx, -dy, 1.0);
    gl.uniform1f(splatProgram.uniforms.radius, config.SPLAT_RADIUS / 100.0);
    blit(velocity.write.fbo);
    velocity.swap();

    gl.viewport(0, 0, dyeWidth, dyeHeight);
    gl.uniform1i(splatProgram.uniforms.uTarget, density.read.attach(0));
    gl.uniform3f(splatProgram.uniforms.color, color.r, color.g, color.b);
    blit(density.write.fbo);
    density.swap();
  }

  function multipleSplats(amount: number) {
    for (let i = 0; i < amount; i++) {
      const color = generateColor();
      color.r *= 10.0;
      color.g *= 10.0;
      color.b *= 10.0;
      const x = canvas.width * Math.random();
      const y = canvas.height * Math.random();
      const dx = 1000 * (Math.random() - 0.5);
      const dy = 1000 * (Math.random() - 0.5);
      splat(x, y, dx, dy, color);
    }
  }

  function resizeCanvas() {
    if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
      initFramebuffers();
    }
  }

  function pointerPos(clientX: number, clientY: number) {
    const rect = canvas.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  }

  const teardown: (() => void)[] = [];
  function on(target: any, type: string, handler: any, opts?: any) {
    target.addEventListener(type, handler, opts);
    teardown.push(() => target.removeEventListener(type, handler, opts));
  }

  on(window, "mousemove", (e: MouseEvent) => {
    const { x, y } = pointerPos(e.clientX, e.clientY);
    const p = pointers[0];
    if (!p.everMoved) {
      p.everMoved = true;
      p.x = x;
      p.y = y;
      p.down = true;
      return;
    }
    p.down = true;
    p.moved = true;
    p.dx = (x - p.x) * 5.0;
    p.dy = (y - p.y) * 5.0;
    p.x = x;
    p.y = y;
    p.color = generateColor();
  });

  on(
    window,
    "touchmove",
    (e: TouchEvent) => {
      const touches = e.targetTouches;
      for (let i = 0; i < touches.length; i++) {
        if (i >= pointers.length) pointers.push(new (pointerPrototype as any)());
        const p = pointers[i];
        const { x, y } = pointerPos(touches[i].clientX, touches[i].clientY);
        p.down = true;
        p.moved = p.everMoved === true;
        p.everMoved = true;
        p.dx = (x - p.x) * 8.0;
        p.dy = (y - p.y) * 8.0;
        p.x = x;
        p.y = y;
      }
    },
    { passive: true }
  );

  on(
    window,
    "touchstart",
    (e: TouchEvent) => {
      const touches = e.targetTouches;
      for (let i = 0; i < touches.length; i++) {
        if (i >= pointers.length) pointers.push(new (pointerPrototype as any)());
        const p = pointers[i];
        const { x, y } = pointerPos(touches[i].clientX, touches[i].clientY);
        p.id = touches[i].identifier;
        p.down = true;
        p.x = x;
        p.y = y;
        p.color = generateColor();
      }
    },
    { passive: true }
  );

  on(window, "mouseup", () => {
    pointers[0].down = false;
  });

  on(window, "touchend", (e: TouchEvent) => {
    const touches = e.changedTouches;
    for (let i = 0; i < touches.length; i++)
      for (let j = 0; j < pointers.length; j++)
        if (touches[i].identifier === pointers[j].id) pointers[j].down = false;
  });

  return function destroy() {
    destroyed = true;
    if (rafHandle) cancelAnimationFrame(rafHandle);
    for (const off of teardown) off();
  };

  function generateColor() {
    const h = 0.5 + Math.random() * 0.42;
    const c = HSVtoRGB(h, 0.95, 1.0);
    c.r *= 0.92;
    c.g *= 0.92;
    c.b *= 0.92;
    return c;
  }

  function HSVtoRGB(h: number, s: number, v: number) {
    let r = 0,
      g = 0,
      b = 0;
    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);

    switch (i % 6) {
      case 0:
        r = v;
        g = t;
        b = p;
        break;
      case 1:
        r = q;
        g = v;
        b = p;
        break;
      case 2:
        r = p;
        g = v;
        b = t;
        break;
      case 3:
        r = p;
        g = q;
        b = v;
        break;
      case 4:
        r = t;
        g = p;
        b = v;
        break;
      case 5:
        r = v;
        g = p;
        b = q;
        break;
    }
    return { r, g, b };
  }

  function getResolution(resolution: number) {
    let aspectRatio = gl.drawingBufferWidth / gl.drawingBufferHeight;
    if (aspectRatio < 1) aspectRatio = 1.0 / aspectRatio;

    const max = Math.round(resolution * aspectRatio);
    const min = Math.round(resolution);

    if (gl.drawingBufferWidth > gl.drawingBufferHeight) return { width: max, height: min };
    else return { width: min, height: max };
  }

  function getTextureScale(texture: any, width: number, height: number) {
    return { x: width / texture.width, y: height / texture.height };
  }
}
