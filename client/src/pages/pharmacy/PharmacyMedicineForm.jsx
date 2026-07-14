// client/src/pages/pharmacy/PharmacyMedicineForm.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader, FormInput, FormSelect, FormTextarea, SectionCard } from "../../components/UI";
import { ArrowLeft, Pill, Package, DollarSign, Truck, FileText, Save, X, Plus, Loader2 } from "lucide-react";
import { api } from "../../lib/api";

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

// Small inline modal for adding a new category on the fly, without leaving
// the Add Medicine form. Kept in this file since it's only used here for now.
function AddCategoryModal({ onCancel, onCreated }) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    if (!name.trim()) { setError("Enter a category name."); return; }
    setSaving(true);
    setError("");
    try {
      const { category } = await api.post("/pharmacy/categories", { name: name.trim() });
      onCreated(category);
    } catch (err) {
      setError(err.message || "Could not create category.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
        <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center mb-4">
          <Plus className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h3 className="text-slate-800 dark:text-white font-bold text-lg mb-1">Add Category</h3>
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">
          Create a new medicine category. It'll be available immediately in the dropdown.
        </p>
        <input
          autoFocus
          type="text"
          value={name}
          onChange={e => { setName(e.target.value); setError(""); }}
          onKeyDown={e => e.key === "Enter" && handleSave()}
          placeholder="e.g. Antiviral"
          className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-teal-500 text-sm transition-colors mb-2"
        />
        {error && <p className="text-red-500 dark:text-red-400 text-xs font-medium mb-2">{error}</p>}
        <div className="flex gap-3 mt-3">
          <button
            onClick={onCancel}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors font-medium text-sm border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <X className="w-4 h-4" /> Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white transition-colors font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PharmacyMedicineForm({ medicines, setMedicines, editMedicine, onDone }) {
  const [form, setForm] = useState(editMedicine || defaultForm);
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const fetchCategories = async () => {
    setCategoriesLoading(true);
    try {
      const { categories: data } = await api.get("/pharmacy/categories");
      setCategories(data);
    } catch (err) {
      setError(err.message || "Could not load categories.");
    } finally {
      setCategoriesLoading(false);
    }
  };

  useEffect(() => { fetchCategories(); }, []);

  const set = (field) => (val) => setForm(f => ({ ...f, [field]: val }));

  const handleCategoryCreated = (category) => {
    setCategories(cats => [...cats, category].sort((a, b) => a.name.localeCompare(b.name)));
    setForm(f => ({ ...f, category: category.name })); // auto-select the new one
    setShowAddCategory(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    if (editMedicine) {
      // Editing still uses the old local-state approach for now — the
      // Medicine list/update/delete backend endpoints come with the next
      // round of work on PharmacyMedicineList.jsx.
      const entry = {
        ...form,
        id: editMedicine.id,
        purchasePrice: parseFloat(form.purchasePrice) || 0,
        sellingPrice: parseFloat(form.sellingPrice) || 0,
        quantity: parseInt(form.quantity) || 0,
        reorderLevel: parseInt(form.reorderLevel) || 0,
        stockHistory: editMedicine.stockHistory || [],
      };
      setMedicines(ms => ms.map(m => m.id === editMedicine.id ? entry : m));
      setSaving(false);
      if (onDone) onDone(); else navigate("/pharmacy/medicines");
      return;
    }

    try {
      await api.post("/pharmacy/medicines", form);
      if (onDone) onDone(); else navigate("/pharmacy/medicines");
    } catch (err) {
      setError(err.message || "Could not add this medicine. Please try again.");
      setSaving(false);
    }
  };

  const back = () => onDone ? onDone() : navigate("/pharmacy/medicines");

  // Profit margin
  const margin = form.sellingPrice && form.purchasePrice
    ? (((parseFloat(form.sellingPrice) - parseFloat(form.purchasePrice)) / parseFloat(form.purchasePrice)) * 100).toFixed(1)
    : null;

  return (
    <div className="w-full px-2 sm:px-4 max-w-6xl mx-auto">
      <PageHeader
        title={editMedicine ? "Edit Medicine" : "Add Medicine"}
        subtitle="Pharmacy inventory management"
        action={
          <button onClick={back} className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white text-sm font-medium transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        }
      />

      {error && (
        <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-xl px-4 py-3 text-rose-600 dark:text-rose-400 text-sm font-medium mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 w-full">
        <SectionCard title="Drug Information" icon={Pill}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <FormInput label="Serial / Medicine ID" value={form.serialNumber} onChange={set("serialNumber")} placeholder="MED-001" required />
            <FormInput label="Drug Name"             value={form.drugName}     onChange={set("drugName")}     placeholder="e.g. Paracetamol 500mg" required />
            <FormInput label="Generic Name"          value={form.genericName}  onChange={set("genericName")}  placeholder="e.g. Acetaminophen" />

            {/* Category — dynamic dropdown + inline Add Category button */}
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                Category<span className="text-red-500 ml-1">*</span>
              </label>
              <div className="flex gap-2">
                <select
                  value={form.category}
                  onChange={e => set("category")(e.target.value)}
                  required
                  disabled={categoriesLoading}
                  className="flex-1 min-w-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-800 dark:text-white focus:outline-none focus:border-teal-500 dark:focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 text-sm transition-colors disabled:opacity-60"
                >
                  <option value="">{categoriesLoading ? "Loading..." : "Select..."}</option>
                  {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
                <button
                  type="button"
                  onClick={() => setShowAddCategory(true)}
                  title="Add new category"
                  className="flex-shrink-0 w-11 h-11 flex items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/25 hover:bg-emerald-100 dark:hover:bg-emerald-500/25 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <FormInput label="Quantity In Stock"    type="number" value={form.quantity}     onChange={set("quantity")}     placeholder="0" required />
            <FormInput label="Reorder Level"        type="number" value={form.reorderLevel} onChange={set("reorderLevel")} placeholder="50" />
            <FormInput label="Expiry Date"          type="date"   value={form.expiryDate}   onChange={set("expiryDate")}   required />
          </div>
        </SectionCard>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SectionCard title="Supplier Details" icon={Truck}>
            <FormInput label="Supplier Name" value={form.supplierName} onChange={set("supplierName")} placeholder="Distributor / Supplier name" />
          </SectionCard>

          <SectionCard title="Notes" icon={FileText}>
            <FormTextarea label="Storage & Usage Notes" value={form.notes} onChange={set("notes")} placeholder="Storage conditions, usage instructions..." />
          </SectionCard>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-400 text-white font-semibold px-6 py-2.5 rounded-xl hover:scale-[1.02] transition-transform shadow-lg shadow-emerald-500/20 text-sm disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? "Saving..." : editMedicine ? "Update Medicine" : "Add Medicine"}
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

      {showAddCategory && (
        <AddCategoryModal
          onCancel={() => setShowAddCategory(false)}
          onCreated={handleCategoryCreated}
        />
      )}
    </div>
  );
}