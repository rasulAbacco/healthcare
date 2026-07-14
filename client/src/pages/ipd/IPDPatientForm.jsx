// client/src/pages/ipd/IPDPatientForm.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader, FormInput, FormSelect, FormTextarea, SectionCard } from "../../components/UI";
import { createPatient, updatePatient, uploadDocument, deleteDocument } from "./api/ipd.api";
import {
  ArrowLeft, User, BedDouble, CreditCard, BarChart3, FlaskConical,
  FileText, Save, X, Plus, Minus, Pill, Upload, Paperclip, Trash2,
} from "lucide-react";

const UNITS = ["Tablets", "Capsules", "Boxes", "Bottles", "Strips", "Injections", "Sachets", "ml", "Other"];
const DOC_TYPES = ["Prescription", "Lab Report", "Scan Report", "Hospital Bill"];

const defaultForm = {
  name: "", age: "", gender: "", phone: "", aadhar: "",
  admissionDate: new Date().toISOString().split("T")[0],
  admissionTime: new Date().toTimeString().slice(0, 5),
  deposit: "", cash: "", upi: "", card: "",
  dailyCharges: [{ id: Date.now(), date: new Date().toISOString().split("T")[0], days: "", rate: "", amount: 0 }],
  medicines: [{ id: Date.now(), name: "", quantity: "", unit: "Tablets" }],
  oil: "0", protein: "0", syrup: "0",
  expectedDays: "", dischargeDate: "", dischargeTime: "",
  notes: "", dischargeStatus: "Admitted",
};

// converts a backend datetime string ("2026-07-13T00:00:00.000Z") into a plain "YYYY-MM-DD" for <input type=date>
const toDateInput = (d) => (d ? new Date(d).toISOString().split("T")[0] : "");

export default function IPDPatientForm({ editPatient, onDone }) {
  const [form, setForm] = useState(editPatient ? {
    ...editPatient,
    admissionDate: toDateInput(editPatient.admissionDate),
    dischargeDate: toDateInput(editPatient.dischargeDate),
    card: editPatient.card || 0,
    dailyCharges: (editPatient.dailyCharges || []).map(c => ({ ...c, date: toDateInput(c.date) })),
    medicines: editPatient.medicines || [],
  } : defaultForm);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");
  const navigate = useNavigate();

  // --- documents ---
  // existingDocs: docs already saved on the patient (only present when editing)
  const [existingDocs, setExistingDocs] = useState(editPatient?.documents || []);
  // pendingDocs: files picked in this session, not yet uploaded (uploaded after save succeeds)
  const [pendingDocs, setPendingDocs] = useState([]);
  const [docType, setDocType] = useState(DOC_TYPES[0]);
  const [deletingDocId, setDeletingDocId] = useState(null);

  const serialNumber = editPatient?.serialNumber || "Auto-generated on save";

  const set = (field) => (val) => setForm(f => ({ ...f, [field]: val }));

  const deposit  = parseFloat(form.deposit) || 0;
  const cash     = parseFloat(form.cash) || 0;
  const upi      = parseFloat(form.upi)  || 0;
  const card     = parseFloat(form.card) || 0;
  const totalPaid = deposit + cash + upi + card;

  // Daily Charges
  const updateCharge = (i, field, val) => {
    const charges = [...form.dailyCharges];
    charges[i] = { ...charges[i], [field]: val };
    charges[i].amount = (parseFloat(charges[i].days) || 0) * (parseFloat(charges[i].rate) || 0);
    setForm(f => ({ ...f, dailyCharges: charges }));
  };
  const addCharge    = () => setForm(f => ({
    ...f,
    dailyCharges: [...f.dailyCharges, { id: Date.now(), date: new Date().toISOString().split("T")[0], days: "", rate: "", amount: 0 }],
  }));
  const removeCharge = (i) => setForm(f => ({ ...f, dailyCharges: f.dailyCharges.filter((_, idx) => idx !== i) }));

  const totalStay = form.dailyCharges.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
  const balance   = Math.max(0, totalStay - totalPaid);

  // Medicines
  const updateMedicine = (i, field, val) => {
    const meds = [...form.medicines];
    meds[i] = { ...meds[i], [field]: val };
    setForm(f => ({ ...f, medicines: meds }));
  };
  const addMedicine    = () => setForm(f => ({ ...f, medicines: [...f.medicines, { id: Date.now(), name: "", quantity: "", unit: "Tablets" }] }));
  const removeMedicine = (i) => setForm(f => ({ ...f, medicines: f.medicines.filter((_, idx) => idx !== i) }));

  // Documents
  const handleFilePick = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setPendingDocs(list => [
      ...list,
      ...files.map(file => ({ id: `${Date.now()}-${file.name}`, file, type: docType })),
    ]);
    e.target.value = ""; // allow re-picking same file
  };
  const removePendingDoc = (id) => setPendingDocs(list => list.filter(d => d.id !== id));

  const handleDeleteExistingDoc = async (docId) => {
    if (!editPatient?.id) return;
    setDeletingDocId(docId);
    try {
      await deleteDocument(editPatient.id, docId);
      setExistingDocs(docs => docs.filter(d => d.id !== docId));
    } catch (err) {
      setError(err.message || "Failed to delete document");
    } finally {
      setDeletingDocId(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);

    const payload = {
      ...form,
      age: parseInt(form.age),
      deposit: parseFloat(form.deposit) || 0,
      cash, upi, card,
      dailyCharges: form.dailyCharges.map(c => ({
        date: c.date, days: parseFloat(c.days) || 0, rate: parseFloat(c.rate) || 0, amount: parseFloat(c.amount) || 0,
      })),
      medicines: form.medicines.filter(m => m.name.trim()).map(m => ({
        ...m, quantity: parseFloat(m.quantity) || 0,
      })),
      oil:     parseInt(form.oil)     || 0,
      protein: parseInt(form.protein) || 0,
      syrup:   parseInt(form.syrup)   || 0,
    };

    try {
      // 1. Save the patient record first (create or update)
      const saved = editPatient
        ? await updatePatient(editPatient.id, payload)
        : await createPatient(payload);

      // 2. Upload any newly-picked documents against the saved patient's id
      if (pendingDocs.length) {
        for (const doc of pendingDocs) {
          await uploadDocument(saved.id, doc.file, doc.type);
        }
      }

      if (onDone) onDone(); else navigate("/ipd/patients");
    } catch (err) {
      setError(err.message || "Failed to save patient");
    } finally {
      setSaving(false);
    }
  };

  const back = () => onDone ? onDone() : navigate("/ipd/patients");

  return (
    <div>
      <div className="grid grid-cols-3 items-center mb-2">
        <div>
        </div>

        <div className="text-center">
          <h1 className="text-xl font-bold text-slate-800 dark:text-white">
            {editPatient ? "Edit Patient" : "Admit Patient"}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Inpatient admission form</p>
        </div>

        <div /> {/* empty spacer so the grid keeps the title truly centered */}
      </div>
      <form onSubmit={handleSubmit} className="space-y-4 max-w-5xl mx-auto">
        {/* Serial Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-violet-50 dark:bg-violet-500/15 border border-violet-200 dark:border-violet-500/25 rounded-xl text-violet-700 dark:text-violet-400 font-mono font-bold text-sm">
          🏥 IPD No: {serialNumber}
        </div>

        {error && (
          <div className="text-sm text-red-500 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl px-4 py-2.5">
            {error}
          </div>
        )}

        <SectionCard title="Personal Details" icon={User}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <FormInput label="Patient Name"   value={form.name}   onChange={set("name")}   placeholder="Full name"      required />
            <FormInput label="Age" type="number" value={form.age} onChange={set("age")}    placeholder="Age"            required />
            <FormSelect label="Gender"         value={form.gender} onChange={set("gender")} options={["Male","Female","Other"]} required />
            <FormInput label="Phone Number"   value={form.phone}  onChange={set("phone")}  placeholder="Mobile number" />
            <FormInput label="Aadhar Number"  value={form.aadhar} onChange={set("aadhar")} placeholder="XXXX-XXXX-XXXX" />
          </div>
        </SectionCard>

        <SectionCard title="Admission Details" icon={BedDouble}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <FormInput label="Admission Date"        type="date"   value={form.admissionDate}  onChange={set("admissionDate")} />
            <FormInput label="Admission Time"        type="time"   value={form.admissionTime}  onChange={set("admissionTime")} />
            <FormInput label="Expected Stay (Days)"  type="number" value={form.expectedDays}   onChange={set("expectedDays")}  placeholder="Days" />
            <FormInput label="Discharge Date"        type="date"   value={form.dischargeDate}  onChange={set("dischargeDate")} />
            <FormInput label="Discharge Time"        type="time"   value={form.dischargeTime}  onChange={set("dischargeTime")} />
          </div>
        </SectionCard>

        <SectionCard title="Medicines" icon={Pill}>
          <div className="space-y-3 mb-4">
            {form.medicines.map((med, i) => (
              <div key={med.id || i} className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-end p-3 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-transparent">
                <div className="sm:col-span-2">
                  <FormInput label={`Medicine ${i + 1}`} value={med.name} onChange={v => updateMedicine(i, "name", v)} placeholder="Medicine name" />
                </div>
                <FormInput label="Quantity" type="number" value={med.quantity} onChange={v => updateMedicine(i, "quantity", v)} placeholder="0" />
                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1.5">Unit</label>
                  <select
                    value={med.unit}
                    onChange={e => updateMedicine(i, "unit", e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-slate-800 dark:text-white text-sm focus:outline-none focus:border-teal-500 transition-colors"
                  >
                    {UNITS.map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
                {form.medicines.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeMedicine(i)}
                    className="flex items-center gap-1.5 text-red-500 dark:text-red-400 hover:text-red-600 text-sm pb-2.5 transition-colors col-span-2 sm:col-span-1"
                  >
                    <Minus className="w-4 h-4" /> Remove
                  </button>
                )}
              </div>
            ))}
          </div>
          <button type="button" onClick={addMedicine} className="flex items-center gap-1.5 text-violet-600 dark:text-violet-400 hover:text-violet-700 text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" /> Add Medicine
          </button>
        </SectionCard>

        <SectionCard title="Legacy Items (Optional)" icon={FlaskConical}>
          <div className="grid grid-cols-3 gap-4">
            <FormInput label="Oil (Units)"     type="number" value={form.oil}     onChange={set("oil")}     placeholder="0" />
            <FormInput label="Protein (Units)" type="number" value={form.protein} onChange={set("protein")} placeholder="0" />
            <FormInput label="Syrup (Units)"   type="number" value={form.syrup}   onChange={set("syrup")}   placeholder="0" />
          </div>
        </SectionCard>

        <SectionCard title="Documents" icon={Paperclip}>
          {/* Already-saved documents (edit mode only) */}
          {existingDocs.length > 0 && (
            <div className="space-y-2 mb-4">
              {existingDocs.map(doc => (
                <div key={doc.id} className="flex items-center justify-between gap-3 p-3 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-transparent">
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 hover:text-violet-600 dark:hover:text-violet-400 truncate"
                  >
                    <FileText className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{doc.name}</span>
                    <span className="text-xs text-slate-400 dark:text-slate-500 flex-shrink-0">({doc.type})</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => handleDeleteExistingDoc(doc.id)}
                    disabled={deletingDocId === doc.id}
                    className="flex items-center gap-1 text-red-500 dark:text-red-400 hover:text-red-600 text-xs flex-shrink-0 disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> {deletingDocId === doc.id ? "Removing..." : "Remove"}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Files picked in this session, not yet uploaded */}
          {pendingDocs.length > 0 && (
            <div className="space-y-2 mb-4">
              {pendingDocs.map(doc => (
                <div key={doc.id} className="flex items-center justify-between gap-3 p-3 bg-violet-50 dark:bg-violet-500/10 rounded-xl border border-violet-200 dark:border-violet-500/20">
                  <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 truncate">
                    <Paperclip className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{doc.file.name}</span>
                    <span className="text-xs text-slate-400 dark:text-slate-500 flex-shrink-0">({doc.type}) — pending upload</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removePendingDoc(doc.id)}
                    className="flex items-center gap-1 text-red-500 dark:text-red-400 hover:text-red-600 text-xs flex-shrink-0"
                  >
                    <X className="w-3.5 h-3.5" /> Remove
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
            <div className="flex-1 w-full">
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1.5">Document Type</label>
              <select
                value={docType}
                onChange={e => setDocType(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-slate-800 dark:text-white text-sm focus:outline-none focus:border-teal-500 transition-colors"
              >
                {DOC_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <label className="flex items-center justify-center gap-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 font-medium px-4 py-2.5 rounded-xl text-sm transition-colors border border-slate-200 dark:border-slate-700 cursor-pointer whitespace-nowrap">
              <Upload className="w-4 h-4" /> Choose File
              <input type="file" className="hidden" onChange={handleFilePick} accept=".pdf,.jpg,.jpeg,.png" />
            </label>
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
            Files are uploaded automatically once you save this patient below.
          </p>
        </SectionCard>

        <SectionCard title="Daily Charge History" icon={BarChart3}>
          <div className="space-y-3 mb-4">
            {form.dailyCharges.map((charge, i) => (
              <div key={charge.id || i} className="grid grid-cols-2 sm:grid-cols-5 gap-3 items-end p-3 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-transparent">
                <FormInput label={`Entry ${i + 1} — Date`} type="date" value={charge.date} onChange={v => updateCharge(i, "date", v)} />
                <FormInput label="Days"       type="number" value={charge.days} onChange={v => updateCharge(i, "days", v)} placeholder="Days" />
                <FormInput label="Rate/Day (₹)" type="number" value={charge.rate} onChange={v => updateCharge(i, "rate", v)} placeholder="Rate" />
                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1.5">Amount</label>
                  <div className="bg-emerald-50 dark:bg-slate-800 border border-emerald-200 dark:border-emerald-500/20 rounded-xl px-4 py-2.5 text-emerald-700 dark:text-emerald-400 font-bold">
                    ₹{(charge.amount || 0).toLocaleString()}
                  </div>
                </div>
                {form.dailyCharges.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeCharge(i)}
                    className="flex items-center gap-1.5 text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 text-sm pb-2.5 transition-colors"
                  >
                    <Minus className="w-4 h-4" /> Remove
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between">
            <button type="button" onClick={addCharge} className="flex items-center gap-1.5 text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 text-sm font-medium transition-colors">
              <Plus className="w-4 h-4" /> Add Entry
            </button>
            <div className="text-right">
              <div className="text-slate-400 dark:text-slate-500 text-xs">Total Stay Charge</div>
              <div className="text-slate-800 dark:text-white font-bold text-xl">₹{totalStay.toLocaleString()}</div>
              {balance > 0 && <div className="text-red-500 dark:text-red-400 text-xs">Balance: ₹{balance.toLocaleString()}</div>}
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Payment Details" icon={CreditCard}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <FormInput label="Deposit Amount (₹)" type="number" value={form.deposit} onChange={set("deposit")} placeholder="0.00" />
            <FormInput label="Cash Amount (₹)"    type="number" value={form.cash}    onChange={set("cash")}    placeholder="0.00" />
            <FormInput label="UPI Amount (₹)"     type="number" value={form.upi}     onChange={set("upi")}     placeholder="0.00" />
            <FormInput label="Card Amount (₹)"    type="number" value={form.card}    onChange={set("card")}    placeholder="0.00" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              { label: "Deposit",    val: deposit,    color: "text-sky-600 dark:text-sky-400",        bg: "bg-sky-50 dark:bg-slate-800/50 border-sky-200 dark:border-sky-500/20" },
              { label: "Cash",       val: cash,       color: "text-amber-600 dark:text-amber-400",    bg: "bg-amber-50 dark:bg-slate-800/50 border-amber-200 dark:border-amber-500/20" },
              { label: "UPI",        val: upi,        color: "text-violet-600 dark:text-violet-400",  bg: "bg-violet-50 dark:bg-slate-800/50 border-violet-200 dark:border-violet-500/20" },
              { label: "Card",       val: card,       color: "text-blue-600 dark:text-blue-400",      bg: "bg-blue-50 dark:bg-slate-800/50 border-blue-200 dark:border-blue-500/20" },
              { label: "Total Paid", val: totalPaid,  color: "text-emerald-600 dark:text-emerald-400",bg: "bg-emerald-50 dark:bg-slate-800/50 border-emerald-200 dark:border-emerald-500/20" },
            ].map(item => (
              <div key={item.label} className={`${item.bg} border rounded-xl p-3 text-center`}>
                <div className={`font-bold text-lg ${item.color}`}>₹{item.val.toLocaleString()}</div>
                <div className="text-xs text-slate-500 dark:text-slate-500">{item.label}</div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Notes" icon={FileText}>
          <FormTextarea label="Clinical Notes" value={form.notes} onChange={set("notes")} placeholder="Additional notes..." />
        </SectionCard>

        <SectionCard title="Patient Status" icon={BedDouble}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <FormSelect
              label="Status"
              value={form.dischargeStatus}
              onChange={set("dischargeStatus")}
              options={["Admitted", "Discharged"]}
            />
          </div>
        </SectionCard>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-violet-500 to-purple-400 text-white font-semibold px-6 py-2.5 rounded-xl hover:scale-[1.02] transition-transform shadow-lg shadow-violet-500/20 text-sm disabled:opacity-60 disabled:hover:scale-100"
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving..." : editPatient ? "Update Patient" : "Admit Patient"}
          </button>
          <button
            type="button"
            onClick={back}
            className="flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 font-medium px-6 py-2.5 rounded-xl text-sm transition-colors border border-slate-200 dark:border-slate-700"
          >
            <X className="w-4 h-4" /> Cancel
          </button>
        </div>
      </form>
    </div>
  );
}