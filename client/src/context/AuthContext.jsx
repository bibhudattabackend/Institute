import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [institute, setInstitute] = useState(null);
  const [loading, setLoading] = useState(!!token);

  useEffect(() => {
    if (!token) {
      setInstitute(null);
      setLoading(false);
      return;
    }
    localStorage.setItem("token", token);
    let cancelled = false;
    (async () => {
      try {
        const { institute: i } = await api("/api/auth/me");
        if (!cancelled) setInstitute(i);
      } catch {
        if (!cancelled) {
          setToken(null);
          setInstitute(null);
          localStorage.removeItem("token");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const value = useMemo(
    () => ({
      token,
      institute,
      loading,
      isAuthenticated: !!institute,
      login: async (email, password) => {
        const { token: t, institute: i } = await api("/api/auth/login", {
          method: "POST",
          body: JSON.stringify({ email, password }),
        });
        setInstitute(i);
        setToken(t);
      },
      register: async (payload) => {
        const { token: t, institute: i } = await api("/api/auth/register", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setInstitute(i);
        setToken(t);
      },
      logout: () => {
        localStorage.removeItem("token");
        setToken(null);
        setInstitute(null);
      },
      refreshInstitute: async () => {
        const { institute: i } = await api("/api/auth/me");
        setInstitute(i);
      },
    }),
    [token, institute, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
