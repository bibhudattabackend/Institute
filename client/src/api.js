const base = import.meta.env.VITE_API_URL || "";

function authHeader() {
  const t = localStorage.getItem("token");
  return t ? { Authorization: `Bearer ${t}` } : {};
}

export async function api(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...authHeader(),
    ...options.headers,
  };
  const res = await fetch(`${base}${path}`, { ...options, headers });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { error: text || "Invalid response" };
  }
  if (!res.ok) {
    const err = new Error(data?.error || res.statusText || "Request failed");
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

/** Multipart upload (field name: photo) */
export async function apiUpload(path, formData) {
  const res = await fetch(`${base}${path}`, {
    method: "POST",
    headers: authHeader(),
    body: formData,
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { error: text || "Invalid response" };
  }
  if (!res.ok) {
    const err = new Error(data?.error || res.statusText || "Upload failed");
    err.status = res.status;
    throw err;
  }
  return data;
}
