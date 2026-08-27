"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Eye, EyeOff, LoaderCircle, X } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";

type AuthModalProps = {
  open: boolean;
  onClose: () => void;
};

export function AuthModal({ open, onClose }: AuthModalProps) {
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { login, register } = useAuth();

  function reset() {
    setName("");
    setEmail("");
    setPassword("");
    setConfirm("");
    setError(null);
    setShowPass(false);
  }

  function switchTab(t: "login" | "signup") {
    setTab(t);
    reset();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (tab === "signup" && password !== confirm) {
      setError("Passwords do not match");
      return;
    }

    setSubmitting(true);
    try {
      if (tab === "login") {
        await login(email, password);
      } else {
        await register(name, email, password);
      }
      reset();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="auth-modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={onClose}
        >
          <motion.div
            className="auth-modal"
            initial={{ opacity: 0, scale: 0.92, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 30 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button className="auth-modal-close" onClick={onClose}>
              <X size={18} />
            </button>

            <div className="auth-modal-header">
              <div className="brand-mark" style={{ width: 36, height: 36, fontSize: 16 }}>V</div>
              <h2>VOLTREX TERMINAL</h2>
              <p>Institutional Trading Access</p>
            </div>

            <div className="auth-tabs">
              <button
                className={tab === "login" ? "active" : ""}
                onClick={() => switchTab("login")}
              >
                Sign In
              </button>
              <button
                className={tab === "signup" ? "active" : ""}
                onClick={() => switchTab("signup")}
              >
                Register
              </button>
            </div>

            <form className="auth-form" onSubmit={handleSubmit}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={tab}
                  initial={{ opacity: 0, x: tab === "login" ? -20 : 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: tab === "login" ? 20 : -20 }}
                  transition={{ duration: 0.2 }}
                >
                  {tab === "signup" && (
                    <div className="auth-field">
                      <label htmlFor="auth-name">FULL NAME</label>
                      <input
                        id="auth-name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Enter your full name"
                        required
                        autoComplete="name"
                      />
                    </div>
                  )}

                  <div className="auth-field">
                    <label htmlFor="auth-email">EMAIL ADDRESS</label>
                    <input
                      id="auth-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="trader@example.com"
                      required
                      autoComplete="email"
                    />
                  </div>

                  <div className="auth-field">
                    <label htmlFor="auth-password">PASSWORD</label>
                    <div className="auth-password-wrap">
                      <input
                        id="auth-password"
                        type={showPass ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Min 6 characters"
                        required
                        minLength={6}
                        autoComplete={tab === "login" ? "current-password" : "new-password"}
                      />
                      <button
                        type="button"
                        className="auth-eye"
                        onClick={() => setShowPass(!showPass)}
                        tabIndex={-1}
                      >
                        {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {tab === "signup" && (
                    <div className="auth-field">
                      <label htmlFor="auth-confirm">CONFIRM PASSWORD</label>
                      <input
                        id="auth-confirm"
                        type="password"
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        placeholder="Re-enter password"
                        required
                        minLength={6}
                        autoComplete="new-password"
                      />
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>

              {error && (
                <motion.div
                  className="auth-error"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                >
                  {error}
                </motion.div>
              )}

              <button
                type="submit"
                className="auth-submit"
                disabled={submitting}
              >
                {submitting ? (
                  <LoaderCircle className="animate-spin" size={18} />
                ) : tab === "login" ? (
                  "Access Terminal"
                ) : (
                  "Create Trader Account"
                )}
              </button>
            </form>

            <p className="auth-footer">
              {tab === "login" ? (
                <>
                  No account?{" "}
                  <button type="button" onClick={() => switchTab("signup")}>
                    Register here
                  </button>
                </>
              ) : (
                <>
                  Already registered?{" "}
                  <button type="button" onClick={() => switchTab("login")}>
                    Sign in
                  </button>
                </>
              )}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
