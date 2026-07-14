// client/src/pages/opd/OPDPatientForm.jsx
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PageHeader, FormInput, FormSelect, FormTextarea, SectionCard } from "../../components/UI";
import { ArrowLeft, User, CreditCard, ClipboardList, Save, X, Bell, Loader2 } from "lucide-react";
import { api } from "../../lib/api";

const emptyForm = {
  name: "", age: "", gender: "", place: "", phone: "", fee: "",
  cash: "", upi: "", visitDate: new Date().toISOString().split("T")[0],
  notes: "", followUpDate: "", condition: "", followUpDesc: "",
  followUpStatus: "Pending",
  reminderEnabled: false, reminderStatus: "Not Set", reminderSentDate: "",
  diagnosis: "", prescription: "", doctorNotes: "",
};

// props kept backward-compatible: pass `editPatient` directly (skips the
// fetch), OR navigate to a route with an :id param and it'll load itself.
export default function OPDPatientForm({ editPatient, onDone }) {
  const { id: routeId } = useParams();
  const patientId = editPatient?.id || routeId || null;

  const [form, setForm] = useState(editPatient || emptyForm);
  const [serialNumber, setSerialNumber] = useState(editPatient?.serialNumber || null);
  const [loading, setLoading] = useState(!!patientId && !editPatient);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (!patientId || editPatient) return;
    (async () => {
      setLoading(true);
      try {
        const { patient } = await api.get(`/opd/patients/${patientId}`);
        setForm(patient);
        setSerialNumber(patient.serialNumber);
      } catch (err) {
        setError(err.message || "Could not load this patient.");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  const set = (field) => (val) => setForm(f => ({ ...f, [field]: val }));
  const cash  = parseFloat(form.cash) || 0;
  const upi   = parseFloat(form.upi)  || 0;
  const total = cash + upi;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (patientId) {
        await api.put(`/opd/patients/${patientId}`, form);
      } else {
        await api.post("/opd/patients", form);
      }
      if (onDone) onDone(); else navigate("/opd/patients");
    } catch (err) {
      setError(err.message || "Could not save this patient. Please try again.");
      setSaving(false);
    }
  };

  const back = () => onDone ? onDone() : navigate("/opd/patients");

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex items-center gap-3 text-slate-400 dark:text-slate-500 text-sm font-medium">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading patient...
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={patientId ? "Edit Patient" : "Register OPD Patient"}
        subtitle="Outpatient consultation registration"
        action={
          <button onClick={back} className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white text-sm font-medium transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        }
      />
      <form onSubmit={handleSubmit} className="space-y-4 w-full max-w-4xl mx-auto">
        {/* Token Badge */}
        <div className="flex items-center gap-3 mb-2">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-teal-50 dark:bg-teal-500/15 border border-teal-200 dark:border-teal-500/25 rounded-xl text-teal-700 dark:text-teal-400 font-mono font-bold text-sm">
            🎫 Token: {serialNumber || "Assigned after save"}
          </div>
        </div>

        {error && (
          <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-xl px-4 py-3 text-rose-600 dark:text-rose-400 text-sm font-medium">
            {error}
          </div>
        )}

        <SectionCard title="Personal Details" icon={User}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <FormInput label="Patient Name"          value={form.name}   onChange={set("name")}   placeholder="Full name"        required />
            <FormInput label="Age" type="number"     value={form.age}    onChange={set("age")}    placeholder="Age in years"     required />
            <FormSelect label="Gender"               value={form.gender} onChange={set("gender")} options={["Male","Female","Other"]} required />
            <FormInput label="Place"                 value={form.place}  onChange={set("place")}  placeholder="City / Town" />
            <FormInput label="Phone Number"          value={form.phone}  onChange={set("phone")}  placeholder="10-digit mobile" />
            <FormInput label="Consultation Fee (₹)" type="number" value={form.fee} onChange={set("fee")} placeholder="0.00" required />
          </div>
        </SectionCard>

        <SectionCard title="Payment Details" icon={CreditCard}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormInput label="Cash Amount (₹)"  type="number" value={form.cash} onChange={set("cash")} placeholder="0.00" />
            <FormInput label="UPI Amount (₹)"   type="number" value={form.upi}  onChange={set("upi")}  placeholder="0.00" />
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1.5">Total Amount</label>
              <div className="bg-emerald-50 dark:bg-slate-800/50 border border-emerald-200 dark:border-emerald-500/30 rounded-xl px-4 py-2.5 text-emerald-700 dark:text-emerald-400 font-bold text-lg">
                ₹{total.toLocaleString()}
              </div>
            </div>
          </div>
          <div className="mt-3 flex gap-2 flex-wrap">
            {cash > 0 && <span className="text-xs px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20">Cash: ₹{cash}</span>}
            {upi  > 0 && <span className="text-xs px-3 py-1 rounded-full bg-violet-50 dark:bg-violet-500/15 text-violet-700 dark:text-violet-400 border border-violet-200 dark:border-violet-500/20">UPI: ₹{upi}</span>}
            {cash === 0 && upi === 0 && <span className="text-xs text-slate-400 dark:text-slate-500">Enter cash and/or UPI amounts above</span>}
          </div>
        </SectionCard>

        <SectionCard title="Visit Details" icon={ClipboardList}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormInput label="Visit Date"      type="date"  value={form.visitDate}   onChange={set("visitDate")} />
            <FormInput label="Follow-Up Date"  type="date"  value={form.followUpDate} onChange={set("followUpDate")} />
            <FormSelect label="Condition"      value={form.condition} onChange={set("condition")} options={["Stable","Improving","Chronic","Mild","Good","Critical"]} />
            <FormSelect label="Follow-Up Status" value={form.followUpStatus} onChange={set("followUpStatus")} options={["Pending","Completed","Missed"]} />
            <FormTextarea label="Follow-Up Description" value={form.followUpDesc} onChange={set("followUpDesc")} placeholder="Follow-up instructions..." />
            <div className="sm:col-span-2">
              <FormTextarea label="Notes" value={form.notes} onChange={set("notes")} placeholder="Clinical notes..." />
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Reminder Settings" icon={Bell}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1.5">Enable WhatsApp Reminder</label>
              <div className="flex items-center gap-3 mt-1">
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, reminderEnabled: !f.reminderEnabled, reminderStatus: !f.reminderEnabled ? "Pending" : "Not Set" }))}
                  className={`relative w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none flex-shrink-0 ${
                    form.reminderEnabled ? "bg-teal-500" : "bg-slate-200 dark:bg-slate-700"
                  }`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${form.reminderEnabled ? "translate-x-6" : "translate-x-0"}`} />
                </button>
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  {form.reminderEnabled ? "Enabled" : "Disabled"}
                </span>
              </div>
            </div>
            {form.reminderEnabled && (
              <>
                <FormSelect label="Reminder Status" value={form.reminderStatus} onChange={set("reminderStatus")} options={["Pending","Sent","Failed"]} />
                <FormInput label="Reminder Sent Date" type="date" value={form.reminderSentDate} onChange={set("reminderSentDate")} />
              </>
            )}
          </div>
        </SectionCard>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-teal-500 to-cyan-400 text-white font-semibold px-6 py-2.5 rounded-xl hover:scale-[1.02] transition-transform shadow-lg shadow-teal-500/20 text-sm disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? "Saving..." : patientId ? "Update Patient" : "Register Patient"}
          </button>
          <button
            type="button"
            onClick={back}
            disabled={saving}
            className="flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 font-medium px-6 py-2.5 rounded-xl text-sm transition-colors border border-slate-200 dark:border-slate-700 disabled:opacity-60"
          >
            <X className="w-4 h-4" /> Cancel
          </button>
        </div>
      </form>
    </div>
  );
}