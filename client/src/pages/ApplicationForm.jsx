import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api.js";

function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
}

function dash(v) {
  if (v == null || v === "") return "—";
  return v;
}

function formatMoney(n) {
  if (n == null || Number.isNaN(Number(n))) return "—";
  return `₹${Number(n).toLocaleString("en-IN")}`;
}

export default function ApplicationForm() {
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
  const templateT = Math.min(3, Math.max(1, Number(institute.letter_template) || 1));
  const fee =
    student.course_fee_amount != null
      ? `₹${Number(student.course_fee_amount).toLocaleString("en-IN")}`
      : "—";
  const paid = formatMoney(student.amount_paid ?? 0);
  const remaining =
    student.remaining_amount != null
      ? formatMoney(student.remaining_amount)
      : student.course_fee_amount != null
        ? formatMoney(
            Math.max(0, Number(student.course_fee_amount) - Number(student.amount_paid || 0))
          )
        : "—";
  const installments = Array.isArray(student.installments) ? student.installments : [];

  return (
    <div className="page">
      <div className="letter-toolbar no-print">
        <button type="button" className="btn primary" onClick={() => window.print()}>
          Print / Save PDF
        </button>
        <Link className="btn" to={`/students/${id}/letter`}>
          Letter of admission
        </Link>
        <Link className="btn" to={`/students/${id}/edit`}>
          Edit student
        </Link>
        <button type="button" className="btn ghost" onClick={() => navigate(-1)}>
          Back
        </button>
      </div>

      <div className={`app-form-sheet app-form-sheet--t${templateT}`}>
        {institute.logo_url ? (
          <div className="app-form-logo-row">
            <img src={institute.logo_url} alt="" className="app-form-institute-logo" />
          </div>
        ) : null}
        <div className="app-form-header">
          <div>
            <div className="app-form-title">APPLICATION FOR ADMISSION</div>
            <div className="app-form-sub">{institute.name}</div>
            {institute.address ? <div className="app-form-meta">{institute.address}</div> : null}
            {institute.phone ? <div className="app-form-meta">Phone: {institute.phone}</div> : null}
            {institute.ncte_registration_no ? (
              <div className="app-form-meta">NCTE / reg.: {institute.ncte_registration_no}</div>
            ) : null}
            {institute.affiliation_code ? (
              <div className="app-form-meta">Affiliation: {institute.affiliation_code}</div>
            ) : null}
          </div>
          <div className="app-form-photo-box">
            {student.photo_url ? (
              <img src={student.photo_url} alt="" className="app-form-photo" />
            ) : (
              <span className="app-form-photo-ph">Photo</span>
            )}
          </div>
        </div>

        <table className="app-form-table">
          <tbody>
            <tr>
              <th colSpan={4} className="app-form-section">
                Admission details
              </th>
            </tr>
            <tr>
              <th>Admission no.</th>
              <td>{dash(student.admission_no)}</td>
              <th>Date</th>
              <td>{formatDate(student.admission_date)}</td>
            </tr>
            <tr>
              <th>Academic year</th>
              <td>{dash(student.academic_year)}</td>
              <th>Course</th>
              <td>{dash(student.course_name)}</td>
            </tr>
            <tr>
              <th>University (placement)</th>
              <td colSpan={3}>{university ? university.name : "—"}</td>
            </tr>
            <tr>
              <th>Course fee</th>
              <td colSpan={3}>{fee}</td>
            </tr>
            <tr>
              <th>Amount paid (at admission)</th>
              <td>{paid}</td>
              <th>Balance due</th>
              <td>
                <strong>{remaining}</strong>
              </td>
            </tr>
            <tr>
              <th colSpan={4} className="app-form-section">
                Installment schedule (if any)
              </th>
            </tr>
            {installments.length === 0 ? (
              <tr>
                <td colSpan={4} className="muted" style={{ fontStyle: "italic" }}>
                  No installments recorded — pay balance as per institute notice.
                </td>
              </tr>
            ) : (
              installments.map((row, idx) => (
                <tr key={idx}>
                  <th>Installment {idx + 1}</th>
                  <td>{row.due_date ? formatDate(row.due_date) : "—"}</td>
                  <th>Amount</th>
                  <td>{formatMoney(row.amount)}</td>
                </tr>
              ))
            )}
            <tr>
              <th colSpan={4} className="app-form-section">
                Personal information
              </th>
            </tr>
            <tr>
              <th>Full name</th>
              <td colSpan={3}>{dash(student.full_name)}</td>
            </tr>
            <tr>
              <th>Father&apos;s name</th>
              <td>{dash(student.father_name)}</td>
              <th>Mother&apos;s name</th>
              <td>{dash(student.mother_name)}</td>
            </tr>
            <tr>
              <th>Date of birth</th>
              <td>{formatDate(student.dob)}</td>
              <th>Gender</th>
              <td>{dash(student.gender)}</td>
            </tr>
            <tr>
              <th>Blood group</th>
              <td>{dash(student.blood_group)}</td>
              <th>Category</th>
              <td>{dash(student.category)}</td>
            </tr>
            <tr>
              <th>Phone</th>
              <td>{dash(student.phone)}</td>
              <th>Email</th>
              <td>{dash(student.email)}</td>
            </tr>
            <tr>
              <th>Aadhaar (last 4)</th>
              <td colSpan={3}>{dash(student.aadhaar_last4)}</td>
            </tr>
            {student.ncte_sanction_ref ? (
              <tr>
                <th>NCTE sanction ref.</th>
                <td colSpan={3}>{dash(student.ncte_sanction_ref)}</td>
              </tr>
            ) : null}
            {student.b_ed_affiliation_no ? (
              <tr>
                <th>B.Ed affiliation no.</th>
                <td colSpan={3}>{dash(student.b_ed_affiliation_no)}</td>
              </tr>
            ) : null}
            <tr>
              <th>Address</th>
              <td colSpan={3} style={{ whiteSpace: "pre-wrap" }}>
                {dash(student.address)}
              </td>
            </tr>
            <tr>
              <th colSpan={4} className="app-form-section">
                Emergency contact
              </th>
            </tr>
            <tr>
              <th>Name</th>
              <td>{dash(student.emergency_contact_name)}</td>
              <th>Phone</th>
              <td>{dash(student.emergency_contact_phone)}</td>
            </tr>
            <tr>
              <th>Relation</th>
              <td colSpan={3}>{dash(student.emergency_contact_relation)}</td>
            </tr>
            <tr>
              <th colSpan={4} className="app-form-section">
                Academic record
              </th>
            </tr>
            <tr>
              <th>10th / Matric</th>
              <td colSpan={3}>{dash(student.mark_10th)}</td>
            </tr>
            <tr>
              <th>12th / +2</th>
              <td colSpan={3}>{dash(student.mark_12th)}</td>
            </tr>
            <tr>
              <th>Graduation</th>
              <td colSpan={3}>{dash(student.mark_graduation)}</td>
            </tr>
            <tr>
              <th>Remarks</th>
              <td colSpan={3} style={{ whiteSpace: "pre-wrap" }}>
                {dash(student.remarks)}
              </td>
            </tr>
          </tbody>
        </table>

        <div className="app-form-declaration">
          <p>
            <strong>Declaration:</strong> I hereby declare that the particulars given above are true to
            the best of my knowledge. I agree to abide by the rules and regulations of the institute.
          </p>
          <div className="app-form-sign-row">
            <div>
              <div className="app-form-sign-line" />
              <div>Signature of applicant</div>
            </div>
            <div>
              <div className="app-form-sign-line" />
              <div>Signature of parent / guardian</div>
            </div>
            <div>
              <div className="app-form-sign-line" />
              <div>Office use — verified by</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
