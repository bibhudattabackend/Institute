import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
} from "recharts";
import { api } from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";

const PIE_COLORS = ["#0f766e", "#f59e0b"];
const YEAR_BAR = "#3b82f6";

function formatMonthLabel(key) {
  if (!key || typeof key !== "string") return key;
  const [y, m] = key.split("-");
  const mi = parseInt(m, 10);
  if (!y || !Number.isFinite(mi) || mi < 1 || mi > 12) return key;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[mi - 1]} ${y}`;
}

function formatInr(n) {
  if (n == null || Number.isNaN(Number(n))) return "—";
  return `₹${Number(n).toLocaleString("en-IN")}`;
}

export default function Dashboard() {
  const { institute } = useAuth();
  const [insights, setInsights] = useState(null);
  const [recent, setRecent] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [data, list] = await Promise.all([
          api("/api/students/insights"),
          api("/api/students"),
        ]);
        if (!cancelled) {
          setInsights(data);
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

  const feeSeries = insights?.fee_series || [];
  const feeSummary = insights?.fee_summary || { total_paid: 0, total_pending: 0 };
  const admissionsByYear = insights?.admissions_by_year || [];

  const chartData = useMemo(
    () =>
      feeSeries.map((row) => ({
        month: formatMonthLabel(row.month),
        collected: row.total,
      })),
    [feeSeries]
  );

  const pieData = useMemo(() => {
    const paid = Number(feeSummary.total_paid) || 0;
    const pend = Number(feeSummary.total_pending) || 0;
    const out = [];
    if (paid > 0) out.push({ name: "Collected (paid)", value: Math.round(paid * 100) / 100 });
    if (pend > 0) out.push({ name: "Pending", value: Math.round(pend * 100) / 100 });
    return out;
  }, [feeSummary]);

  const areaData = chartData;

  const hasFeeBreakdown = pieData.length > 0;
  const hasMonthlyReceipts = chartData.length > 0;
  const hasYearBreakdown = admissionsByYear.length > 0;

  const pendingInstallments = insights?.pending_installments || [];

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
            Welcome, <strong>{institute?.name}</strong>. Admissions aur fees ka snapshot — pie chart, monthly
            trend, aur batch-wise breakdown.
          </p>
        </div>
      </div>
      {error ? <div className="error">{error}</div> : null}

      <div className="dashboard-stats-grid" style={{ marginTop: "22px" }}>
        <div className="card">
          <div className="stat">{insights?.total ?? "—"}</div>
          <div className="stat-label">Total students</div>
        </div>
        <div className="card">
          <div className="stat">{insights?.thisMonth ?? "—"}</div>
          <div className="stat-label">Naye admissions (is mahine)</div>
        </div>
        <div className="card">
          <div className="stat">{formatInr(feeSummary.total_paid)}</div>
          <div className="stat-label">Total fee collected (amount paid)</div>
        </div>
        <div className="card">
          <div className="stat">{formatInr(feeSummary.total_pending)}</div>
          <div className="stat-label">Total pending (course fee − paid)</div>
        </div>
      </div>

      <div className="card" style={{ marginTop: "22px" }}>
        <h2 className="dashboard-chart-title">Unpaid installments (due list)</h2>
        <p className="muted dashboard-chart-desc">
          Student form mein jo installment rows abhi <strong>Paid</strong> nahi — yahan due date, amount, aur
          overdue flag dikhega. Payment lene ke baad usi row par tick karein.
        </p>
        {pendingInstallments.length > 0 ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Admission</th>
                  <th>Phone</th>
                  <th>Due date</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {pendingInstallments.map((row, i) => (
                  <tr key={`${row.student_id}-${row.due_date}-${i}`}>
                    <td>{row.full_name}</td>
                    <td>
                      <span className="pill">{row.admission_no}</span>
                    </td>
                    <td>{row.phone || "—"}</td>
                    <td>{row.due_date || "—"}</td>
                    <td>{formatInr(row.amount)}</td>
                    <td>
                      {row.overdue ? (
                        <span className="pill danger-soft">
                          Overdue
                          {row.days_until != null ? ` · ${Math.abs(row.days_until)}d` : ""}
                        </span>
                      ) : row.days_until != null ? (
                        <span className="muted" style={{ fontSize: 13 }}>
                          {row.days_until === 0
                            ? "Due today"
                            : row.days_until > 0
                              ? `Due in ${row.days_until}d`
                              : `Overdue ${Math.abs(row.days_until)}d`}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      <Link
                        className="btn ghost"
                        style={{ fontSize: 13, padding: "6px 10px" }}
                        to={`/students/${row.student_id}/edit`}
                      >
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted" style={{ margin: 0 }}>
            Koi unpaid installment nahi — ya abhi students par installment schedule set nahi hai.
          </p>
        )}
      </div>

      <div className="dashboard-charts-row">
        <div className="card dashboard-chart-card">
          <h2 className="dashboard-chart-title">Fee: collected vs pending</h2>
          <p className="muted dashboard-chart-desc">
            Course fee set hone par pending calculate hota hai. Donut chart se proportion dikhta hai.
          </p>
          {hasFeeBreakdown ? (
            <div style={{ width: "100%", height: 280 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={58}
                    outerRadius={96}
                    paddingAngle={2}
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${name.split(" ")[0]} ${(percent * 100).toFixed(0)}%`
                    }
                  >
                    {pieData.map((_, i) => (
                      <Cell key={`slice-${i}`} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v) => formatInr(v)}
                    contentStyle={{ background: "#1a2230", border: "1px solid var(--border)" }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="muted" style={{ padding: "24px 0" }}>
              Jab students par course fee aur payment dono hon tab yahan pie dikhega.
            </p>
          )}
        </div>

        <div className="card dashboard-chart-card">
          <h2 className="dashboard-chart-title">Fee collected by month (receipts)</h2>
          <p className="muted dashboard-chart-desc">
            Receipt entries ke hisaab se — jab amount paid badhta hai tab receipt generate hota hai.
          </p>
          {hasMonthlyReceipts ? (
            <div style={{ width: "100%", height: 280 }}>
              <ResponsiveContainer>
                <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#263041" opacity={0.35} />
                  <XAxis dataKey="month" tick={{ fill: "var(--muted)", fontSize: 11 }} interval={0} angle={-35} textAnchor="end" height={56} />
                  <YAxis
                    tick={{ fill: "var(--muted)", fontSize: 11 }}
                    tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                  />
                  <Tooltip
                    formatter={(v) => [formatInr(v), "Collected"]}
                    contentStyle={{ background: "#1a2230", border: "1px solid var(--border)" }}
                  />
                  <Bar dataKey="collected" fill="var(--accent)" radius={[4, 4, 0, 0]} name="Collected" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="muted" style={{ padding: "24px 0" }}>
              Monthly bar tab dikhega jab pehli fee receipt record ho.
            </p>
          )}
        </div>
      </div>

      <div className="card" style={{ marginTop: "16px" }}>
        <h2 className="dashboard-chart-title">Monthly fee trend (area)</h2>
        <p className="muted dashboard-chart-desc" style={{ marginTop: 0 }}>
          Wahi receipt data — line/area se trend zyada clear dikhta hai.
        </p>
        {hasMonthlyReceipts ? (
          <div style={{ width: "100%", height: 240 }}>
            <ResponsiveContainer>
              <AreaChart data={areaData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="feeAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#263041" opacity={0.35} />
                <XAxis dataKey="month" tick={{ fill: "var(--muted)", fontSize: 11 }} />
                <YAxis
                  tick={{ fill: "var(--muted)", fontSize: 11 }}
                  tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                />
                <Tooltip
                  formatter={(v) => [formatInr(v), "Collected"]}
                  contentStyle={{ background: "#1a2230", border: "1px solid var(--border)" }}
                />
                <Area
                  type="monotone"
                  dataKey="collected"
                  stroke="var(--accent)"
                  strokeWidth={2}
                  fill="url(#feeAreaGrad)"
                  name="Collected"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="muted" style={{ paddingBottom: "16px" }}>
            Receipt data aane ke baad trend yahan dikhega.
          </p>
        )}
      </div>

      <div className="card" style={{ marginTop: "16px" }}>
        <h2 className="dashboard-chart-title">Students by academic year</h2>
        <p className="muted dashboard-chart-desc" style={{ marginTop: 0 }}>
          Har batch / session mein kitne admissions — horizontal bar.
        </p>
        {hasYearBreakdown ? (
          <div style={{ width: "100%", height: Math.min(420, 48 + admissionsByYear.length * 36) }}>
            <ResponsiveContainer>
              <BarChart
                layout="vertical"
                data={admissionsByYear}
                margin={{ top: 8, right: 24, left: 8, bottom: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#263041" opacity={0.35} horizontal={false} />
                <XAxis type="number" tick={{ fill: "var(--muted)", fontSize: 11 }} allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="year"
                  width={100}
                  tick={{ fill: "var(--muted)", fontSize: 11 }}
                />
                <Tooltip
                  formatter={(v) => [v, "Students"]}
                  contentStyle={{ background: "#1a2230", border: "1px solid var(--border)" }}
                />
                <Bar dataKey="count" fill={YEAR_BAR} radius={[0, 4, 4, 0]} name="Students" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="muted" style={{ padding: "16px 0" }}>
            Jab students mein academic year bhara ho tab yahan batch-wise count dikhega.
          </p>
        )}
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
