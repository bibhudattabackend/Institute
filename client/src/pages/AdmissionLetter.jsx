import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api.js";

function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
}

function formatMoney(n) {
  if (n == null || Number.isNaN(Number(n))) return "—";
  return `₹${Number(n).toLocaleString("en-IN")}`;
}

export default function AdmissionLetter() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api(`/api/students/${id}/letter-context`);
        if (!cancelled) setData(res);
      } catch (e) {
        if (!cancelled) setError(e.message || "Failed to load");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (error) {
    return (
      <div className="page">
        <div className="error">{error}</div>
        <Link className="btn" to="/students">
          Back
        </Link>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="page">
        <div className="spinner" aria-label="Loading" />
      </div>
    );
  }

  const { institute, student, university } = data;
  const headLine =
    institute.letter_head_line ||
    "Teacher Education Programme (B.Ed)";
  const remaining =
    student.remaining_amount != null
      ? student.remaining_amount
      : student.course_fee_amount != null
        ? Math.max(0, Number(student.course_fee_amount) - Number(student.amount_paid || 0))
        : null;
  const installments = Array.isArray(student.installments) ? student.installments : [];

  return (
    <div className="page">
      <div className="letter-toolbar no-print">
        <button type="button" className="btn primary" onClick={() => window.print()}>
          Print / Save PDF
        </button>
        <Link className="btn" to={`/students/${id}/application`}>
          Application form
        </Link>
        <Link className="btn" to={`/students/${id}/edit`}>
          Edit student
        </Link>
        <button type="button" className="btn ghost" onClick={() => navigate(-1)}>
          Back
        </button>
      </div>

      <div className="letter-sheet">
        <div className="letter-head">
          <h1>{institute.name}</h1>
          <div className="letter-meta">{headLine}</div>
          {institute.address ? <div className="letter-meta">{institute.address}</div> : null}
          {institute.phone ? <div className="letter-meta">Phone: {institute.phone}</div> : null}
        </div>

        <div className="letter-ref">
          <div>
            <strong>Ref:</strong> {student.admission_no}
          </div>
          <div>
            <strong>Date:</strong> {formatDate(student.admission_date)}
          </div>
        </div>

        <div className="letter-body">
          <p>
            <strong>To,</strong>
            <br />
            {student.full_name}
            <br />
            {student.address ? (
              <>
                {student.address.split("\n").map((line, i) => (
                  <span key={i}>
                    {line}
                    <br />
                  </span>
                ))}
              </>
            ) : null}
          </p>

          <p>
            <strong>Subject: Letter of Admission — {student.course_name || "B.Ed"}</strong>
          </p>

          <p>Dear {student.full_name},</p>

          <p>
            With reference to your application, we are pleased to inform you that you have been granted
            provisional admission to the <strong>{student.course_name || "B.Ed"}</strong> programme for the
            academic session <strong>{student.academic_year}</strong> at{" "}
            <strong>{institute.name}</strong>
            {university ? (
              <>
                , with placement / affiliation towards <strong>{university.name}</strong>
                {university.city ? ` (${university.city})` : ""}
              </>
            ) : null}
            . Your admission number is <strong>{student.admission_no}</strong>
            {student.course_fee_amount != null ? (
              <>
                . Prescribed course fee: <strong>₹{Number(student.course_fee_amount).toLocaleString("en-IN")}</strong>
              </>
            ) : null}
            .
          </p>

          <p>
            {student.father_name ? (
              <>
                Father&apos;s name: <strong>{student.father_name}</strong>
                <br />
              </>
            ) : null}
            {student.dob ? (
              <>
                Date of birth: <strong>{formatDate(student.dob)}</strong>
                <br />
              </>
            ) : null}
            {student.category ? (
              <>
                Category: <strong>{student.category}</strong>
              </>
            ) : null}
          </p>

          {student.course_fee_amount != null ? (
            <p>
              <strong>Fee summary:</strong> Total course fee: {formatMoney(student.course_fee_amount)}.
              Amount paid at admission: {formatMoney(student.amount_paid ?? 0)}.{" "}
              <strong>Balance due: {formatMoney(remaining)}</strong>.
            </p>
          ) : null}

          {installments.length > 0 ? (
            <div className="letter-installment-block">
              <p className="letter-installment-title">
                <strong>Agreed installment schedule (balance)</strong>
              </p>
              <table className="letter-fee-table">
                <thead>
                  <tr>
                    <th scope="col">Due date</th>
                    <th scope="col" className="letter-fee-table-num">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {installments.map((row, idx) => (
                    <tr key={idx}>
                      <td>{row.due_date ? formatDate(row.due_date) : "—"}</td>
                      <td className="letter-fee-table-num">{formatMoney(row.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          <p>
            Please complete the formalities as per institute rules and report on the dates communicated by
            the office. This letter is issued for official purposes and does not, by itself, confer any legal
            rights beyond the scope of institute regulations.
          </p>

          <p>Congratulations and best wishes for your academic journey.</p>

          <div className="letter-sign letter-sign-institute">
            <p>Yours sincerely,</p>
            <div className="line">
              {institute.principal_name ? (
                <>
                  <strong>{institute.principal_name}</strong>
                  <br />
                </>
              ) : null}
              Principal
              <br />
              {institute.name}
            </div>
          </div>

          <div className="letter-party-signatures">
            <p className="letter-party-title">
              <strong>For acceptance &amp; office record</strong>
              <span className="letter-party-sub"> (signatures required)</span>
            </p>
            <div className="letter-sign-row">
              <div className="letter-sign-cell">
                <div className="letter-sign-pad" aria-hidden />
                <div className="letter-sign-rule" />
                <span className="letter-sign-label">Signature of applicant</span>
              </div>
              <div className="letter-sign-cell">
                <div className="letter-sign-pad" aria-hidden />
                <div className="letter-sign-rule" />
                <span className="letter-sign-label">Signature of parent / guardian</span>
              </div>
              <div className="letter-sign-cell">
                <div className="letter-sign-pad" aria-hidden />
                <div className="letter-sign-rule" />
                <span className="letter-sign-label">
                  Office use
                  <br />
                  <span className="letter-sign-label-muted">(verified by)</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
