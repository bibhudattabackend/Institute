import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { api } from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function Dashboard() {
  const { institute } = useAuth();
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [feeSeries, setFeeSeries] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [s, list, fee] = await Promise.all([
          api("/api/students/stats"),
          api("/api/students"),
          api("/api/students/fee-stats"),
        ]);
        if (!cancelled) {
          setStats(s);
          setRecent((list.students || []).slice(0, 5));
          setFeeSeries(fee.series || []);
        }
      } catch (e) {
        if (!cancelled) setError(e.message || "Failed to load");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const chartData = feeSeries.map((row) => ({
    month: row.month,
    collected: row.total,
  }));

  return (
    <div className="page">
      <div className="dashboard-hero">
        {institute?.logo_url ? (
          <div className="dashboard-logo-wrap">
            <img src={institute.logo_url} alt="" className="dashboard-logo" />
          </div>
        ) : null}
        <div>
          <h1 style={{ margin: "0 0 8px" }}>Dashboard</h1>
          <p className="muted" style={{ margin: 0 }}>
            Welcome, <strong>{institute?.name}</strong>. Yahan aapke institute ke admissions ka snapshot hai.
          </p>
        </div>
      </div>
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

      {chartData.length > 0 ? (
        <div className="card" style={{ marginTop: "22px" }}>
          <h2 style={{ margin: "0 0 8px", fontSize: "16px" }}>Fee collected (by month)</h2>
          <p className="muted" style={{ margin: "0 0 16px", fontSize: "13px" }}>
            Receipt entries ke hisaab se — jab bhi amount paid badhta hai, receipt generate hota hai.
          </p>
          <div style={{ width: "100%", height: 280 }}>
            <ResponsiveContainer>
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#263041" opacity={0.35} />
                <XAxis dataKey="month" tick={{ fill: "var(--muted)", fontSize: 11 }} />
                <YAxis
                  tick={{ fill: "var(--muted)", fontSize: 11 }}
                  tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                />
                <Tooltip
                  formatter={(v) => [`₹${Number(v).toLocaleString("en-IN")}`, "Collected"]}
                  contentStyle={{ background: "#1a2230", border: "1px solid var(--border)" }}
                />
                <Bar dataKey="collected" fill="var(--accent)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <p className="muted" style={{ marginTop: "18px" }}>
          Fee chart tab dikhega jab pehli fee receipt record ho.
        </p>
      )}

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
