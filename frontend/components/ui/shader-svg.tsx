"use client";

import React, { useRef, useEffect, useState } from "react";
import { motion } from "framer-motion";

export function MeshGradient({
  colors,
  className = "",
  speed = 1,
}: {
  colors: string[];
  className?: string;
  speed?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl");
    if (!gl) return;

    // Convert hex colors to RGB floats
    const rgbColors = colors.slice(0, 5).map((hex) => {
      const c = hex.replace("#", "");
      const r = parseInt(c.substring(0, 2), 16) / 255;
      const g = parseInt(c.substring(2, 4), 16) / 255;
      const b = parseInt(c.substring(4, 6), 16) / 255;
      return [r, g, b];
    });

    while (rgbColors.length < 5) {
      rgbColors.push([0.1, 0.1, 0.2]);
    }

    const vs = `
      attribute vec2 position;
      void main() {
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `;

    const fs = `
      precision mediump float;
      uniform vec2 u_resolution;
      uniform float u_time;
      uniform vec3 u_c0;
      uniform vec3 u_c1;
      uniform vec3 u_c2;
      uniform vec3 u_c3;
      uniform vec3 u_c4;

      void main() {
        vec2 st = gl_FragCoord.xy / u_resolution.xy;
        float t = u_time * 0.7;

        vec2 p0 = vec2(sin(t * 0.7) * 0.4 + 0.5, cos(t * 0.5) * 0.4 + 0.5);
        vec2 p1 = vec2(cos(t * 0.6) * 0.4 + 0.5, sin(t * 0.8) * 0.4 + 0.5);
        vec2 p2 = vec2(sin(t * 0.9 + 1.5) * 0.4 + 0.5, cos(t * 0.7 + 1.0) * 0.4 + 0.5);
        vec2 p3 = vec2(cos(t * 0.4 + 2.0) * 0.4 + 0.5, sin(t * 0.6 + 2.5) * 0.4 + 0.5);

        float d0 = 1.0 / (distance(st, p0) * 2.6 + 0.04);
        float d1 = 1.0 / (distance(st, p1) * 2.6 + 0.04);
        float d2 = 1.0 / (distance(st, p2) * 2.6 + 0.04);
        float d3 = 1.0 / (distance(st, p3) * 2.6 + 0.04);

        float sum = d0 + d1 + d2 + d3;
        vec3 col = (u_c0 * d0 + u_c1 * d1 + u_c2 * d2 + u_c3 * d3) / sum;
        gl_FragColor = vec4(col, 1.0);
      }
    `;

    function createShader(type: number, src: string) {
      const s = gl!.createShader(type)!;
      gl!.shaderSource(s, src);
      gl!.compileShader(s);
      return s;
    }

    const prg = gl.createProgram()!;
    gl.attachShader(prg, createShader(gl.VERTEX_SHADER, vs));
    gl.attachShader(prg, createShader(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(prg);
    gl.useProgram(prg);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );
    const pos = gl.getAttribLocation(prg, "position");
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(prg, "u_resolution");
    const uTime = gl.getUniformLocation(prg, "u_time");
    const uC0 = gl.getUniformLocation(prg, "u_c0");
    const uC1 = gl.getUniformLocation(prg, "u_c1");
    const uC2 = gl.getUniformLocation(prg, "u_c2");
    const uC3 = gl.getUniformLocation(prg, "u_c3");
    const uC4 = gl.getUniformLocation(prg, "u_c4");

    gl.uniform3fv(uC0, rgbColors[0]);
    gl.uniform3fv(uC1, rgbColors[1]);
    gl.uniform3fv(uC2, rgbColors[2]);
    gl.uniform3fv(uC3, rgbColors[3]);
    gl.uniform3fv(uC4, rgbColors[4]);

    let animId = 0;
    const start = performance.now();

    function render(now: number) {
      if (!canvas || !gl) return;
      const w = canvas.clientWidth || 231;
      const h = canvas.clientHeight || 289;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, ((now - start) / 1000) * speed);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      animId = requestAnimationFrame(render);
    }
    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [colors, speed]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width: "100%", height: "100%", display: "block" }}
    />
  );
}

export function MeshGradientSVG() {
  const colors = [
    "#52E4B8", // Voltrex emerald green
    "#7381FF", // Electric blue
    "#D4A85F", // Warm gold
    "#2C3E50", // Dark blue-gray
    "#0B0F19", // Deep obsidian
  ];

  const [eyeOffset, setEyeOffset] = useState({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        if (!svgRef.current) return;
        const rect = svgRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const deltaX = (e.clientX - centerX) * 0.08;
        const deltaY = (e.clientY - centerY) * 0.08;

        const maxOffset = 8;
        const nextX = Math.max(-maxOffset, Math.min(maxOffset, deltaX));
        const nextY = Math.max(-maxOffset, Math.min(maxOffset, deltaY));

        setEyeOffset((prev) => {
          if (Math.abs(prev.x - nextX) < 0.2 && Math.abs(prev.y - nextY) < 0.2) {
            return prev;
          }
          return { x: nextX, y: nextY };
        });
      });
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  return (
    <motion.div
      className="relative w-28 md:w-36 max-w-sm mx-auto select-none"
      animate={{
        y: [0, -6, 0],
        scaleY: [1, 1.05, 1],
      }}
      transition={{
        duration: 2.8,
        repeat: Number.POSITIVE_INFINITY,
        ease: "easeInOut",
      }}
      style={{ transformOrigin: "top center" }}
    >
      <svg
        ref={svgRef}
        xmlns="http://www.w3.org/2000/svg"
        width="231"
        height="289"
        viewBox="0 0 231 289"
        className="w-full h-auto drop-shadow-lg"
      >
        <defs>
          <clipPath id="shapeClip">
            <path d="M230.809 115.385V249.411C230.809 269.923 214.985 287.282 194.495 288.411C184.544 288.949 175.364 285.718 168.26 280C159.746 273.154 147.769 273.461 139.178 280.23C132.638 285.384 124.381 288.462 115.379 288.462C106.377 288.462 98.1451 285.384 91.6055 280.23C82.912 273.385 70.9353 273.385 62.2415 280.23C55.7532 285.334 47.598 288.411 38.7246 288.462C17.4132 288.615 0 270.667 0 249.359V115.385C0 51.6667 51.6756 0 115.404 0C179.134 0 230.809 51.6667 230.809 115.385Z" />
          </clipPath>
        </defs>

        <foreignObject width="231" height="289" clipPath="url(#shapeClip)">
          <div className="w-full h-full">
            <MeshGradient colors={colors} className="w-full h-full" speed={1} />
          </div>
        </foreignObject>

        <motion.ellipse
          rx="14"
          ry="22"
          fill="#05080C"
          className="animate-blink"
          animate={{
            cx: 80 + eyeOffset.x,
            cy: 120 + eyeOffset.y,
          }}
          transition={{ type: "spring", stiffness: 150, damping: 15 }}
        />
        <motion.ellipse
          rx="14"
          ry="22"
          fill="#05080C"
          className="animate-blink"
          animate={{
            cx: 150 + eyeOffset.x,
            cy: 120 + eyeOffset.y,
          }}
          transition={{ type: "spring", stiffness: 150, damping: 15 }}
        />

        {/* Catchlights */}
        <motion.circle
          r="4"
          fill="#FFFFFF"
          animate={{
            cx: 76 + eyeOffset.x,
            cy: 114 + eyeOffset.y,
          }}
          transition={{ type: "spring", stiffness: 150, damping: 15 }}
        />
        <motion.circle
          r="4"
          fill="#FFFFFF"
          animate={{
            cx: 146 + eyeOffset.x,
            cy: 114 + eyeOffset.y,
          }}
          transition={{ type: "spring", stiffness: 150, damping: 15 }}
        />
      </svg>
    </motion.div>
  );
}
