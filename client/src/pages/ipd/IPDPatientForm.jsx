// client/src/pages/ipd/IPDPatientForm.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader, FormInput, FormSelect, FormTextarea, SectionCard } from "../../components/UI";
import {
  ArrowLeft, User, BedDouble, CreditCard, BarChart3, FlaskConical,
  FileText, Save, X, Plus, Minus, Pill,
} from "lucide-react";

const emptyPeriod   = { days: "", rate: "", amount: 0 };
const emptyMedicine = { id: Date.now(), name: "", quantity: "", unit: "Tablets" };
const UNITS = ["Tablets", "Capsules", "Boxes", "Bottles", "Strips", "Injections", "Sachets", "ml", "Other"];

const defaultForm = {
  name: "", age: "", gender: "", phone: "", aadhar: "",
  admissionDate: new Date().toISOString().split("T")[0],
  admissionTime: new Date().toTimeString().slice(0, 5),
  deposit: "", cash: "", upi: "", card: "",
  dailyCharges: [{ id: Date.now(), date: new Date().toISOString().split("T")[0], days: "", rate: "", amount: 0 }],
  stayPeriods: [{ ...emptyPeriod }],
  medicines: [{ id: Date.now(), name: "", quantity: "", unit: "Tablets" }],
  oil: "0", protein: "0", syrup: "0",
  expectedDays: "", dischargeDate: "", dischargeTime: "",
  notes: "", status: "Admitted", dischargeStatus: "Admitted",
};

function generateSerial(patients) {
  const nums = patients
    .map(p => p.serialNumber)
    .filter(Boolean)
    .map(s => parseInt(s.replace("IPD-", "")) || 0);
  const next = nums.length ? Math.max(...nums) + 1 : 1;
  return `IPD-${String(next).padStart(3, "0")}`;
}

function calcSettlement(totalStay, totalPaid) {
  if (totalPaid === 0) return "Pending";
  if (totalPaid >= totalStay) return "Fully Paid";
  return "Partially Paid";
}

export default function IPDPatientForm({ patients, setPatients, editPatient, onDone }) {
  const [form, setForm] = useState(editPatient ? {
    ...editPatient,
    card: editPatient.card || 0,
    dailyCharges: editPatient.dailyCharges || editPatient.stayPeriods?.map((p, i) => ({
      id: i + 1,
      date: editPatient.admissionDate || "",
      days: p.days, rate: p.rate, amount: p.amount,
    })) || [],
    medicines: editPatient.medicines || [],
  } : defaultForm);
  const navigate = useNavigate();

  const serialNumber = editPatient?.serialNumber || generateSerial(patients);

  const set = (field) => (val) => setForm(f => ({ ...f, [field]: val }));

  const cash     = parseFloat(form.cash) || 0;
  const upi      = parseFloat(form.upi)  || 0;
  const card     = parseFloat(form.card) || 0;
  const totalPaid = cash + upi + card;

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

  const handleSubmit = (e) => {
    e.preventDefault();
    const stayPeriods = form.dailyCharges.map(c => ({ days: parseFloat(c.days) || 0, rate: parseFloat(c.rate) || 0, amount: parseFloat(c.amount) || 0 }));
    const entry = {
      ...form,
      serialNumber,
      id: editPatient ? editPatient.id : Date.now(),
      age: parseInt(form.age),
      deposit: parseFloat(form.deposit) || 0,
      cash, upi, card, totalPaid, totalStay,
      balance,
      settlementStatus: calcSettlement(totalStay, totalPaid),
      stayPeriods,
      dailyCharges: form.dailyCharges.map((c, i) => ({ ...c, id: c.id || i + 1 })),
      medicines: form.medicines.filter(m => m.name.trim()).map(m => ({
        ...m,
        quantity: parseFloat(m.quantity) || 0,
      })),
      oil:     parseInt(form.oil)     || 0,
      protein: parseInt(form.protein) || 0,
      syrup:   parseInt(form.syrup)   || 0,
      documents: editPatient?.documents || [],
      aadharDocument: editPatient?.aadharDocument || null,
    };
    editPatient
      ? setPatients(ps => ps.map(p => p.id === editPatient.id ? entry : p))
      : setPatients(ps => [...ps, entry]);
    if (onDone) onDone(); else navigate("/ipd/patients");
  };

  const back = () => onDone ? onDone() : navigate("/ipd/patients");

  return (
    <div>
      <PageHeader
        title={editPatient ? "Edit Patient" : "Admit Patient"}
        subtitle="Inpatient admission form"
        action={
          <button onClick={back} className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white text-sm font-medium transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        }
      />
      <form onSubmit={handleSubmit} className="space-y-4 max-w-4xl">
        {/* Serial Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-violet-50 dark:bg-violet-500/15 border border-violet-200 dark:border-violet-500/25 rounded-xl text-violet-700 dark:text-violet-400 font-mono font-bold text-sm">
          🏥 IPD No: {serialNumber}
        </div>

        <SectionCard title="Personal Details" icon={User}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <FormInput label="Patient Name"   value={form.name}   onChange={set("name")}   placeholder="Full name"      required />
            <FormInput label="Age" type="number" value={form.age} onChange={set("age")}    placeholder="Age"            required />
            <FormSelect label="Gender"         value={form.gender} onChange={set("gender")} options={["Male","Female","Other"]} required />
            <FormInput label="Phone Number"   value={form.phone}  onChange={set("phone")}  placeholder="Mobile number" />
            <FormInput label="Aadhar Number"  value={form.aadhar} onChange={set("aadhar")} placeholder="XXXX-XXXX-XXXX" />
            <FormSelect label="Discharge Status" value={form.dischargeStatus} onChange={set("dischargeStatus")} options={["Admitted","Ready For Discharge","Discharged"]} />
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

        <SectionCard title="Payment Details" icon={CreditCard}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <FormInput label="Deposit Amount (₹)" type="number" value={form.deposit} onChange={set("deposit")} placeholder="0.00" />
            <FormInput label="Cash Amount (₹)"    type="number" value={form.cash}    onChange={set("cash")}    placeholder="0.00" />
            <FormInput label="UPI Amount (₹)"     type="number" value={form.upi}     onChange={set("upi")}     placeholder="0.00" />
            <FormInput label="Card Amount (₹)"    type="number" value={form.card}    onChange={set("card")}    placeholder="0.00" />
          </div>
          <div className="grid grid-cols-4 gap-3">
            {[
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

        <SectionCard title="Notes" icon={FileText}>
          <FormTextarea label="Clinical Notes" value={form.notes} onChange={set("notes")} placeholder="Additional notes..." />
        </SectionCard>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="submit"
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-violet-500 to-purple-400 text-white font-semibold px-6 py-2.5 rounded-xl hover:scale-[1.02] transition-transform shadow-lg shadow-violet-500/20 text-sm"
          >
            <Save className="w-4 h-4" />
            {editPatient ? "Update Patient" : "Admit Patient"}
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