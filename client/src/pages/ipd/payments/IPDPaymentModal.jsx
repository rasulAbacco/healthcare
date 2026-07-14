// client/src/pages/ipd/IPDPaymentModal.jsx
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { fetchPatientPayments, addPayment } from "./api/ipdPayment.api";
import { X, IndianRupee, Clock } from "lucide-react";

const METHODS = [
  { value: "CASH", label: "Cash" },
  { value: "UPI", label: "UPI" },
  { value: "CARD", label: "Card" },
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
  { value: "OTHER", label: "Other" },
];

const fmtMoney = (n) => `₹${(n || 0).toLocaleString("en-IN")}`;
const fmtDateTime = (d) =>
  d ? new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "-";

// onClose(didChange: boolean) -- didChange tells the parent list whether to refetch
export default function IPDPaymentModal({ patientId, onClose }) {
  const [patient, setPatient] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [changed, setChanged] = useState(false);

  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("CASH");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchPatientPayments(patientId);
      setPatient(data.patient);
      setPayments(data.payments);
    } catch (err) {
      setError(err.message || "Failed to load payment details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  const handleSave = async (e) => {
    e.preventDefault();
    setError("");

    const amt = parseFloat(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setError("Enter a valid payment amount.");
      return;
    }
    if (patient && amt > patient.balance) {
      setError(`Amount cannot exceed the remaining balance of ${fmtMoney(patient.balance)}.`);
      return;
    }

    setSaving(true);
    try {
      await addPayment({
        patientId,
        amount: amt,
        method,
        referenceNumber: referenceNumber.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      setChanged(true);
      setAmount("");
      setReferenceNumber("");
      setNotes("");
      await load(); // refresh summary + history after saving
    } catch (err) {
      setError(err.message || "Failed to save payment");
    } finally {
      setSaving(false);
    }
  };

  const close = () => onClose(changed);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={close}>
      <div
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900">
          <div>
            <h3 className="font-bold text-slate-800 dark:text-white">
              {patient ? `${patient.name} — ${patient.serialNumber}` : "Loading..."}
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-500">Payment details</p>
          </div>
          <button onClick={close} className="text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {loading ? (
            <div className="text-center text-slate-400 py-8">Loading...</div>
          ) : (
            <>
              {error && (
                <div className="text-sm text-red-500 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl px-4 py-2.5">
                  {error}
                </div>
              )}

              {/* Summary */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-center">
                  <div className="font-bold text-lg text-slate-800 dark:text-white">{fmtMoney(patient?.totalStay)}</div>
                  <div className="text-xs text-slate-400">Total Bill</div>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-xl p-3 text-center">
                  <div className="font-bold text-lg text-emerald-600 dark:text-emerald-400">{fmtMoney(patient?.totalPaid)}</div>
                  <div className="text-xs text-slate-400">Paid</div>
                </div>
                <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl p-3 text-center">
                  <div className="font-bold text-lg text-red-500 dark:text-red-400">{fmtMoney(patient?.balance)}</div>
                  <div className="text-xs text-slate-400">Remaining</div>
                </div>
              </div>

              {/* Payment form */}
              {patient && patient.balance > 0 && (
                <form onSubmit={handleSave} className="space-y-3 border border-slate-100 dark:border-slate-800 rounded-xl p-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1.5">Amount (₹)</label>
                      <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        max={patient.balance}
                        min={0}
                        placeholder={`Up to ${patient.balance}`}
                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-teal-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1.5">Payment Method</label>
                      <select
                        value={method}
                        onChange={(e) => setMethod(e.target.value)}
                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-teal-500 transition-colors"
                      >
                        {METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1.5">Reference / Transaction No. (optional)</label>
                      <input
                        value={referenceNumber}
                        onChange={(e) => setReferenceNumber(e.target.value)}
                        placeholder="e.g. UPI ref, card slip no."
                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-teal-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1.5">Notes (optional)</label>
                      <input
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Any notes"
                        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-teal-500 transition-colors"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-violet-500 to-purple-400 text-white font-semibold px-4 py-2.5 rounded-xl hover:scale-[1.01] transition-transform text-sm disabled:opacity-60"
                  >
                    <IndianRupee className="w-4 h-4" /> {saving ? "Saving..." : "Save Payment"}
                  </button>
                </form>
              )}

              {/* History */}
              <div>
                <h4 className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  <Clock className="w-4 h-4" /> Payment History
                </h4>
                {payments.length === 0 ? (
                  <p className="text-sm text-slate-400 dark:text-slate-500">No payments recorded yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800">
                          <th className="py-2 pr-3 font-medium">Date</th>
                          <th className="py-2 pr-3 font-medium text-right">Amount</th>
                          <th className="py-2 pr-3 font-medium">Method</th>
                          <th className="py-2 pr-3 font-medium">Reference</th>
                          <th className="py-2 font-medium">Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payments.map((p) => (
                          <tr key={p.id} className="border-b border-slate-50 dark:border-slate-800/60">
                            <td className="py-2 pr-3 text-slate-500 dark:text-slate-400">{fmtDateTime(p.paymentDate)}</td>
                            <td className="py-2 pr-3 text-right text-emerald-600 dark:text-emerald-400 font-medium">{fmtMoney(p.amount)}</td>
                            <td className="py-2 pr-3 text-slate-700 dark:text-slate-300">{METHODS.find(m => m.value === p.method)?.label || p.method}</td>
                            <td className="py-2 pr-3 text-slate-500 dark:text-slate-400">{p.referenceNumber || "-"}</td>
                            <td className="py-2 text-slate-500 dark:text-slate-400">{p.notes || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}