import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Register() {
  const { register, isAuthenticated } = useAuth();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    address: "",
    principal_name: "",
    letter_head_line: "",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (isAuthenticated) return <Navigate to="/" replace />;

  function set(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await register(form);
    } catch (err) {
      setError(err.message || "Registration failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page center">
      <div className="auth-card">
        <div className="auth-head">
          <h1 style={{ fontSize: "22px" }}>Institute registration</h1>
          <p className="muted">Ek baar account banega — phir admission aur letter print yahin se.</p>
        </div>
        <form onSubmit={onSubmit}>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="name">Institute name</label>
              <input
                id="name"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="email">Email (login)</label>
              <input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={form.password}
                onChange={(e) => set("password", e.target.value)}
                minLength={6}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="phone">Phone</label>
              <input id="phone" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
            </div>
            <div className="field" style={{ gridColumn: "1 / -1" }}>
              <label htmlFor="address">Address</label>
              <input id="address" value={form.address} onChange={(e) => set("address", e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="principal_name">Principal name (letter ke liye)</label>
              <input
                id="principal_name"
                value={form.principal_name}
                onChange={(e) => set("principal_name", e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="letter_head_line">Letterhead line (optional)</label>
              <input
                id="letter_head_line"
                placeholder="e.g. Affiliated to XYZ University"
                value={form.letter_head_line}
                onChange={(e) => set("letter_head_line", e.target.value)}
              />
            </div>
          </div>
          {error ? <div className="error">{error}</div> : null}
          <button className="btn primary full" type="submit" disabled={busy}>
            {busy ? "Creating…" : "Create institute account"}
          </button>
        </form>
        <p className="muted" style={{ marginTop: "16px", textAlign: "center" }}>
          Pehle se account hai?{" "}
          <Link className="link" to="/login">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
