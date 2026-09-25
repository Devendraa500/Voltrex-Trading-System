"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface MercuryLoginProps {
  onClose: () => void;
  onSuccess: (user: { name: string; email: string; role: string }) => void;
}

export default function MercuryLogin({ onClose, onSuccess }: MercuryLoginProps) {
  const router = useRouter();
  const [isSignup, setIsSignup] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const blobsData = useMemo(() => {
    // 10 blobs: 2–3 near each corner for a filled liquid-mercury feel
    return [
      // Top-left corner
      { size: 260, left: 2, top: 2, animationDelay: 0, animationDuration: 22 },
      { size: 180, left: 10, top: 12, animationDelay: -6, animationDuration: 18 },
      // Top-right corner
      { size: 280, left: 78, top: 0, animationDelay: -3, animationDuration: 25 },
      { size: 200, left: 85, top: 14, animationDelay: -10, animationDuration: 20 },
      // Bottom-left corner
      { size: 240, left: 0, top: 75, animationDelay: -8, animationDuration: 24 },
      { size: 190, left: 12, top: 82, animationDelay: -14, animationDuration: 19 },
      // Bottom-right corner
      { size: 300, left: 76, top: 72, animationDelay: -5, animationDuration: 26 },
      { size: 210, left: 88, top: 85, animationDelay: -12, animationDuration: 21 },
      // Center-left accent
      { size: 150, left: 5, top: 42, animationDelay: -16, animationDuration: 28 },
      // Center-right accent
      { size: 160, left: 82, top: 40, animationDelay: -18, animationDuration: 27 },
    ];
  }, []);



  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("All fields are required.");
      return;
    }
    if (isSignup && !name) {
      setError("Name is required for signup.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    // Store user in localStorage for persistence
    const userData = {
      name: isSignup ? name : email.split("@")[0],
      email,
      role: "Quantitative Analyst",
    };
    localStorage.setItem("voltrex-user", JSON.stringify(userData));
    onSuccess(userData);
  }

  return (
    <div className="mercury-wrapper">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;800&family=Space+Mono&display=swap');

        .mercury-wrapper {
          --bg: rgba(4, 5, 12, 0.65);
          --mercury: #e0e0e0;
          --mercury-dark: #666666;
          --accent: #ffffff;
          --text-dim: rgba(255, 255, 255, 0.5);
          --filter-goo: url('#gooey');
          background-color: var(--bg);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          color: var(--accent);
          font-family: 'Inter', sans-serif;
          height: 100vh;
          width: 100vw;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          position: fixed;
          inset: 0;
          z-index: 9999;
        }

        .mercury-wrapper * {
          box-sizing: border-box;
          -webkit-font-smoothing: antialiased;
        }

        .stage {
          position: absolute;
          width: 100%;
          height: 100%;
          z-index: 0;
          filter: var(--filter-goo);
          opacity: 0.6;
          pointer-events: none;
        }

        .blob {
          position: absolute;
          background: linear-gradient(135deg, var(--mercury), #888);
          border-radius: 50%;
          filter: blur(20px);
          animation: float 20s infinite alternate ease-in-out;
          box-shadow: inset -10px -10px 20px rgba(0,0,0,0.5),
                      10px 10px 30px rgba(255,255,255,0.2);
          pointer-events: none;
        }

        @keyframes float {
          0% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(10vw, 20vh) scale(1.2); }
          66% { transform: translate(-5vw, 10vh) scale(0.8); }
          100% { transform: translate(5vw, -10vh) scale(1.1); }
        }

        .auth-container {
          position: relative;
          z-index: 10;
          width: 100%;
          max-width: 440px;
          padding: 38px 40px;
          background: rgba(10, 14, 22, 0.72);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 24px;
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.55);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
        }

        .mercury-header {
          margin-bottom: 48px;
          text-align: left;
        }

        .brand-id {
          font-family: 'Space Mono', monospace;
          font-size: 10px;
          letter-spacing: 4px;
          text-transform: uppercase;
          color: var(--text-dim);
          margin-bottom: 8px;
          display: block;
        }

        .mercury-header h1 {
          font-weight: 800;
          font-size: 3rem;
          line-height: 0.9;
          letter-spacing: -2px;
          margin-left: -4px;
          margin-top: 0;
          margin-bottom: 0;
        }

        .mercury-close {
          position: absolute;
          top: 24px;
          right: 24px;
          z-index: 20;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          border: 1px solid rgba(255,255,255,0.15);
          background: rgba(255,255,255,0.05);
          color: var(--accent);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 18px;
          font-weight: 300;
          transition: background 0.3s, border-color 0.3s;
          backdrop-filter: blur(10px);
        }
        .mercury-close:hover {
          background: rgba(255,255,255,0.12);
          border-color: rgba(255,255,255,0.3);
        }

        .toggle-row {
          display: flex;
          gap: 24px;
          margin-bottom: 36px;
          font-family: 'Space Mono', monospace;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 2px;
        }
        .toggle-row button {
          background: none;
          border: none;
          color: var(--text-dim);
          cursor: pointer;
          padding: 4px 0;
          border-bottom: 2px solid transparent;
          transition: color 0.3s, border-color 0.3s;
        }
        .toggle-row button.active {
          color: var(--accent);
          border-bottom-color: var(--mercury);
        }

        .form-group {
          position: relative;
          margin-bottom: 28px;
          transition: transform 0.4s cubic-bezier(0.2, 1, 0.3, 1);
        }

        .form-group:focus-within {
          transform: translateX(10px);
        }

        .form-group label {
          display: block;
          font-family: 'Space Mono', monospace;
          font-size: 11px;
          color: var(--text-dim);
          margin-bottom: 10px;
          text-transform: uppercase;
        }

        .form-group input {
          width: 100%;
          background: transparent;
          border: none;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          color: var(--accent);
          padding: 12px 0;
          font-size: 18px;
          outline: none;
          transition: border-color 0.4s;
          font-family: 'Inter', sans-serif;
        }

        .input-glow {
          position: absolute;
          bottom: 0;
          left: 0;
          width: 0%;
          height: 2px;
          background: var(--mercury);
          transition: width 0.6s cubic-bezier(0.2, 1, 0.3, 1);
          box-shadow: 0 0 15px var(--mercury);
        }

        .form-group input:focus + .input-glow {
          width: 100%;
        }

        .mercury-error {
          color: #ff6b6b;
          font-size: 12px;
          font-family: 'Space Mono', monospace;
          margin-bottom: 16px;
          letter-spacing: 1px;
        }

        .submit-wrap {
          margin-top: 40px;
          position: relative;
          filter: var(--filter-goo);
        }

        .btn-base {
          background: var(--accent);
          color: #000;
          border: none;
          padding: 20px 40px;
          font-size: 14px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 2px;
          cursor: pointer;
          width: 100%;
          position: relative;
          z-index: 2;
          transition: letter-spacing 0.3s;
          font-family: 'Inter', sans-serif;
        }

        .btn-base:hover {
          letter-spacing: 4px;
        }

        .mercury-drop {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 100%;
          height: 100%;
          background: var(--mercury);
          transform: translate(-50%, -50%);
          z-index: 1;
          border-radius: 50px;
          transition: all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }

        .submit-wrap:hover .mercury-drop {
          transform: translate(-50%, -50%) scale(1.05, 1.2);
          filter: brightness(1.2);
        }

        .footer-nav {
          margin-top: 40px;
          display: flex;
          justify-content: space-between;
          font-family: 'Space Mono', monospace;
          font-size: 10px;
        }

        .footer-nav a, .footer-nav button {
          color: var(--text-dim);
          text-decoration: none;
          transition: color 0.3s;
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
          font-family: 'Space Mono', monospace;
          font-size: 10px;
          text-transform: uppercase;
        }

        .footer-nav a:hover, .footer-nav button:hover {
          color: var(--accent);
        }

        .svg-filter-hidden {
          position: absolute;
          width: 0;
          height: 0;
        }
      `}</style>

      <svg className="svg-filter-hidden">
        <defs>
          <filter id="gooey">
            <feGaussianBlur in="SourceGraphic" stdDeviation="12" result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -9"
              result="goo"
            />
            <feComposite in="SourceGraphic" in2="goo" operator="atop" />
          </filter>
        </defs>
      </svg>

      <button className="mercury-close" onClick={onClose} aria-label="Close">
        ✕
      </button>

      <div className="stage" id="stage">
        {blobsData.map((data, index) => (
          <div
            key={index}
            className="blob"
            style={{
              width: `${data.size}px`,
              height: `${data.size}px`,
              left: `${data.left}%`,
              top: `${data.top}%`,
              animationDelay: `${data.animationDelay}s`,
              animationDuration: `${data.animationDuration}s`,
            }}
          />
        ))}
      </div>

      <main className="auth-container">
        <header className="mercury-header">
          <span className="brand-id">Voltrex Terminal · Secure Access</span>
          <h1>
            {isSignup ? (
              <>
                CREATE
                <br />
                ACCOUNT
              </>
            ) : (
              <>
                NEURAL
                <br />
                ACCESS
              </>
            )}
          </h1>
        </header>

        <div className="toggle-row">
          <button
            className={!isSignup ? "active" : ""}
            onClick={() => { setIsSignup(false); setError(""); }}
          >
            Sign In
          </button>
          <button
            className={isSignup ? "active" : ""}
            onClick={() => { setIsSignup(true); setError(""); }}
          >
            Register
          </button>
        </div>

        <form autoComplete="off" onSubmit={handleSubmit}>
          {isSignup && (
            <div className="form-group">
              <label>Full Name</label>
              <input
                type="text"
                placeholder="Your Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <div className="input-glow" />
            </div>
          )}

          <div className="form-group">
            <label>User Identity</label>
            <input
              type="email"
              placeholder="trader@voltrex.io"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <div className="input-glow" />
          </div>

          <div className="form-group">
            <label>Sequence Key</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
            <div className="input-glow" />
          </div>

          {error && <div className="mercury-error">{error}</div>}

          <div className="submit-wrap">
            <div className="mercury-drop" />
            <button type="submit" className="btn-base">
              {isSignup ? "Create Account" : "Initialize Stream"}
            </button>
          </div>
        </form>

        <footer className="footer-nav">
          <button onClick={() => { setIsSignup(!isSignup); setError(""); }}>
            {isSignup ? "ALREADY REGISTERED?" : "NEW ARCHIVE"}
          </button>
          <button onClick={onClose}>RETURN TO LANDING</button>
        </footer>
      </main>
    </div>
  );
}
