"use client";

import { useState, useEffect } from "react";

/**
 * Performance Tier Detection
 *
 * Runs a battery of lightweight heuristic checks to classify the device into
 * one of three tiers:
 *
 *   "high"   → All effects enabled (ParticleWave, Fluid Sim, Earth, Spline 3D, KineticGrid, Liquid Metal shaders)
 *   "medium" → Disables heaviest layers (ParticleWave, Fluid Sim, Spline 3D) but keeps Earth, KineticGrid, Liquid Metal
 *   "low"    → Only static CSS gradients + text animations. Zero canvas/WebGL layers.
 *
 * Detection signals (all non-blocking, < 5ms total):
 *   - navigator.hardwareConcurrency (CPU cores)
 *   - navigator.deviceMemory (RAM in GB, Chrome-only)
 *   - WebGL renderer string (integrated vs discrete GPU)
 *   - matchMedia for prefers-reduced-motion
 *   - matchMedia for pointer: coarse (mobile/touch devices)
 *   - Simple GPU benchmark: draw 500 triangles and measure frame time
 */

export type PerfTier = "high" | "medium" | "low";

// GPU benchmark: renders 500 textured triangles and measures frame time
function gpuBenchmark(): Promise<number> {
  return new Promise((resolve) => {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 256;
      canvas.height = 256;
      const gl = canvas.getContext("webgl");
      if (!gl) {
        resolve(999); // No WebGL = very weak
        return;
      }

      const vs = gl.createShader(gl.VERTEX_SHADER)!;
      gl.shaderSource(vs, `attribute vec2 p;void main(){gl_Position=vec4(p,0,1);}`);
      gl.compileShader(vs);

      const fs = gl.createShader(gl.FRAGMENT_SHADER)!;
      gl.shaderSource(fs, `precision lowp float;void main(){gl_FragColor=vec4(1,0,0,1);}`);
      gl.compileShader(fs);

      const prg = gl.createProgram()!;
      gl.attachShader(prg, vs);
      gl.attachShader(prg, fs);
      gl.linkProgram(prg);
      gl.useProgram(prg);

      // Generate 500 random triangles (1500 vertices)
      const verts = new Float32Array(1500 * 2);
      for (let i = 0; i < verts.length; i++) verts[i] = Math.random() * 2 - 1;

      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(prg, "p");
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

      // Warm-up draw
      gl.drawArrays(gl.TRIANGLES, 0, 1500);
      gl.finish();

      // Timed draw
      const t0 = performance.now();
      for (let i = 0; i < 10; i++) {
        gl.drawArrays(gl.TRIANGLES, 0, 1500);
      }
      gl.finish();
      const elapsed = performance.now() - t0;

      // Cleanup
      gl.deleteProgram(prg);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteBuffer(buf);
      const ext = gl.getExtension("WEBGL_lose_context");
      if (ext) ext.loseContext();

      resolve(elapsed);
    } catch {
      resolve(999);
    }
  });
}

function getWebGLRenderer(): { renderer: string; vendor: string } {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl");
    if (!gl) return { renderer: "", vendor: "" };

    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    const renderer = ext
      ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)
      : gl.getParameter(gl.RENDERER);
    const vendor = ext
      ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL)
      : gl.getParameter(gl.VENDOR);

    const loseCtx = gl.getExtension("WEBGL_lose_context");
    if (loseCtx) loseCtx.loseContext();

    return { renderer: String(renderer), vendor: String(vendor) };
  } catch {
    return { renderer: "", vendor: "" };
  }
}

function isIntegratedGPU(renderer: string): boolean {
  const lower = renderer.toLowerCase();
  const integratedKeywords = [
    "intel",
    "intel(r) uhd",
    "intel(r) hd",
    "intel(r) iris",
    "mali",
    "adreno",
    "powervr",
    "apple gpu",
    "swiftshader",
    "llvmpipe",
    "softpipe",
    "mesa",
    "microsoft basic render",
  ];
  return integratedKeywords.some((kw) => lower.includes(kw));
}

async function detectPerfTier(): Promise<PerfTier> {
  // 1. User explicitly prefers reduced motion → low
  if (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    return "low";
  }

  // 2. CPU cores
  const cores = navigator.hardwareConcurrency || 2;

  // 3. Device memory (Chrome-only, returns GB)
  const memory = (navigator as any).deviceMemory || 4;

  // 4. GPU info
  const { renderer } = getWebGLRenderer();
  const integrated = isIntegratedGPU(renderer);

  // 5. Touch device (mobile/tablet are generally weaker)
  const isTouch =
    typeof window !== "undefined" &&
    window.matchMedia("(pointer: coarse)").matches;

  // 6. GPU benchmark
  const benchMs = await gpuBenchmark();

  // ── Score calculation ──────────────────────────────────────────────
  let score = 0;

  // CPU: 0–3 points
  if (cores >= 8) score += 3;
  else if (cores >= 4) score += 2;
  else if (cores >= 2) score += 1;

  // Memory: 0–3 points
  if (memory >= 8) score += 3;
  else if (memory >= 4) score += 2;
  else if (memory >= 2) score += 1;

  // GPU: 0–3 points
  if (!integrated && renderer) score += 3;
  else if (integrated) score += 1;
  // No WebGL → 0

  // Bench: 0–3 points (10 draws of 500 triangles)
  if (benchMs < 5) score += 3;
  else if (benchMs < 15) score += 2;
  else if (benchMs < 40) score += 1;

  // Touch penalty
  if (isTouch) score -= 2;

  // ── Tier thresholds ────────────────────────────────────────────────
  if (score >= 8) return "high";
  if (score >= 4) return "medium";
  return "low";
}

/**
 * React hook that returns the detected performance tier.
 * Returns "high" during SSR / before detection completes (avoids flash).
 */
export function usePerfTier(): PerfTier {
  const [tier, setTier] = useState<PerfTier>("high");

  useEffect(() => {
    // Check localStorage override first
    const override = localStorage.getItem("voltrex-perf-tier");
    if (override === "high" || override === "medium" || override === "low") {
      setTier(override);
      return;
    }

    // Check if already cached this session
    const cached = sessionStorage.getItem("voltrex-perf-tier");
    if (cached === "high" || cached === "medium" || cached === "low") {
      setTier(cached);
      return;
    }

    detectPerfTier().then((detected) => {
      setTier(detected);
      sessionStorage.setItem("voltrex-perf-tier", detected);
    });
  }, []);

  return tier;
}

/**
 * Convenience function to manually override the perf tier.
 * Call this from a settings UI or dev console.
 */
export function setPerfTierOverride(tier: PerfTier | "auto") {
  if (tier === "auto") {
    localStorage.removeItem("voltrex-perf-tier");
    sessionStorage.removeItem("voltrex-perf-tier");
  } else {
    localStorage.setItem("voltrex-perf-tier", tier);
    sessionStorage.setItem("voltrex-perf-tier", tier);
  }
  window.location.reload();
}
