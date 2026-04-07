import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function Dashboard() {
  const { institute } = useAuth();
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [s, list] = await Promise.all([
          api("/api/students/stats"),
          api("/api/students"),
        ]);
        if (!cancelled) {
          setStats(s);
          setRecent((list.students || []).slice(0, 5));
        }
      } catch (e) {
        if (!cancelled) setError(e.message || "Failed to load");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="page">
      <h1>Dashboard</h1>
      <p className="muted">
        Welcome, <strong>{institute?.name}</strong>. Yahan aapke institute ke admissions ka snapshot hai.
      </p>
      {error ? <div className="error">{error}</div> : null}

      <div className="grid-2" style={{ marginTop: "22px" }}>
        <div className="card">
          <div className="stat">{stats?.total ?? "—"}</div>
          <div className="stat-label">Total students (aapke institute)</div>
        </div>
        <div className="card">
          <div className="stat">{stats?.thisMonth ?? "—"}</div>
          <div className="stat-label">Is mahine naye admissions</div>
        </div>
      </div>

      <h2 style={{ marginTop: "28px" }}>Recent admissions</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Admission no.</th>
              <th>Year</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {recent.length === 0 ? (
              <tr>
                <td colSpan={4} className="muted" style={{ padding: "20px" }}>
                  Abhi koi student nahi —{" "}
                  <Link className="link" to="/students/new">
                    pehla admission
                  </Link>{" "}
                  add karein.
                </td>
              </tr>
            ) : (
              recent.map((r) => (
                <tr key={r.id}>
                  <td>{r.full_name}</td>
                  <td>
                    <span className="pill">{r.admission_no}</span>
                  </td>
                  <td>{r.academic_year}</td>
                  <td>{r.admission_date}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="row" style={{ marginTop: "18px" }}>
        <Link className="btn primary" to="/students/new">
          New admission
        </Link>
        <Link className="btn" to="/students">
          All students
        </Link>
      </div>
    </div>
  );
}
