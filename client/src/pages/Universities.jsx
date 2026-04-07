import { useEffect, useState } from "react";
import { api } from "../api.js";

const empty = { name: "", short_code: "", city: "", state: "" };

export default function Universities() {
  const [list, setList] = useState([]);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const { universities } = await api("/api/universities");
      setList(universities || []);
    } catch (e) {
      setError(e.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function set(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await api("/api/universities", { method: "POST", body: JSON.stringify(form) });
      setForm(empty);
      await load();
    } catch (err) {
      setError(err.message || "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function remove(u) {
    if (!window.confirm(`Delete "${u.name}"?`)) return;
    setError("");
    try {
      await api(`/api/universities/${u.id}`, { method: "DELETE" });
      await load();
    } catch (e) {
      setError(e.message || "Delete failed");
    }
  }

  return (
    <div className="page">
      <h1>Universities</h1>
      <p className="muted">
        Apne institute ke liye universities add karein — students admission ke time inme se choose kar sakte
        hain. Har university ke liye alag course fees alag page par set karein.
      </p>

      <div className="card" style={{ marginTop: "18px" }}>
        <h2 style={{ marginTop: 0 }}>Add university</h2>
        <form onSubmit={onSubmit}>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="name">University name *</label>
              <input
                id="name"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="short_code">Short code</label>
              <input
                id="short_code"
                placeholder="e.g. DU"
                value={form.short_code}
                onChange={(e) => set("short_code", e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="city">City</label>
              <input id="city" value={form.city} onChange={(e) => set("city", e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="state">State</label>
              <input id="state" value={form.state} onChange={(e) => set("state", e.target.value)} />
            </div>
          </div>
          {error ? <div className="error">{error}</div> : null}
          <button className="btn primary" type="submit" disabled={busy}>
            {busy ? "Saving…" : "Add university"}
          </button>
        </form>
      </div>

      <h2 style={{ marginTop: "28px" }}>Your universities</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Code</th>
              <th>Location</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="muted">
                  Loading…
                </td>
              </tr>
            ) : list.length === 0 ? (
              <tr>
                <td colSpan={4} className="muted">
                  Abhi koi university add nahi — upar form se add karein.
                </td>
              </tr>
            ) : (
              list.map((u) => (
                <tr key={u.id}>
                  <td style={{ fontWeight: 600 }}>{u.name}</td>
                  <td>{u.short_code || "—"}</td>
                  <td className="muted">
                    {[u.city, u.state].filter(Boolean).join(", ") || "—"}
                  </td>
                  <td>
                    <button type="button" className="btn ghost danger" onClick={() => remove(u)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
