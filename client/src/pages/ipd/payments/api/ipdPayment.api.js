// client/src/api/ipdPayment.api.js
const HOST = import.meta.env.VITE_API_URL || "http://localhost:4000";
const PAYMENTS_URL = `${HOST}/api/ipd-payments`;

async function handle(res) {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `Request failed (${res.status})`);
  }
  return res.json();
}

// One row per patient, for the Payment List page
export function fetchPaymentSummary({ search = "", status = "" } = {}) {
  const params = new URLSearchParams({ search, status });
  return fetch(`${PAYMENTS_URL}/summary?${params}`).then(handle);
}

// { patient, payments } for one patient's Pay Now / History modal
export function fetchPatientPayments(patientId) {
  return fetch(`${PAYMENTS_URL}/patient/${patientId}`).then(handle);
}

export function addPayment(payload) {
  return fetch(PAYMENTS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).then(handle);
}

export function updatePayment(id, payload) {
  return fetch(`${PAYMENTS_URL}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).then(handle);
}

export function deletePayment(id) {
  return fetch(`${PAYMENTS_URL}/${id}`, { method: "DELETE" }).then(handle);
}