"use client";

import React, { useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

interface LiquidMetalButtonProps {
  label: string;
  onClick?: () => void;
  href?: string;
  className?: string;
}

export function LiquidMetalButton({
  label,
  onClick,
  href,
  className = "",
}: LiquidMetalButtonProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const mountEl = mountRef.current;
    if (!mountEl) return;
    mountEl.innerHTML = "";

    function measureLabelWidth(text: string) {
      const span = document.createElement("span");
      span.style.visibility = "hidden";
      span.style.position = "absolute";
      span.style.whiteSpace = "nowrap";
      span.style.fontSize = "14px";
      span.style.fontFamily = '"Onest", sans-serif';
      span.style.fontWeight = "400";
      span.textContent = text;
      document.body.appendChild(span);
      const w = span.getBoundingClientRect().width;
      document.body.removeChild(span);
      return w;
    }

    const textWidth = measureLabelWidth(label);
    const width = Math.max(160, Math.ceil(textWidth) + 56);
    const height = 46;
    const innerWidth = width - 4;
    const innerHeight = height - 4;

    let isHovered = false;
    let isPressed = false;
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
      transition: "all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)",
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
      whiteSpace: "nowrap",
      fontFamily: '"Onest", sans-serif',
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
      transition: "all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)",
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
      transition: "all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)",
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
      transition: "all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)",
      transform: "translateZ(0px) translateY(0) scale(1)",
      zIndex: "10",
    });
    const shadowWrap = document.createElement("div");
    Object.assign(shadowWrap.style, {
      height: `${height}px`,
      width: `${width}px`,
      borderRadius: "100px",
      boxShadow: "0px 0px 0px 1px rgba(0, 0, 0, 0.3), 0px 20px 12px 0px rgba(0, 0, 0, 0.08)",
      overflow: "hidden",
      position: "relative",
    });

    const shaderContainer = document.createElement("div");
    Object.assign(shaderContainer.style, {
      borderRadius: "100px",
      overflow: "hidden",
      position: "relative",
      width: `${width}px`,
      height: `${height}px`,
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

    // Button element
    const btn = document.createElement("button");
    btn.type = "button";
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
      transition: "all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)",
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

      if (onClick) onClick();
      if (href) router.push(href);
    });

    return () => {
      cancelAnimationFrame(animId);
      mountEl.innerHTML = "";
    };
  }, [label, onClick, href, router]);

  return <div ref={mountRef} className={`inline-flex items-center justify-center ${className}`} />;
}
