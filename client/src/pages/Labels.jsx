import { useEffect, useState } from "react";
import { api } from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function Labels() {
  const { institute } = useAuth();
  const [students, setStudents] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { students: s } = await api("/api/students");
        if (!cancelled) setStudents(s || []);
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
      <h1>Print labels</h1>
      <p className="muted">
        Admission no. + naam — envelope / file labels ke liye print karein (A4 sheet par grid).
      </p>
      {error ? <div className="error">{error}</div> : null}
      <button type="button" className="btn primary no-print" style={{ marginTop: "12px" }} onClick={() => window.print()}>
        Print
      </button>

      <div className="labels-sheet">
        <div className="labels-grid">
          {students.map((s) => (
            <div key={s.id} className="label-cell">
              <div className="label-institute">{institute?.name}</div>
              <div className="label-name">{s.full_name}</div>
              <div className="label-meta">
                <strong>{s.admission_no}</strong>
                {s.phone ? ` · ${s.phone}` : ""}
              </div>
              <div className="label-meta muted-small">{s.academic_year}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
