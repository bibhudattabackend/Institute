import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";

export default function CourseFees() {
  const [universities, setUniversities] = useState([]);
  const [uniId, setUniId] = useState("");
  const [fees, setFees] = useState([]);
  const [form, setForm] = useState({
    course_name: "B.Ed",
    academic_year: "",
    amount: "",
    notes: "",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { universities: u } = await api("/api/universities");
        if (!cancelled) {
          setUniversities(u || []);
          if (u?.length && !uniId) setUniId(u[0].id);
        }
      } catch (e) {
        if (!cancelled) setError(e.message || "Failed to load universities");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!uniId) return;
    let cancelled = false;
    (async () => {
      try {
        const { fees: f } = await api(`/api/course-fees?university_id=${encodeURIComponent(uniId)}`);
        if (!cancelled) setFees(f || []);
      } catch (e) {
        if (!cancelled) setError(e.message || "Failed to load fees");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [uniId]);

  function set(k, v) {
    setForm((x) => ({ ...x, [k]: v }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (!uniId) {
      setError("Pehle university select karein");
      return;
    }
    setError("");
    setBusy(true);
    try {
      await api("/api/course-fees", {
        method: "POST",
        body: JSON.stringify({
          university_id: uniId,
          course_name: form.course_name.trim(),
          academic_year: form.academic_year.trim(),
          amount: Number(form.amount),
          notes: form.notes.trim() || null,
        }),
      });
      setForm({ course_name: "B.Ed", academic_year: "", amount: "", notes: "" });
      const { fees: f } = await api(`/api/course-fees?university_id=${encodeURIComponent(uniId)}`);
      setFees(f || []);
    } catch (err) {
      setError(err.message || "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function removeFee(id) {
    if (!window.confirm("Delete this fee row?")) return;
    setError("");
    try {
      await api(`/api/course-fees/${id}`, { method: "DELETE" });
      setFees((rows) => rows.filter((r) => r.id !== id));
    } catch (e) {
      setError(e.message || "Delete failed");
    }
  }

  return (
    <div className="page">
      <h1>Course fees</h1>
      <p className="muted">
        Har university + course ke liye fee set karein. Academic year khali chhodne par woh fee
        &quot;default&quot; maani jayegi jab year-specific row na mile. Admission form par fee auto-fill
        ho sakti hai.
      </p>

      {universities.length === 0 && !loading ? (
        <p className="muted" style={{ marginTop: "16px" }}>
          Pehle{" "}
          <Link className="link" to="/universities">
            universities
          </Link>{" "}
          add karein.
        </p>
      ) : null}

      <div className="field" style={{ maxWidth: "360px", marginTop: "18px" }}>
        <label htmlFor="uni">University</label>
        <select id="uni" value={uniId} onChange={(e) => setUniId(e.target.value)}>
          <option value="">— Select —</option>
          {universities.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
      </div>

      <div className="card" style={{ marginTop: "18px" }}>
        <h2 style={{ marginTop: 0 }}>Add / update fee row</h2>
        <form onSubmit={onSubmit}>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="course_name">Course *</label>
              <input
                id="course_name"
                value={form.course_name}
                onChange={(e) => set("course_name", e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="academic_year">Academic year (optional)</label>
              <input
                id="academic_year"
                placeholder="Blank = default for all years"
                value={form.academic_year}
                onChange={(e) => set("academic_year", e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="amount">Amount (INR) *</label>
              <input
                id="amount"
                type="number"
                min="0"
                step="1"
                value={form.amount}
                onChange={(e) => set("amount", e.target.value)}
                required
              />
            </div>
            <div className="field" style={{ gridColumn: "1 / -1" }}>
              <label htmlFor="notes">Notes</label>
              <input id="notes" value={form.notes} onChange={(e) => set("notes", e.target.value)} />
            </div>
          </div>
          {error ? <div className="error">{error}</div> : null}
          <button className="btn primary" type="submit" disabled={busy || !uniId}>
            {busy ? "Saving…" : "Save fee"}
          </button>
        </form>
      </div>

      <h2 style={{ marginTop: "28px" }}>Fee table</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Course</th>
              <th>Year</th>
              <th>Amount</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {!uniId ? (
              <tr>
                <td colSpan={4} className="muted">
                  University select karein.
                </td>
              </tr>
            ) : fees.length === 0 ? (
              <tr>
                <td colSpan={4} className="muted">
                  Is university ke liye abhi koi fee row nahi.
                </td>
              </tr>
            ) : (
              fees.map((f) => (
                <tr key={f.id}>
                  <td>{f.course_name}</td>
                  <td>{f.academic_year || "Default"}</td>
                  <td>
                    ₹{Number(f.amount).toLocaleString("en-IN")} {f.currency || "INR"}
                  </td>
                  <td>
                    <button type="button" className="btn ghost danger" onClick={() => removeFee(f.id)}>
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
