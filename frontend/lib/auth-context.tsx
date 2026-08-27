"use client";

import { createContext, useContext } from "react";

// Auth is removed. This stub keeps the provider so layout.tsx compiles.
type AuthState = {
  user: null;
  loading: false;
  isNewUser: false;
  login: (email?: string, password?: string) => Promise<void>;
  register: (name?: string, email?: string, password?: string) => Promise<void>;
  logout: () => void;
  clearNewUser: () => void;
};

const STUB: AuthState = {
  user: null,
  loading: false,
  isNewUser: false,
  login: async () => {},
  register: async () => {},
  logout: () => {},
  clearNewUser: () => {},
};

const AuthContext = createContext<AuthState>(STUB);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <AuthContext.Provider value={STUB}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  return useContext(AuthContext);
}
