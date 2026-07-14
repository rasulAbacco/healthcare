// client/src/lib/api.js
// Tiny fetch wrapper: attaches the JWT automatically, throws on non-2xx
// responses with the backend's own error message, and always returns
// parsed JSON. Import `api` and use it like: api.get("/opd/patients")

const API_BASE = `${import.meta.env.VITE_API_URL || "http://localhost:4000"}/api`;

async function request(path, { method = "GET", body, ...rest } = {}) {
  const token = localStorage.getItem("hms_token");

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    ...rest,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.message || `Request failed (${res.status})`);
  }

  return data;
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: "POST", body }),
  put: (path, body) => request(path, { method: "PUT", body }),
  del: (path) => request(path, { method: "DELETE" }),
};