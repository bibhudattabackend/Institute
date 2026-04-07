import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Login() {
  const { login, staffLogin, isAuthenticated } = useAuth();
  const [mode, setMode] = useState("principal");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (isAuthenticated) return <Navigate to="/" replace />;

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "clerk") {
        await staffLogin(email, password);
      } else {
        await login(email, password);
      }
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page center">
      <div className="auth-card">
        <div className="auth-head">
          <h1 style={{ fontSize: "22px" }}>Institute sign in</h1>
          <p className="muted">Principal (institute email) ya Clerk (staff email) se login karein.</p>
        </div>
        <div className="row" style={{ gap: 8, marginBottom: 16 }}>
          <button
            type="button"
            className={mode === "principal" ? "btn primary" : "btn ghost"}
            onClick={() => setMode("principal")}
          >
            Principal
          </button>
          <button
            type="button"
            className={mode === "clerk" ? "btn primary" : "btn ghost"}
            onClick={() => setMode("clerk")}
          >
            Staff / Clerk
          </button>
        </div>
        <form onSubmit={onSubmit}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error ? <div className="error">{error}</div> : null}
          <button className="btn primary full" type="submit" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
        {mode === "principal" ? (
          <p className="muted" style={{ marginTop: "16px", textAlign: "center" }}>
            Naya institute?{" "}
            <Link className="link" to="/register">
              Register
            </Link>
          </p>
        ) : (
          <p className="muted" style={{ marginTop: "16px", textAlign: "center", fontSize: 13 }}>
            Clerk account principal institute profile se banata hai.
          </p>
        )}
      </div>
    </div>
  );
}
