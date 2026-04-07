import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function AuditLog() {
  const { isPrincipal } = useAuth();
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isPrincipal) return;
    let cancelled = false;
    (async () => {
      try {
        const { logs: l } = await api("/api/students/audit?limit=100");
        if (!cancelled) setLogs(l || []);
      } catch (e) {
        if (!cancelled) setError(e.message || "Failed to load");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isPrincipal]);

  if (!isPrincipal) return <Navigate to="/" replace />;

  return (
    <div className="page">
      <h1>Audit log</h1>
      <p className="muted">Student create / update / delete — kaun sa role kab kya kiya.</p>
      {error ? <div className="error">{error}</div> : null}
      <div className="table-wrap" style={{ marginTop: "18px" }}>
        <table>
          <thead>
            <tr>
              <th>When</th>
              <th>Role</th>
              <th>Action</th>
              <th>Summary</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={4} className="muted">
                  No entries yet.
                </td>
              </tr>
            ) : (
              logs.map((r) => (
                <tr key={r.id}>
                  <td style={{ fontSize: "13px", whiteSpace: "nowrap" }}>
                    {r.created_at ? new Date(r.created_at).toLocaleString() : "—"}
                  </td>
                  <td>
                    <span className="pill">{r.actor_role}</span>
                  </td>
                  <td>{r.action}</td>
                  <td className="muted" style={{ fontSize: "13px" }}>
                    {r.summary || "—"}
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
