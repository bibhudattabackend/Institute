import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [institute, setInstitute] = useState(null);
  const [role, setRole] = useState(() => localStorage.getItem("role") || "principal");
  const [loading, setLoading] = useState(!!token);

  useEffect(() => {
    if (!token) {
      setInstitute(null);
      setRole("principal");
      setLoading(false);
      return;
    }
    localStorage.setItem("token", token);
    let cancelled = false;
    (async () => {
      try {
        const data = await api("/api/auth/me");
        if (!cancelled) {
          setInstitute(data.institute);
          const r = data.role || "principal";
          setRole(r);
          localStorage.setItem("role", r);
        }
      } catch {
        if (!cancelled) {
          setToken(null);
          setInstitute(null);
          localStorage.removeItem("token");
          localStorage.removeItem("role");
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
      role,
      isPrincipal: role === "principal",
      loading,
      isAuthenticated: !!institute,
      login: async (email, password) => {
        const { token: t, institute: i, role: r } = await api("/api/auth/login", {
          method: "POST",
          body: JSON.stringify({ email, password }),
        });
        setInstitute(i);
        setRole(r || "principal");
        localStorage.setItem("role", r || "principal");
        setToken(t);
      },
      staffLogin: async (email, password) => {
        const { token: t, institute: i, role: r } = await api("/api/auth/staff/login", {
          method: "POST",
          body: JSON.stringify({ email, password }),
        });
        setInstitute(i);
        setRole(r || "clerk");
        localStorage.setItem("role", r || "clerk");
        setToken(t);
      },
      register: async (payload) => {
        const { token: t, institute: i, role: r } = await api("/api/auth/register", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setInstitute(i);
        setRole(r || "principal");
        localStorage.setItem("role", r || "principal");
        setToken(t);
      },
      logout: () => {
        localStorage.removeItem("token");
        localStorage.removeItem("role");
        setToken(null);
        setInstitute(null);
        setRole("principal");
      },
      refreshInstitute: async () => {
        const data = await api("/api/auth/me");
        setInstitute(data.institute);
        if (data.role) {
          setRole(data.role);
          localStorage.setItem("role", data.role);
        }
      },
    }),
    [token, institute, role, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
