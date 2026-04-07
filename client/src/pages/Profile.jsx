import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { api, apiUpload } from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function Profile() {
  const { institute, refreshInstitute, isPrincipal } = useAuth();
  const [form, setForm] = useState({
    name: "",
    phone: "",
    address: "",
    principal_name: "",
    letter_head_line: "",
    letter_template: 1,
    ncte_registration_no: "",
    affiliation_code: "",
    compliance_notes: "",
    current_password: "",
    password: "",
  });
  const [staffList, setStaffList] = useState([]);
  const [staffEmail, setStaffEmail] = useState("");
  const [staffPassword, setStaffPassword] = useState("");
  const [staffName, setStaffName] = useState("");

  useEffect(() => {
    if (!institute) return;
    setForm((f) => ({
      ...f,
      name: institute.name || "",
      phone: institute.phone || "",
      address: institute.address || "",
      principal_name: institute.principal_name || "",
      letter_head_line: institute.letter_head_line || "",
      letter_template: institute.letter_template ?? 1,
      ncte_registration_no: institute.ncte_registration_no || "",
      affiliation_code: institute.affiliation_code || "",
      compliance_notes: institute.compliance_notes || "",
    }));
  }, [institute]);

  useEffect(() => {
    if (!isPrincipal) return;
    let cancelled = false;
    (async () => {
      try {
        const { staff } = await api("/api/auth/staff");
        if (!cancelled) setStaffList(staff || []);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isPrincipal, institute]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [logoBusy, setLogoBusy] = useState(false);

  function set(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function onLogoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoBusy(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("logo", file);
      const { logo_url } = await apiUpload("/api/upload/institute-logo", fd);
      await api("/api/auth/me", {
        method: "PATCH",
        body: JSON.stringify({ logo_url }),
      });
      await refreshInstitute();
      setMessage("Logo saved.");
    } catch (err) {
      setError(err.message || "Logo upload failed");
    } finally {
      setLogoBusy(false);
      e.target.value = "";
    }
  }

  async function removeLogo() {
    setLogoBusy(true);
    setError("");
    try {
      await api("/api/auth/me", {
        method: "PATCH",
        body: JSON.stringify({ logo_url: null }),
      });
      await refreshInstitute();
      setMessage("Logo removed.");
    } catch (err) {
      setError(err.message || "Could not remove logo");
    } finally {
      setLogoBusy(false);
    }
  }

  async function addStaff(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    try {
      await api("/api/auth/staff", {
        method: "POST",
        body: JSON.stringify({
          email: staffEmail,
          password: staffPassword,
          name: staffName || undefined,
        }),
      });
      setStaffEmail("");
      setStaffPassword("");
      setStaffName("");
      const { staff } = await api("/api/auth/staff");
      setStaffList(staff || []);
      setMessage("Staff account created.");
    } catch (err) {
      setError(err.message || "Could not add staff");
    }
  }

  async function removeStaff(id) {
    if (!window.confirm("Remove this staff login?")) return;
    try {
      await api(`/api/auth/staff/${id}`, { method: "DELETE" });
      setStaffList((list) => list.filter((s) => s.id !== id));
      setMessage("Staff removed.");
    } catch (err) {
      setError(err.message || "Remove failed");
    }
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    setBusy(true);
    try {
      const payload = {
        name: form.name,
        phone: form.phone,
        address: form.address,
        principal_name: form.principal_name,
        letter_head_line: form.letter_head_line,
        letter_template: Number(form.letter_template),
        ncte_registration_no: form.ncte_registration_no || null,
        affiliation_code: form.affiliation_code || null,
        compliance_notes: form.compliance_notes || null,
      };
      if (form.password) {
        payload.password = form.password;
        payload.current_password = form.current_password;
      }
      await api("/api/auth/me", {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      await refreshInstitute();
      setMessage("Profile saved.");
      setForm((f) => ({ ...f, current_password: "", password: "" }));
    } catch (err) {
      setError(err.message || "Update failed");
    } finally {
      setBusy(false);
    }
  }

  if (!isPrincipal) return <Navigate to="/" replace />;

  return (
    <div className="page">
      <h1>Institute profile</h1>
      <p className="muted">
        Letter of admission par jo naam, address aur principal dikhega — woh yahan se set hota hai.
      </p>

      <div className="card" style={{ marginTop: "18px" }}>
        <h2 className="form-section-title">Institute logo</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Letterhead, application form aur dashboard par centre / header mein dikhega (PNG/JPG, max 2 MB).
        </p>
        <div className="profile-logo-row">
          <div className="profile-logo-preview">
            {institute?.logo_url ? (
              <img src={institute.logo_url} alt="" className="profile-logo-img" />
            ) : (
              <span className="muted">Abhi koi logo nahi</span>
            )}
          </div>
          <div className="profile-logo-actions">
            <label className="btn primary" style={{ cursor: logoBusy ? "wait" : "pointer" }}>
              {logoBusy ? "Uploading…" : "Upload logo"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="sr-only"
                onChange={onLogoChange}
                disabled={logoBusy}
              />
            </label>
            {institute?.logo_url ? (
              <button type="button" className="btn ghost" onClick={removeLogo} disabled={logoBusy}>
                Remove
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <form className="card" style={{ marginTop: "18px" }} onSubmit={onSubmit}>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="name">Institute name</label>
            <input id="name" value={form.name} onChange={(e) => set("name", e.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="email">Email (login)</label>
            <input id="email" value={institute?.email || ""} disabled />
          </div>
          <div className="field">
            <label htmlFor="phone">Phone</label>
            <input id="phone" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
          </div>
          <div className="field" style={{ gridColumn: "1 / -1" }}>
            <label htmlFor="address">Address</label>
            <textarea id="address" value={form.address} onChange={(e) => set("address", e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="principal_name">Principal name</label>
            <input
              id="principal_name"
              value={form.principal_name}
              onChange={(e) => set("principal_name", e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="letter_head_line">Letterhead line</label>
            <input
              id="letter_head_line"
              value={form.letter_head_line}
              onChange={(e) => set("letter_head_line", e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="letter_template">Letter / application template</label>
            <select
              id="letter_template"
              value={form.letter_template}
              onChange={(e) => set("letter_template", Number(e.target.value))}
            >
              <option value={1}>Classic (navy header)</option>
              <option value={2}>Minimal (accent border)</option>
              <option value={3}>Bilingual-style (extra top rule)</option>
            </select>
          </div>
          <div className="field" style={{ gridColumn: "1 / -1" }}>
            <label htmlFor="ncte_registration_no">NCTE / council registration (optional)</label>
            <input
              id="ncte_registration_no"
              value={form.ncte_registration_no}
              onChange={(e) => set("ncte_registration_no", e.target.value)}
              placeholder="Reporting ke liye"
            />
          </div>
          <div className="field">
            <label htmlFor="affiliation_code">Affiliation / code (optional)</label>
            <input
              id="affiliation_code"
              value={form.affiliation_code}
              onChange={(e) => set("affiliation_code", e.target.value)}
            />
          </div>
          <div className="field" style={{ gridColumn: "1 / -1" }}>
            <label htmlFor="compliance_notes">Compliance notes (optional)</label>
            <textarea
              id="compliance_notes"
              value={form.compliance_notes}
              onChange={(e) => set("compliance_notes", e.target.value)}
              rows={2}
            />
          </div>
          <div className="field">
            <label htmlFor="current_password">Current password (password change ke liye)</label>
            <input
              id="current_password"
              type="password"
              value={form.current_password}
              onChange={(e) => set("current_password", e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <div className="field">
            <label htmlFor="password">New password</label>
            <input
              id="password"
              type="password"
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
              autoComplete="new-password"
            />
          </div>
        </div>
        {error ? <div className="error">{error}</div> : null}
        {message ? <p className="muted">{message}</p> : null}
        <button className="btn primary" type="submit" disabled={busy}>
          {busy ? "Saving…" : "Save changes"}
        </button>
      </form>

      <div className="card" style={{ marginTop: "18px" }}>
        <h2 className="form-section-title">Staff (clerk) logins</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Clerk sirf students dekh / edit kar sakta hai — delete, profile, fees master nahi.
        </p>
        <ul style={{ margin: "12px 0", paddingLeft: "20px" }}>
          {staffList.map((s) => (
            <li key={s.id} style={{ marginBottom: 8 }}>
              <strong>{s.email}</strong>
              {s.name ? ` — ${s.name}` : ""}
              <button type="button" className="btn ghost danger" style={{ marginLeft: 12 }} onClick={() => removeStaff(s.id)}>
                Remove
              </button>
            </li>
          ))}
          {staffList.length === 0 ? <li className="muted">Abhi koi staff nahi</li> : null}
        </ul>
        <form className="form-grid" style={{ marginTop: 16 }} onSubmit={addStaff}>
          <div className="field">
            <label>New staff email</label>
            <input
              type="email"
              value={staffEmail}
              onChange={(e) => setStaffEmail(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label>Temporary password</label>
            <input
              type="password"
              value={staffPassword}
              onChange={(e) => setStaffPassword(e.target.value)}
              minLength={6}
              required
            />
          </div>
          <div className="field">
            <label>Name (optional)</label>
            <input value={staffName} onChange={(e) => setStaffName(e.target.value)} />
          </div>
          <div className="field" style={{ alignSelf: "end" }}>
            <button className="btn primary" type="submit">
              Add staff
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
