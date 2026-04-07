import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";

export default function Students() {
  const [students, setStudents] = useState([]);
  const [years, setYears] = useState([]);
  const [q, setQ] = useState("");
  const [year, setYear] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(null);

  const query = useMemo(() => {
    const p = new URLSearchParams();
    if (q.trim()) p.set("q", q.trim());
    if (year) p.set("year", year);
    return p.toString();
  }, [q, year]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [list, y] = await Promise.all([
          api(`/api/students${query ? `?${query}` : ""}`),
          api("/api/students/years"),
        ]);
        if (!cancelled) {
          setStudents(list.students || []);
          setYears(y.years || []);
        }
      } catch (e) {
        if (!cancelled) setError(e.message || "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [query]);

  async function removeStudent(s) {
    if (!window.confirm(`${s.full_name} ka record delete karein?`)) return;
    setDeleting(s.id);
    setError("");
    try {
      await api(`/api/students/${s.id}`, { method: "DELETE" });
      setStudents((list) => list.filter((x) => x.id !== s.id));
    } catch (e) {
      setError(e.message || "Delete failed");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="page">
      <div className="row" style={{ justifyContent: "space-between", marginBottom: "8px" }}>
        <div>
          <h1>Students</h1>
          <p className="muted">Sirf is institute ke students — doosre institute ka data kabhi mix nahi hota.</p>
        </div>
        <Link className="btn primary" to="/students/new">
          + Admission
        </Link>
      </div>

      <div className="card" style={{ marginBottom: "16px" }}>
        <div className="row">
          <div className="field" style={{ marginBottom: 0, flex: "1 1 220px" }}>
            <label htmlFor="search">Search</label>
            <input
              id="search"
              placeholder="Name, father, admission no., phone"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <div className="field" style={{ marginBottom: 0, width: "200px" }}>
            <label htmlFor="year">Academic year</label>
            <select id="year" value={year} onChange={(e) => setYear(e.target.value)}>
              <option value="">All years</option>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {error ? <div className="error">{error}</div> : null}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th style={{ width: 48 }} />
              <th>Student</th>
              <th>Admission</th>
              <th>University</th>
              <th>Year</th>
              <th>Balance</th>
              <th>Phone</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="muted" style={{ padding: "20px" }}>
                  Loading…
                </td>
              </tr>
            ) : students.length === 0 ? (
              <tr>
                <td colSpan={8} className="muted" style={{ padding: "20px" }}>
                  Koi record nahi mila.
                </td>
              </tr>
            ) : (
              students.map((s) => (
                <tr key={s.id}>
                  <td>
                    {s.photo_url ? (
                      <img
                        src={s.photo_url}
                        alt=""
                        width={40}
                        height={40}
                        style={{ borderRadius: 8, objectFit: "cover", display: "block" }}
                      />
                    ) : (
                      <span className="muted" style={{ fontSize: "11px" }}>
                        —
                      </span>
                    )}
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{s.full_name}</div>
                    <div className="muted" style={{ fontSize: "12px" }}>
                      {s.father_name ? `Father: ${s.father_name}` : ""}
                    </div>
                  </td>
                  <td>
                    <span className="pill">{s.admission_no}</span>
                  </td>
                  <td className="muted" style={{ fontSize: "13px" }}>
                    {s.university_name || "—"}
                  </td>
                  <td>{s.academic_year}</td>
                  <td className="muted" style={{ fontSize: "13px" }}>
                    {s.remaining_amount != null
                      ? `₹${Number(s.remaining_amount).toLocaleString("en-IN")}`
                      : "—"}
                  </td>
                  <td>{s.phone || "—"}</td>
                  <td>
                    <div className="actions">
                      <Link className="btn ghost" to={`/students/${s.id}/application`}>
                        Form
                      </Link>
                      <Link className="btn ghost" to={`/students/${s.id}/letter`}>
                        Letter
                      </Link>
                      <Link className="btn ghost" to={`/students/${s.id}/edit`}>
                        Edit
                      </Link>
                      <button
                        type="button"
                        className="btn ghost danger"
                        disabled={deleting === s.id}
                        onClick={() => removeStudent(s)}
                      >
                        Delete
                      </button>
                    </div>
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
