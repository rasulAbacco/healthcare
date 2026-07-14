// client/src/pages/opd/OPDPatientDetails.jsx
import { useState } from "react";
import { ArrowLeft, User, CreditCard, CalendarClock, FileText, Stethoscope, Bell, Save, Loader2 } from "lucide-react";
import { SectionCard, StatusBadge } from "../../components/UI";
import { api } from "../../lib/api";

const followUpStatusColors = {
  Pending:   "bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20",
  Completed: "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20",
  Missed:    "bg-red-50 dark:bg-red-500/15 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/20",
};

const reminderStatusColors = {
  Pending: "text-amber-600 dark:text-amber-400",
  Sent:    "text-emerald-600 dark:text-emerald-400",
  Failed:  "text-red-500 dark:text-red-400",
  "Not Set": "text-slate-400 dark:text-slate-500",
};

// `onUpdated(updatedPatient)` is called after any successful save, so the
// parent list can keep its copy of this patient in sync.
export default function OPDPatientDetails({ patient: initP, onBack, onUpdated, readOnly = false }) {
  const [p, setP] = useState(initP);
  const [doctorForm, setDoctorForm] = useState({
    diagnosis: initP.diagnosis || "",
    prescription: initP.prescription || "",
    doctorNotes: initP.doctorNotes || "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);
  const [error, setError] = useState("");

  if (!p) return null;

  const persist = async (patch) => {
    const { patient: updated } = await api.put(`/opd/patients/${p.id}`, { ...p, ...patch });
    setP(updated);
    if (onUpdated) onUpdated(updated);
    return updated;
  };

  const handleDoctorSave = async () => {
    setSaving(true);
    setError("");
    try {
      await persist(doctorForm);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err.message || "Could not save notes.");
    } finally {
      setSaving(false);
    }
  };

  const handleFollowUpStatus = async (status) => {
    setStatusSaving(true);
    setError("");
    try {
      await persist({ followUpStatus: status });
    } catch (err) {
      setError(err.message || "Could not update follow-up status.");
    } finally {
      setStatusSaving(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />
        <span className="font-mono text-xs text-teal-600 dark:text-teal-400 font-bold">{p.serialNumber}</span>
        <h1 className="text-slate-800 dark:text-white font-bold text-xl break-words">{p.name}</h1>
        <StatusBadge status={p.condition || "Stable"} />
      </div>

      {error && (
        <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-xl px-4 py-3 text-rose-600 dark:text-rose-400 text-sm font-medium mb-4 max-w-5xl">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-5xl">
        <SectionCard title="Personal Information" icon={User}>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              { label: "Token No.",  val: p.serialNumber },
              { label: "Name",       val: p.name },
              { label: "Age",        val: `${p.age} years` },
              { label: "Gender",     val: p.gender },
              { label: "Place",      val: p.place },
              { label: "Phone",      val: p.phone },
              { label: "Visit Date", val: p.visitDate },
            ].map(item => (
              <div key={item.label}>
                <div className="text-slate-400 dark:text-slate-500 text-xs mb-0.5">{item.label}</div>
                <div className="text-slate-800 dark:text-white font-medium break-words">{item.val || "—"}</div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Payment Information" icon={CreditCard}>
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl p-3 text-center">
                <div className="text-amber-600 dark:text-amber-400 font-bold text-lg">₹{p.cash}</div>
                <div className="text-xs text-slate-500 dark:text-slate-500 mt-0.5">Cash</div>
              </div>
              <div className="bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20 rounded-xl p-3 text-center">
                <div className="text-violet-600 dark:text-violet-400 font-bold text-lg">₹{p.upi}</div>
                <div className="text-xs text-slate-500 dark:text-slate-500 mt-0.5">UPI</div>
              </div>
              <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-xl p-3 text-center">
                <div className="text-emerald-600 dark:text-emerald-400 font-bold text-lg">₹{p.total}</div>
                <div className="text-xs text-slate-500 dark:text-slate-500 mt-0.5">Total</div>
              </div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-100 dark:border-transparent">
              <div className="text-slate-400 dark:text-slate-500 text-xs mb-1">Consultation Fee</div>
              <div className="text-slate-800 dark:text-white font-bold text-xl">₹{p.fee}</div>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Follow-Up Information" icon={CalendarClock}>
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-slate-400 dark:text-slate-500 text-xs mb-0.5">Follow-Up Date</div>
                <div className="text-slate-800 dark:text-white font-medium">{p.followUpDate || "Not scheduled"}</div>
              </div>
              <div>
                <div className="text-slate-400 dark:text-slate-500 text-xs mb-0.5">Condition</div>
                <StatusBadge status={p.condition || "Stable"} />
              </div>
            </div>

            {/* Follow-Up Status */}
            <div>
              <div className="text-slate-400 dark:text-slate-500 text-xs mb-1.5 flex items-center gap-2">
                Follow-Up Status
                {statusSaving && <Loader2 className="w-3 h-3 animate-spin" />}
              </div>
              {!readOnly ? (
                <div className="flex gap-2 flex-wrap">
                  {["Pending", "Completed", "Missed"].map(s => (
                    <button
                      key={s}
                      disabled={statusSaving}
                      onClick={() => handleFollowUpStatus(s)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all disabled:opacity-60 ${
                        p.followUpStatus === s
                          ? followUpStatusColors[s] + " ring-1 ring-offset-1 ring-current"
                          : "bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              ) : (
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${followUpStatusColors[p.followUpStatus] || followUpStatusColors["Pending"]}`}>
                  {p.followUpStatus || "Pending"}
                </span>
              )}
            </div>

            {p.followUpDesc && (
              <div>
                <div className="text-slate-400 dark:text-slate-500 text-xs mb-0.5">Follow-Up Notes</div>
                <div className="text-slate-600 dark:text-slate-300 break-words">{p.followUpDesc}</div>
              </div>
            )}
          </div>
        </SectionCard>

        {/* Reminder Info */}
        <SectionCard title="Reminder Information" icon={Bell}>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-slate-400 dark:text-slate-500 text-xs mb-0.5">Reminder Enabled</div>
              <div className={`font-medium ${p.reminderEnabled ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500 dark:text-slate-400"}`}>
                {p.reminderEnabled ? "Yes" : "No"}
              </div>
            </div>
            <div>
              <div className="text-slate-400 dark:text-slate-500 text-xs mb-0.5">Reminder Status</div>
              <div className={`font-semibold ${reminderStatusColors[p.reminderStatus] || reminderStatusColors["Not Set"]}`}>
                {p.reminderStatus || "Not Set"}
              </div>
            </div>
            {p.reminderSentDate && (
              <div>
                <div className="text-slate-400 dark:text-slate-500 text-xs mb-0.5">Reminder Sent On</div>
                <div className="text-slate-800 dark:text-white font-medium">{p.reminderSentDate}</div>
              </div>
            )}
          </div>
        </SectionCard>

        {p.notes && (
          <SectionCard title="Clinical Notes" icon={FileText}>
            <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed break-words">{p.notes}</p>
          </SectionCard>
        )}

        {/* Doctor Section */}
        <SectionCard title="Doctor Notes & Prescription" icon={Stethoscope}>
          {readOnly ? (
            // Doctor can edit this section
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Diagnosis</label>
                <textarea
                  value={doctorForm.diagnosis}
                  onChange={e => setDoctorForm(f => ({ ...f, diagnosis: e.target.value }))}
                  placeholder="Enter diagnosis..."
                  rows={2}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-teal-500 text-sm transition-colors resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Prescription</label>
                <textarea
                  value={doctorForm.prescription}
                  onChange={e => setDoctorForm(f => ({ ...f, prescription: e.target.value }))}
                  placeholder="Enter prescription..."
                  rows={3}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-teal-500 text-sm transition-colors resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Doctor Notes</label>
                <textarea
                  value={doctorForm.doctorNotes}
                  onChange={e => setDoctorForm(f => ({ ...f, doctorNotes: e.target.value }))}
                  placeholder="Additional doctor notes..."
                  rows={2}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-teal-500 text-sm transition-colors resize-none"
                />
              </div>
              <button
                onClick={handleDoctorSave}
                disabled={saving}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-70 ${
                  saved
                    ? "bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30"
                    : "bg-teal-50 dark:bg-teal-500/20 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-500/30 hover:bg-teal-100 dark:hover:bg-teal-500/30"
                }`}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? "Saving..." : saved ? "Saved!" : "Save Notes"}
              </button>
            </div>
          ) : (
            // Receptionist: read-only view of doctor notes
            <div className="space-y-3 text-sm">
              {[
                { label: "Diagnosis",    val: p.diagnosis },
                { label: "Prescription", val: p.prescription },
                { label: "Doctor Notes", val: p.doctorNotes },
              ].map(item => (
                <div key={item.label}>
                  <div className="text-slate-400 dark:text-slate-500 text-xs mb-0.5">{item.label}</div>
                  <div className="text-slate-700 dark:text-slate-300 break-words">{item.val || <span className="text-slate-300 dark:text-slate-600 italic">Not filled yet</span>}</div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}