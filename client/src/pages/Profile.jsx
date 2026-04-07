import { useEffect, useState } from "react";
import { api, apiUpload } from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function Profile() {
  const { institute, refreshInstitute } = useAuth();
  const [form, setForm] = useState({
    name: "",
    phone: "",
    address: "",
    principal_name: "",
    letter_head_line: "",
    current_password: "",
    password: "",
  });

  useEffect(() => {
    if (!institute) return;
    setForm((f) => ({
      ...f,
      name: institute.name || "",
      phone: institute.phone || "",
      address: institute.address || "",
      principal_name: institute.principal_name || "",
      letter_head_line: institute.letter_head_line || "",
    }));
  }, [institute]);
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
    </div>
  );
}
