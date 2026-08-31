"use client";

import React from "react";
import { SplineScene } from "@/components/ui/splite";
import { Spotlight } from "@/components/ui/spotlight";
import { LiquidMetalButton } from "@/components/ui/liquid-metal-button";
import KineticGrid from "@/components/ui/kinetic-grid";
import { Activity, ShieldCheck, Zap } from "lucide-react";

export function SplineSceneBasic() {
  return (
    <KineticGrid
      globalColor="monochrome"
      className="w-full min-h-screen flex items-center justify-center px-4 sm:px-8 lg:px-16 py-12 lg:py-20 text-[#eef0f6] z-10"
    >
      <div className="w-full max-w-7xl relative">
        <Spotlight
          className="-top-40 left-0 md:left-60 md:-top-20"
          fill="#ffffff"
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-center h-full">
          {/* Left content matching upper landing page design */}
          <div className="lg:col-span-6 z-10 flex flex-col justify-center">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-white/15 bg-white/[0.06] text-[#b9becf] text-xs font-mono tracking-wider w-fit mb-5 backdrop-blur-xl">
              <Zap className="w-3.5 h-3.5 text-[#eef0f6]" />
              <span>NEXT-GEN SPATIAL QUANTITATIVE ENGINE</span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-medium tracking-[-0.02em] text-[#eef0f6] leading-tight">
              Interactive 3D Market Topology
            </h2>

            <p className="mt-4 text-[#b9becf] text-sm sm:text-base leading-relaxed max-w-xl font-normal">
              Experience algorithmic structure in real-time. Voltrex transforms complex order-flow matrices, square-root harmonic levels, and liquidity clustering into intuitive, responsive spatial models.
            </p>

            {/* Feature highlights in monochrome glassmorphism */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
              <div className="p-4 rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl hover:border-white/20 transition-colors">
                <div className="flex items-center gap-2 text-[#eef0f6] font-medium text-sm">
                  <Activity className="w-4 h-4 text-[#b9becf]" />
                  <span>Harmonic Resonance</span>
                </div>
                <p className="mt-1.5 text-xs text-[#b9becf] leading-relaxed">
                  Real-time QR/QS harmonic resistance and support projection across NSE equities.
                </p>
              </div>

              <div className="p-4 rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl hover:border-white/20 transition-colors">
                <div className="flex items-center gap-2 text-[#eef0f6] font-medium text-sm">
                  <ShieldCheck className="w-4 h-4 text-[#b9becf]" />
                  <span>True Value Equilibrium</span>
                </div>
                <p className="mt-1.5 text-xs text-[#b9becf] leading-relaxed">
                  Deterministic fair-value anchors with multi-timeframe conviction scoring.
                </p>
              </div>
            </div>

            {/* Launch CTA with Liquid Metal Shader button */}
            <div className="mt-8 flex flex-wrap items-center gap-5">
              <LiquidMetalButton
                label="Launch Voltrex Terminal"
                href="/terminal"
              />
              <span className="text-xs text-[#b9becf] font-mono">
                Real-Time NSE Equities &middot; Zero Latency
              </span>
            </div>
          </div>

          {/* Right content: 3D Spline Scene (with watermark removed) */}
          <div className="lg:col-span-6 relative w-full h-[480px] sm:h-[580px] lg:h-[680px] overflow-hidden flex items-center justify-center">
            <SplineScene
              scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode"
              className="w-full h-full"
            />
          </div>
        </div>
      </div>
    </KineticGrid>
  );
}
