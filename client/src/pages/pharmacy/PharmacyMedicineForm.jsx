// client/src/pages/pharmacy/PharmacyMedicineForm.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader, FormInput, FormSelect, FormTextarea, SectionCard } from "../../components/UI";
import { medicineCategories } from "../../data/pharmacyData";
import { ArrowLeft, Pill, Package, DollarSign, Truck, FileText, Save, X } from "lucide-react";

const defaultForm = {
  serialNumber: "",
  drugName: "",
  genericName: "",
  category: "",
  manufacturer: "",
  batchNumber: "",
  purchasePrice: "",
  sellingPrice: "",
  quantity: "",
  reorderLevel: "",
  expiryDate: "",
  supplierName: "",
  notes: "",
};

export default function PharmacyMedicineForm({ medicines, setMedicines, editMedicine, onDone }) {
  const [form, setForm] = useState(editMedicine || defaultForm);
  const navigate = useNavigate();

  const set = (field) => (val) => setForm(f => ({ ...f, [field]: val }));

  const handleSubmit = (e) => {
    e.preventDefault();
    const entry = {
      ...form,
      id: editMedicine ? editMedicine.id : Date.now(),
      purchasePrice: parseFloat(form.purchasePrice) || 0,
      sellingPrice:  parseFloat(form.sellingPrice)  || 0,
      quantity:      parseInt(form.quantity)         || 0,
      reorderLevel:  parseInt(form.reorderLevel)     || 0,
      stockHistory:  editMedicine?.stockHistory || [
        {
          id: Date.now(),
          date: new Date().toISOString().split("T")[0],
          action: "Add Stock",
          quantity: parseInt(form.quantity) || 0,
          reason: "Initial stock entry",
        },
      ],
    };
    if (editMedicine) {
      setMedicines(ms => ms.map(m => m.id === editMedicine.id ? entry : m));
    } else {
      setMedicines(ms => [...ms, entry]);
    }
    if (onDone) onDone(); else navigate("/pharmacy/medicines");
  };

  const back = () => onDone ? onDone() : navigate("/pharmacy/medicines");

  // Profit margin
  const margin = form.sellingPrice && form.purchasePrice
    ? (((parseFloat(form.sellingPrice) - parseFloat(form.purchasePrice)) / parseFloat(form.purchasePrice)) * 100).toFixed(1)
    : null;

  return (
    <div>
      <PageHeader
        title={editMedicine ? "Edit Medicine" : "Add Medicine"}
        subtitle="Pharmacy inventory management"
        action={
          <button onClick={back} className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white text-sm font-medium transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        }
      />
      <form onSubmit={handleSubmit} className="space-y-4 max-w-4xl">
        <SectionCard title="Drug Information" icon={Pill}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <FormInput label="Serial / Medicine ID" value={form.serialNumber} onChange={set("serialNumber")} placeholder="MED-001" required />
            <FormInput label="Drug Name"             value={form.drugName}     onChange={set("drugName")}     placeholder="e.g. Paracetamol 500mg" required />
            <FormInput label="Generic Name"          value={form.genericName}  onChange={set("genericName")}  placeholder="e.g. Acetaminophen" />
            <FormSelect label="Category"             value={form.category}     onChange={set("category")}     options={medicineCategories} required />
            <FormInput label="Manufacturer"          value={form.manufacturer} onChange={set("manufacturer")} placeholder="e.g. Sun Pharma" />
            <FormInput label="Batch Number"          value={form.batchNumber}  onChange={set("batchNumber")}  placeholder="e.g. BTH-2024-001" required />
          </div>
        </SectionCard>

        <SectionCard title="Pricing" icon={DollarSign}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormInput label="Purchase Price (₹)" type="number" value={form.purchasePrice} onChange={set("purchasePrice")} placeholder="0.00" required />
            <FormInput label="Selling Price (₹)"  type="number" value={form.sellingPrice}  onChange={set("sellingPrice")}  placeholder="0.00" required />
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1.5">Profit Margin</label>
              <div className={`rounded-xl px-4 py-2.5 font-bold text-lg border ${
                margin === null
                  ? "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-transparent text-slate-400 dark:text-slate-500"
                  : parseFloat(margin) >= 0
                  ? "bg-emerald-50 dark:bg-slate-800/50 border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                  : "bg-red-50 dark:bg-slate-800/50 border-red-200 dark:border-red-500/20 text-red-500 dark:text-red-400"
              }`}>
                {margin !== null ? `${margin}%` : "—"}
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Stock & Expiry" icon={Package}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <FormInput label="Quantity In Stock"    type="number" value={form.quantity}     onChange={set("quantity")}     placeholder="0" required />
            <FormInput label="Reorder Level"        type="number" value={form.reorderLevel} onChange={set("reorderLevel")} placeholder="50" />
            <FormInput label="Expiry Date"          type="date"   value={form.expiryDate}   onChange={set("expiryDate")}   required />
          </div>
        </SectionCard>

        <SectionCard title="Supplier Details" icon={Truck}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormInput label="Supplier Name" value={form.supplierName} onChange={set("supplierName")} placeholder="Distributor / Supplier name" />
          </div>
        </SectionCard>

        <SectionCard title="Notes" icon={FileText}>
          <FormTextarea label="Storage & Usage Notes" value={form.notes} onChange={set("notes")} placeholder="Storage conditions, usage instructions..." />
        </SectionCard>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="submit"
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-400 text-white font-semibold px-6 py-2.5 rounded-xl hover:scale-[1.02] transition-transform shadow-lg shadow-emerald-500/20 text-sm"
          >
            <Save className="w-4 h-4" />
            {editMedicine ? "Update Medicine" : "Add Medicine"}
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