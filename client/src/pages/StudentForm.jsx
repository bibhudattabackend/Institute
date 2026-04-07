import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, apiUpload } from "../api.js";

const empty = {
  full_name: "",
  father_name: "",
  mother_name: "",
  dob: "",
  gender: "",
  phone: "",
  email: "",
  address: "",
  photo_url: "",
  university_id: "",
  course_name: "B.Ed",
  course_fee_amount: "",
  amount_paid: "",
  installments: [{ due_date: "", amount: "" }],
  academic_year: "",
  admission_date: "",
  category: "",
  remarks: "",
  blood_group: "",
  emergency_contact_name: "",
  emergency_contact_phone: "",
  emergency_contact_relation: "",
  mark_10th: "",
  mark_12th: "",
  mark_graduation: "",
  aadhaar_last4: "",
  ncte_sanction_ref: "",
  b_ed_affiliation_no: "",
};

export default function StudentForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [form, setForm] = useState(empty);
  const [universities, setUniversities] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [uploading, setUploading] = useState(false);
  const [receipts, setReceipts] = useState([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { universities: u } = await api("/api/universities");
        if (!cancelled) setUniversities(u || []);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    let cancelled = false;
    (async () => {
      try {
        const { student } = await api(`/api/students/${id}`);
        if (!cancelled) {
          setForm({
            full_name: student.full_name || "",
            father_name: student.father_name || "",
            mother_name: student.mother_name || "",
            dob: student.dob || "",
            gender: student.gender || "",
            phone: student.phone || "",
            email: student.email || "",
            address: student.address || "",
            photo_url: student.photo_url || "",
            university_id: student.university_id || "",
            course_name: student.course_name || "B.Ed",
            course_fee_amount:
              student.course_fee_amount != null ? String(student.course_fee_amount) : "",
            amount_paid: student.amount_paid != null ? String(student.amount_paid) : "",
            installments:
              Array.isArray(student.installments) && student.installments.length > 0
                ? student.installments.map((r) => ({
                    due_date: r.due_date || "",
                    amount: r.amount != null ? String(r.amount) : "",
                  }))
                : [{ due_date: "", amount: "" }],
            academic_year: student.academic_year || "",
            admission_date: student.admission_date || "",
            category: student.category || "",
            remarks: student.remarks || "",
            blood_group: student.blood_group || "",
            emergency_contact_name: student.emergency_contact_name || "",
            emergency_contact_phone: student.emergency_contact_phone || "",
            emergency_contact_relation: student.emergency_contact_relation || "",
            mark_10th: student.mark_10th || "",
            mark_12th: student.mark_12th || "",
            mark_graduation: student.mark_graduation || "",
            aadhaar_last4: student.aadhaar_last4 || "",
            ncte_sanction_ref: student.ncte_sanction_ref || "",
            b_ed_affiliation_no: student.b_ed_affiliation_no || "",
          });
          setReceipts(Array.isArray(student.payment_receipts) ? student.payment_receipts : []);
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
  }, [id, isEdit]);

  useEffect(() => {
    if (isEdit) return;
    if (!form.university_id || !form.course_name.trim()) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const qs = new URLSearchParams();
        qs.set("university_id", form.university_id);
        qs.set("course_name", form.course_name.trim());
        if (form.academic_year.trim()) qs.set("academic_year", form.academic_year.trim());
        const { amount } = await api(`/api/course-fees/lookup?${qs.toString()}`);
        if (!cancelled && amount != null) {
          setForm((f) => ({ ...f, course_fee_amount: String(amount) }));
        }
      } catch {
        /* ignore */
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [form.university_id, form.course_name, form.academic_year, isEdit]);

  function set(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  const feeNum = Number(form.course_fee_amount) || 0;
  const paidNum = Number(form.amount_paid) || 0;
  const remaining = useMemo(() => Math.max(0, Math.round((feeNum - paidNum) * 100) / 100), [feeNum, paidNum]);
  const installmentsSum = useMemo(
    () =>
      form.installments.reduce((s, r) => s + (Number(r.amount) || 0), 0),
    [form.installments]
  );
  const installmentMismatch =
    remaining > 0 &&
    installmentsSum > 0 &&
    Math.abs(installmentsSum - remaining) > 0.5;

  function setInstallment(i, key, val) {
    setForm((f) => {
      const next = f.installments.map((row, j) => (j === i ? { ...row, [key]: val } : row));
      return { ...f, installments: next };
    });
  }

  function addInstallmentRow() {
    setForm((f) => ({ ...f, installments: [...f.installments, { due_date: "", amount: "" }] }));
  }

  function removeInstallmentRow(i) {
    setForm((f) => ({
      ...f,
      installments: f.installments.length > 1 ? f.installments.filter((_, j) => j !== i) : f.installments,
    }));
  }

  async function onPhoto(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("photo", file);
      const { photo_url } = await apiUpload("/api/upload/student-photo", fd);
      setForm((f) => ({ ...f, photo_url }));
    } catch (err) {
      setError(err.message || "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const payload = {
        ...form,
        course_fee_amount: form.course_fee_amount === "" ? null : Number(form.course_fee_amount),
        amount_paid: form.amount_paid === "" ? 0 : Number(form.amount_paid),
        installments: form.installments
          .filter((r) => r.due_date?.trim() && r.amount !== "" && Number.isFinite(Number(r.amount)))
          .map((r) => ({
            due_date: r.due_date.trim(),
            amount: Number(r.amount),
          })),
      };
      if (isEdit) {
        await api(`/api/students/${id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        await api("/api/students", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      navigate("/students", { replace: true });
    } catch (err) {
      setError(err.message || "Save failed");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="page">
        <div className="spinner" aria-label="Loading" />
      </div>
    );
  }

  return (
    <div className="page">
      <div className="row" style={{ marginBottom: "8px" }}>
        <Link className="muted" to="/students" style={{ fontSize: "14px" }}>
          ← Students
        </Link>
      </div>
      <h1>{isEdit ? "Edit admission" : "New admission"}</h1>
      <p className="muted">
        Course fee ke baad kitna payment abhi liya, aur bachi raashi ke liye installment dates set kar
        sakte ho. Letter / application form par balance aur schedule print hoga.
      </p>

      <form onSubmit={onSubmit} className="card" style={{ marginTop: "18px" }}>
        <h2 className="form-section-title">Photo</h2>
        <div className="row" style={{ alignItems: "flex-start", gap: "20px" }}>
          <div
            className="photo-preview"
            style={{
              width: 120,
              height: 150,
              border: "1px solid var(--border)",
              borderRadius: 10,
              overflow: "hidden",
              background: "var(--elevated)",
              flexShrink: 0,
            }}
          >
            {form.photo_url ? (
              <img
                src={form.photo_url}
                alt=""
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <div className="muted" style={{ padding: 12, fontSize: 12, lineHeight: 1.4 }}>
                No photo
              </div>
            )}
          </div>
          <div className="field" style={{ marginBottom: 0, flex: 1 }}>
            <label htmlFor="photo">Upload photo</label>
            <input id="photo" type="file" accept="image/*" onChange={onPhoto} disabled={uploading} />
            {uploading ? <span className="muted" style={{ fontSize: 13 }}>Uploading…</span> : null}
          </div>
        </div>

        <h2 className="form-section-title" style={{ marginTop: "24px" }}>
          Placement &amp; course
        </h2>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="university_id">University (placement)</label>
            <select
              id="university_id"
              value={form.university_id}
              onChange={(e) => set("university_id", e.target.value)}
            >
              <option value="">— Select —</option>
              {universities.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="course_name">Course</label>
            <input
              id="course_name"
              value={form.course_name}
              onChange={(e) => set("course_name", e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="course_fee_amount">Course fee (INR)</label>
            <input
              id="course_fee_amount"
              type="number"
              min="0"
              step="1"
              placeholder="Auto from fee table"
              value={form.course_fee_amount}
              onChange={(e) => set("course_fee_amount", e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="academic_year">Academic year *</label>
            <input
              id="academic_year"
              placeholder="e.g. 2025-26"
              value={form.academic_year}
              onChange={(e) => set("academic_year", e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="admission_date">Admission date *</label>
            <input
              id="admission_date"
              type="date"
              value={form.admission_date}
              onChange={(e) => set("admission_date", e.target.value)}
              required
            />
          </div>
        </div>

        <h2 className="form-section-title" style={{ marginTop: "24px" }}>
          Payment
        </h2>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="amount_paid">Amount paid now (INR)</label>
            <input
              id="amount_paid"
              type="number"
              min="0"
              step="1"
              placeholder="0"
              value={form.amount_paid}
              onChange={(e) => set("amount_paid", e.target.value)}
            />
          </div>
          <div className="field">
            <label>Remaining balance (auto)</label>
            <div
              style={{
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid var(--border)",
                background: "var(--elevated)",
                fontWeight: 600,
              }}
            >
              ₹{remaining.toLocaleString("en-IN")}
            </div>
            <span className="muted" style={{ fontSize: 12 }}>
              Course fee − amount paid
            </span>
          </div>
        </div>

        <h3 style={{ fontSize: 14, margin: "16px 0 8px", color: "var(--muted)" }}>
          Installment schedule (optional)
        </h3>
        <p className="muted" style={{ marginTop: 0, fontSize: 13 }}>
          Baqi raashi ke hisaab se dates aur amounts likho (jaise do kishton mein). Sum ideally remaining (
          ₹{remaining.toLocaleString("en-IN")}) ke barabar ho.
        </p>
        {installmentMismatch ? (
          <div className="error" style={{ marginBottom: 10 }}>
            Installment total (₹{installmentsSum.toLocaleString("en-IN")}) remaining (₹
            {remaining.toLocaleString("en-IN")}) se match nahi kar raha — phir bhi save ho jayega.
          </div>
        ) : null}
        <div style={{ overflow: "auto" }}>
          <table style={{ width: "100%", minWidth: 400, fontSize: 14 }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: "8px 8px 8px 0" }}>Due date</th>
                <th style={{ textAlign: "left", padding: 8 }}>Amount (INR)</th>
                <th style={{ width: 80 }} />
              </tr>
            </thead>
            <tbody>
              {form.installments.map((row, i) => (
                <tr key={i}>
                  <td style={{ padding: "4px 8px 4px 0" }}>
                    <input
                      type="date"
                      value={row.due_date}
                      onChange={(e) => setInstallment(i, "due_date", e.target.value)}
                    />
                  </td>
                  <td style={{ padding: 4 }}>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="0"
                      value={row.amount}
                      onChange={(e) => setInstallment(i, "amount", e.target.value)}
                    />
                  </td>
                  <td>
                    <button type="button" className="btn ghost danger" onClick={() => removeInstallmentRow(i)}>
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button type="button" className="btn" style={{ marginTop: 8 }} onClick={addInstallmentRow}>
          + Add installment
        </button>

        {isEdit && receipts.length > 0 ? (
          <div className="card" style={{ marginTop: "18px" }}>
            <h3 className="form-section-title" style={{ marginTop: 0 }}>
              Fee receipts (auto)
            </h3>
            <p className="muted" style={{ fontSize: 13 }}>Har baar jab amount paid badhta hai, naya receipt ID generate hota hai.</p>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {receipts.map((r, i) => (
                <li key={i} style={{ marginBottom: 6 }}>
                  <strong>{r.receipt_no}</strong> — ₹{Number(r.amount).toLocaleString("en-IN")}
                  {r.recorded_at ? ` — ${new Date(r.recorded_at).toLocaleString()}` : ""}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <h2 className="form-section-title" style={{ marginTop: "24px" }}>
          Compliance / reporting (optional)
        </h2>
        <div className="form-grid">
          <div className="field" style={{ gridColumn: "1 / -1" }}>
            <label htmlFor="ncte_sanction_ref">NCTE / sanction reference</label>
            <input
              id="ncte_sanction_ref"
              value={form.ncte_sanction_ref}
              onChange={(e) => set("ncte_sanction_ref", e.target.value)}
            />
          </div>
          <div className="field" style={{ gridColumn: "1 / -1" }}>
            <label htmlFor="b_ed_affiliation_no">B.Ed affiliation / university ref no.</label>
            <input
              id="b_ed_affiliation_no"
              value={form.b_ed_affiliation_no}
              onChange={(e) => set("b_ed_affiliation_no", e.target.value)}
            />
          </div>
        </div>

        <h2 className="form-section-title" style={{ marginTop: "24px" }}>
          Personal
        </h2>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="full_name">Student full name *</label>
            <input
              id="full_name"
              value={form.full_name}
              onChange={(e) => set("full_name", e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="father_name">Father name</label>
            <input id="father_name" value={form.father_name} onChange={(e) => set("father_name", e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="mother_name">Mother name</label>
            <input id="mother_name" value={form.mother_name} onChange={(e) => set("mother_name", e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="dob">Date of birth</label>
            <input id="dob" type="date" value={form.dob} onChange={(e) => set("dob", e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="gender">Gender</label>
            <select id="gender" value={form.gender} onChange={(e) => set("gender", e.target.value)}>
              <option value="">—</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="blood_group">Blood group</label>
            <input
              id="blood_group"
              placeholder="e.g. O+"
              value={form.blood_group}
              onChange={(e) => set("blood_group", e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="phone">Phone</label>
            <input id="phone" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="aadhaar_last4">Aadhaar (last 4 digits)</label>
            <input
              id="aadhaar_last4"
              maxLength={4}
              value={form.aadhaar_last4}
              onChange={(e) => set("aadhaar_last4", e.target.value.replace(/\D/g, "").slice(0, 4))}
            />
          </div>
          <div className="field" style={{ gridColumn: "1 / -1" }}>
            <label htmlFor="address">Address</label>
            <textarea id="address" value={form.address} onChange={(e) => set("address", e.target.value)} />
          </div>
        </div>

        <h2 className="form-section-title" style={{ marginTop: "24px" }}>
          Emergency contact
        </h2>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="emergency_contact_name">Name</label>
            <input
              id="emergency_contact_name"
              value={form.emergency_contact_name}
              onChange={(e) => set("emergency_contact_name", e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="emergency_contact_phone">Phone</label>
            <input
              id="emergency_contact_phone"
              value={form.emergency_contact_phone}
              onChange={(e) => set("emergency_contact_phone", e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="emergency_contact_relation">Relation</label>
            <input
              id="emergency_contact_relation"
              placeholder="e.g. Father / Uncle"
              value={form.emergency_contact_relation}
              onChange={(e) => set("emergency_contact_relation", e.target.value)}
            />
          </div>
        </div>

        <h2 className="form-section-title" style={{ marginTop: "24px" }}>
          Academic marks
        </h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Percentage, CGPA ya marks jaisa bhi aap record karte ho — text mein likh sakte hain.
        </p>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="mark_10th">10th / Matric</label>
            <input id="mark_10th" value={form.mark_10th} onChange={(e) => set("mark_10th", e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="mark_12th">12th / +2</label>
            <input id="mark_12th" value={form.mark_12th} onChange={(e) => set("mark_12th", e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="mark_graduation">Graduation</label>
            <input
              id="mark_graduation"
              value={form.mark_graduation}
              onChange={(e) => set("mark_graduation", e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="category">Category</label>
            <input id="category" value={form.category} onChange={(e) => set("category", e.target.value)} />
          </div>
          <div className="field" style={{ gridColumn: "1 / -1" }}>
            <label htmlFor="remarks">Remarks</label>
            <textarea id="remarks" value={form.remarks} onChange={(e) => set("remarks", e.target.value)} />
          </div>
        </div>

        {error ? <div className="error">{error}</div> : null}
        <div className="row" style={{ marginTop: "8px" }}>
          <button className="btn primary" type="submit" disabled={busy}>
            {busy ? "Saving…" : "Save"}
          </button>
          <Link className="btn" to="/students">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
