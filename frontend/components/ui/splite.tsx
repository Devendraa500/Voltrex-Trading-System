"use client";

import React, { useEffect, useState, useRef } from "react";

interface SplineSceneProps {
  scene: string;
  className?: string;
}

export function SplineScene({ scene, className = "" }: SplineSceneProps) {
  const [loaded, setLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!customElements.get("spline-viewer")) {
      const script = document.createElement("script");
      script.type = "module";
      script.src = "https://unpkg.com/@splinetool/viewer/build/spline-viewer.js";
      script.onload = () => setLoaded(true);
      document.head.appendChild(script);
    } else {
      setLoaded(true);
    }
  }, []);

  // Remove Spline watermark logo from shadowRoot
  useEffect(() => {
    if (!loaded) return;

    const interval = setInterval(() => {
      const viewer = containerRef.current?.querySelector("spline-viewer");
      if (viewer && viewer.shadowRoot) {
        const logo = viewer.shadowRoot.getElementById("logo") || viewer.shadowRoot.querySelector("#logo") || viewer.shadowRoot.querySelector("a");
        if (logo) {
          logo.remove();
        }
        if (!viewer.shadowRoot.querySelector("style[data-hide-logo]")) {
          const style = document.createElement("style");
          style.setAttribute("data-hide-logo", "true");
          style.textContent = `
            #logo, a, .spline-watermark, [id*="logo"], [class*="watermark"] {
              display: none !important;
              opacity: 0 !important;
              visibility: hidden !important;
              pointer-events: none !important;
            }
          `;
          viewer.shadowRoot.appendChild(style);
        }
      }
    }, 100);

    const timeout = setTimeout(() => clearInterval(interval), 10000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [loaded]);

  return (
    <div ref={containerRef} className={`relative w-full h-full min-h-[460px] ${className}`}>
      {loaded ? (
        // @ts-ignore
        <spline-viewer
          url={scene}
          style={{ width: "100%", height: "100%", display: "block" }}
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center gap-3">
          <div className="w-9 h-9 rounded-full border-2 border-white/20 border-t-white animate-spin" />
          <span className="text-xs text-neutral-400 font-mono tracking-wider">INITIALIZING 3D ENGINE...</span>
        </div>
      )}
    </div>
  );
}
