// client/src/pages/ipd/IPDPatientForm.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader, FormInput, FormSelect, FormTextarea, SectionCard } from "../../components/UI";
import { createPatient, updatePatient, uploadDocument, deleteDocument } from "./api/ipd.api";
import { api } from "../../lib/api";

import {
  ArrowLeft, User, BedDouble, CreditCard, BarChart3, FlaskConical,
  FileText, Save, X, Plus, Minus, Pill, Upload, Paperclip, Trash2,
  AlertTriangle, Bell,
} from "lucide-react";

const DOC_TYPES = ["Prescription", "Lab Report", "Scan Report", "Hospital Bill"];

const defaultForm = {
  name: "", age: "", gender: "", phone: "", aadhar: "",
  admissionDate: new Date().toISOString().split("T")[0],
  admissionTime: new Date().toTimeString().slice(0, 5),
  deposit: "", cash: "", upi: "", card: "",
  dailyCharges: [{ id: Date.now(), date: new Date().toISOString().split("T")[0], days: "", rate: "", amount: 0 }],
  medicines: [],
  oil: "0", protein: "0", syrup: "0",
  expectedDays: "", dischargeDate: "", dischargeTime: "",
  notes: "", dischargeStatus: "Admitted",
  // Follow-up & reminder tracking (mirrors OPD)
  followUpDate: "", condition: "", followUpDesc: "", followUpStatus: "Pending",
  reminderEnabled: false, reminderStatus: "Not Set", reminderSentDate: "",
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
    followUpDate: toDateInput(editPatient.followUpDate),
    condition: editPatient.condition || "",
    followUpDesc: editPatient.followUpDesc || "",
    followUpStatus: editPatient.followUpStatus || "Pending",
    reminderEnabled: editPatient.reminderEnabled || false,
    reminderStatus: editPatient.reminderStatus || "Not Set",
    reminderSentDate: toDateInput(editPatient.reminderSentDate),
  } : defaultForm);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");
  const navigate = useNavigate();

  // --- pharmacy medicine catalog (for the dropdown) ---
  const [medicinesList, setMedicinesList] = useState([]);
  const [medicinesLoading, setMedicinesLoading] = useState(true);

  // Medicines — staged as a simple "pick one, add it to the list" flow,
  // same UX as OPDPatientForm's Prescribed Medicines section. Unlike OPD,
  // IPD doesn't persist each item immediately (there's no per-item API) —
  // the whole medicines list is sent together when the patient form is saved.
  const [selectedMedicineId, setSelectedMedicineId] = useState("");
  const [rxQuantity, setRxQuantity] = useState("");
  const [rxDescription, setRxDescription] = useState("");
  const [rxError, setRxError] = useState("");

  useEffect(() => {
    (async () => {
      setMedicinesLoading(true);
      try {
        const { medicines } = await api.get("/pharmacy/medicines");
        setMedicinesList(medicines);
      } catch (err) {
        setRxError(err.message || "Could not load medicine list.");
      } finally {
        setMedicinesLoading(false);
      }
    })();
  }, []);

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

  // Medicines — staged as a simple "pick one, add it to the list" flow.
  const selectedMedicine = medicinesList.find(m => m.id === selectedMedicineId);

  const handleAddMedicine = () => {
    setRxError("");
    if (!selectedMedicineId) { setRxError("Select a medicine."); return; }
    const qty = parseInt(rxQuantity, 10);
    if (!qty || qty <= 0) { setRxError("Enter a valid quantity."); return; }
    if (selectedMedicine && qty > selectedMedicine.quantity) {
      setRxError(`Only ${selectedMedicine.quantity} unit(s) of ${selectedMedicine.drugName} left, but ${qty} were requested.`);
      return;
    }

    setForm(f => ({
      ...f,
      medicines: [
        ...f.medicines,
        {
          id: `temp-${Date.now()}`,
          medicineId: selectedMedicineId,
          name: selectedMedicine?.drugName || "Medicine",
          quantity: qty,
          unit: "Tablets",
          instructions: rxDescription.trim(),
        },
      ],
    }));
    setSelectedMedicineId(""); setRxQuantity(""); setRxDescription("");
  };

  const removeMedicine = (id) => setForm(f => ({ ...f, medicines: f.medicines.filter(m => m.id !== id) }));

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

    // Validate prescribed quantities against currently-known stock before saving.
    for (const m of form.medicines) {
      const available = medicinesList.find(mm => mm.id === m.medicineId)?.quantity;
      const qty = parseFloat(m.quantity) || 0;
      if (available !== undefined && qty > available) {
        setError(`"${m.name}" — only ${available} unit(s) in stock, but ${qty} were entered.`);
        return;
      }
    }

    setSaving(true);

    const payload = {
      ...form,
      age: parseInt(form.age),
      deposit: parseFloat(form.deposit) || 0,
      cash, upi, card,
      dailyCharges: form.dailyCharges.map(c => ({
        date: c.date, days: parseFloat(c.days) || 0, rate: parseFloat(c.rate) || 0, amount: parseFloat(c.amount) || 0,
      })),
      medicines: form.medicines.map(m => ({
        medicineId: m.medicineId || null,
        name: m.name,
        quantity: parseFloat(m.quantity) || 0,
        unit: m.unit || "Tablets",
        instructions: m.instructions || "",
      })),
      oil:     parseInt(form.oil)     || 0,
      protein: parseInt(form.protein) || 0,
      syrup:   parseInt(form.syrup)   || 0,
      // Follow-up & reminder tracking
      followUpDate: form.followUpDate || "",
      condition: form.condition || "",
      followUpDesc: form.followUpDesc || "",
      followUpStatus: form.followUpStatus || "Pending",
      reminderEnabled: !!form.reminderEnabled,
      reminderStatus: form.reminderEnabled ? (form.reminderStatus || "Pending") : "Not Set",
      reminderSentDate: form.reminderSentDate || "",
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

          {/* Follow-up & reminder tracking — mirrors OPD's Visit/Reminder fields */}
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-slate-600 dark:text-slate-300">
              <Bell className="w-4 h-4" /> Follow-Up & Reminder
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <FormInput label="Follow-Up Date" type="date" value={form.followUpDate} onChange={set("followUpDate")} />
              <FormSelect label="Condition" value={form.condition} onChange={set("condition")} options={["Stable","Improving","Chronic","Mild","Good","Critical"]} />
              <FormSelect label="Follow-Up Status" value={form.followUpStatus} onChange={set("followUpStatus")} options={["Pending","Completed","Missed"]} />
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
              <div className="sm:col-span-2 lg:col-span-2">
                <FormTextarea label="Follow-Up Description" value={form.followUpDesc} onChange={set("followUpDesc")} placeholder="Follow-up instructions..." />
              </div>
              {form.reminderEnabled && (
                <>
                  <FormSelect label="Reminder Status" value={form.reminderStatus} onChange={set("reminderStatus")} options={["Pending","Sent","Failed"]} />
                  <FormInput label="Reminder Sent Date" type="date" value={form.reminderSentDate} onChange={set("reminderSentDate")} />
                </>
              )}
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Prescribed Medicines" icon={Pill}>
          <div className="space-y-4">
            {rxError && (
              <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-xl px-3 py-2.5 text-rose-600 dark:text-rose-400 text-xs font-medium flex items-start gap-2">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <span>{rxError}</span>
              </div>
            )}

            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Medicine</label>
                  <select
                    value={selectedMedicineId}
                    onChange={e => { setSelectedMedicineId(e.target.value); setRxError(""); }}
                    disabled={medicinesLoading}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-white text-sm focus:outline-none focus:border-teal-500 transition-colors disabled:opacity-60"
                  >
                    <option value="">{medicinesLoading ? "Loading..." : "Select..."}</option>
                    {medicinesList.map(m => (
                      <option key={m.id} value={m.id} disabled={m.quantity <= 0}>
                        {m.drugName} ({m.quantity <= 0 ? "Out of stock" : `${m.quantity} in stock`})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Quantity</label>
                  <input
                    type="number"
                    value={rxQuantity}
                    onChange={e => { setRxQuantity(e.target.value); setRxError(""); }}
                    placeholder="e.g. 10"
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:border-teal-500 transition-colors"
                  />
                  {selectedMedicine && (
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">{selectedMedicine.quantity} available</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Description (optional)</label>
                  <input
                    type="text"
                    value={rxDescription}
                    onChange={e => setRxDescription(e.target.value)}
                    placeholder="e.g. 1-0-1 after food for 5 days"
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:border-teal-500 transition-colors"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={handleAddMedicine}
                className="flex items-center gap-2 bg-gradient-to-r from-teal-500 to-cyan-400 text-white font-semibold px-4 py-2 rounded-xl hover:scale-[1.02] transition-transform shadow-lg shadow-teal-500/20 text-sm"
              >
                <Plus className="w-4 h-4" /> Add Tablet
              </button>
            </div>

            {form.medicines.length === 0 ? (
              <p className="text-slate-400 dark:text-slate-500 text-sm text-center py-2">No tablets added yet.</p>
            ) : (
              <div className="space-y-2">
                {form.medicines.map(item => (
                  <div key={item.id} className="flex items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5">
                    <div className="min-w-0">
                      <div className="text-slate-800 dark:text-white font-medium text-sm truncate">
                        {item.name} × {item.quantity}
                      </div>
                      {item.instructions && (
                        <div className="text-slate-400 dark:text-slate-500 text-xs truncate">{item.instructions}</div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeMedicine(item.id)}
                      className="flex-shrink-0 p-2 rounded-lg text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 border border-red-100 dark:border-red-500/10 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <p className="text-[11px] text-slate-400 dark:text-slate-500 flex items-start gap-1.5">
              <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" />
              Stock reduces once you submit this form and the patient is registered.
            </p>
          </div>
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