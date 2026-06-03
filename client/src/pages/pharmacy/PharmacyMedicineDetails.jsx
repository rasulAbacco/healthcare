// client/src/pages/pharmacy/PharmacyMedicineDetails.jsx
import { useState } from "react";
import { SectionCard } from "../../components/UI";
import { PharmacyStatusBadge } from "./PharmacyDashboard";
import {
  ArrowLeft, Pill, Package, DollarSign, Truck, FileText,
  Plus, Minus, RefreshCw, History,
} from "lucide-react";

function getMedicineStatus(med) {
  const today = new Date();
  const expiry = new Date(med.expiryDate);
  const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
  if (med.quantity === 0) return "Out of Stock";
  if (diffDays <= 0) return "Expired";
  if (diffDays <= 30) return "Expiring Soon";
  if (med.quantity <= med.reorderLevel) return "Low Stock";
  return "In Stock";
}

export default function PharmacyMedicineDetails({ medicine: initMed, setMedicines, onBack }) {
  const [med, setMed] = useState(initMed);
  const [stockAction, setStockAction] = useState("");
  const [stockQty, setStockQty] = useState("");
  const [stockReason, setStockReason] = useState("");
  const [stockError, setStockError] = useState("");

  const status = getMedicineStatus(med);

  const handleStockUpdate = () => {
    const qty = parseInt(stockQty);
    if (!qty || qty <= 0) { setStockError("Enter a valid quantity."); return; }
    if (!stockReason.trim()) { setStockError("Enter a reason."); return; }

    let newQty;
    let actionLabel;
    if (stockAction === "add") { newQty = med.quantity + qty; actionLabel = "Add Stock"; }
    else if (stockAction === "reduce") {
      if (qty > med.quantity) { setStockError("Cannot reduce more than current stock."); return; }
      newQty = med.quantity - qty;
      actionLabel = "Reduce Stock";
    } else {
      newQty = qty;
      actionLabel = "Stock Adjustment";
    }

    const histEntry = {
      id: Date.now(),
      date: new Date().toISOString().split("T")[0],
      action: actionLabel,
      quantity: stockAction === "reduce" ? -qty : qty,
      reason: stockReason,
    };

    const updated = {
      ...med,
      quantity: newQty,
      stockHistory: [...(med.stockHistory || []), histEntry],
    };
    setMed(updated);
    if (setMedicines) setMedicines(ms => ms.map(m => m.id === med.id ? updated : m));
    setStockQty(""); setStockReason(""); setStockAction(""); setStockError("");
  };

  const expiryDiff = Math.ceil((new Date(med.expiryDate) - new Date()) / (1000 * 60 * 60 * 24));

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white text-sm font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />
        <h1 className="text-slate-800 dark:text-white font-bold text-xl">{med.drugName}</h1>
        <PharmacyStatusBadge status={status} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-6xl mb-4">
        {/* Drug Info */}
        <SectionCard title="Drug Information" icon={Pill}>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              { label: "Medicine ID",   val: med.serialNumber },
              { label: "Drug Name",     val: med.drugName },
              { label: "Generic Name",  val: med.genericName },
              { label: "Category",      val: med.category },
              { label: "Manufacturer",  val: med.manufacturer },
              { label: "Batch Number",  val: med.batchNumber },
            ].map(item => (
              <div key={item.label}>
                <div className="text-slate-400 dark:text-slate-500 text-xs mb-0.5">{item.label}</div>
                <div className="text-slate-800 dark:text-white font-medium">{item.val || "—"}</div>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Pricing */}
        <SectionCard title="Pricing" icon={DollarSign}>
          <div className="grid grid-cols-3 gap-3 mb-3">
            {[
              { label: "Purchase Price", val: `₹${med.purchasePrice}`, color: "text-blue-600 dark:text-blue-400",     bg: "bg-blue-50 dark:bg-slate-800/50 border-blue-100 dark:border-transparent" },
              { label: "Selling Price",  val: `₹${med.sellingPrice}`,  color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-slate-800/50 border-emerald-100 dark:border-transparent" },
              {
                label: "Margin",
                val: med.purchasePrice
                  ? `${(((med.sellingPrice - med.purchasePrice) / med.purchasePrice) * 100).toFixed(1)}%`
                  : "—",
                color: "text-violet-600 dark:text-violet-400",
                bg: "bg-violet-50 dark:bg-slate-800/50 border-violet-100 dark:border-transparent",
              },
            ].map(item => (
              <div key={item.label} className={`${item.bg} border rounded-xl p-3 text-center`}>
                <div className="text-slate-500 dark:text-slate-500 text-xs mb-0.5">{item.label}</div>
                <div className={`font-bold text-sm ${item.color}`}>{item.val}</div>
              </div>
            ))}
          </div>
          <div className="text-sm">
            <div className="text-slate-400 dark:text-slate-500 text-xs mb-0.5">Inventory Value</div>
            <div className="text-slate-800 dark:text-white font-bold text-xl">₹{(med.purchasePrice * med.quantity).toLocaleString()}</div>
          </div>
        </SectionCard>

        {/* Stock & Expiry */}
        <SectionCard title="Stock & Expiry" icon={Package}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "In Stock",        val: med.quantity,       color: med.quantity === 0 ? "text-red-500 dark:text-red-400" : med.quantity <= med.reorderLevel ? "text-amber-500 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400", bg: "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-transparent" },
              { label: "Reorder Level",   val: med.reorderLevel,   color: "text-slate-800 dark:text-white",                     bg: "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-transparent" },
              { label: "Expiry Date",     val: med.expiryDate,     color: expiryDiff <= 30 ? "text-red-500 dark:text-red-400" : "text-slate-800 dark:text-white", bg: "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-transparent" },
              { label: "Days to Expiry",  val: expiryDiff <= 0 ? "Expired" : `${expiryDiff} days`, color: expiryDiff <= 0 ? "text-red-500 dark:text-red-400" : expiryDiff <= 30 ? "text-amber-500 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400", bg: "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-transparent" },
            ].map(item => (
              <div key={item.label} className={`${item.bg} border rounded-xl p-3`}>
                <div className="text-slate-500 dark:text-slate-500 text-xs mb-0.5">{item.label}</div>
                <div className={`font-bold text-sm ${item.color}`}>{item.val}</div>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Supplier */}
        <SectionCard title="Supplier Details" icon={Truck}>
          <div className="grid grid-cols-1 gap-3 text-sm">
            <div>
              <div className="text-slate-400 dark:text-slate-500 text-xs mb-0.5">Supplier Name</div>
              <div className="text-slate-800 dark:text-white font-medium">{med.supplierName || "—"}</div>
            </div>
            {med.notes && (
              <div>
                <div className="text-slate-400 dark:text-slate-500 text-xs mb-0.5">Storage / Usage Notes</div>
                <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed bg-slate-50 dark:bg-slate-800/50 rounded-xl px-3 py-2 border border-slate-100 dark:border-slate-800">
                  {med.notes}
                </p>
              </div>
            )}
          </div>
        </SectionCard>
      </div>

      {/* Stock Management */}
      <div className="max-w-6xl mb-4">
        <SectionCard title="Stock Management" icon={RefreshCw}>
          <div className="flex flex-wrap gap-3 mb-4">
            {[
              { key: "add",    label: "Add Stock",    icon: Plus,        color: "bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30 hover:bg-emerald-100 dark:hover:bg-emerald-500/30" },
              { key: "reduce", label: "Reduce Stock", icon: Minus,       color: "bg-red-50 dark:bg-red-500/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/30 hover:bg-red-100 dark:hover:bg-red-500/30" },
              { key: "adjust", label: "Set Quantity",  icon: RefreshCw,  color: "bg-violet-50 dark:bg-violet-500/20 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-500/30 hover:bg-violet-100 dark:hover:bg-violet-500/30" },
            ].map(a => {
              const Icon = a.icon;
              return (
                <button
                  key={a.key}
                  onClick={() => { setStockAction(stockAction === a.key ? "" : a.key); setStockError(""); }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${a.color} ${stockAction === a.key ? 'ring-2 ring-offset-1 ring-current' : ''}`}
                >
                  <Icon className="w-4 h-4" /> {a.label}
                </button>
              );
            })}
          </div>

          {stockAction && (
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1.5">
                    {stockAction === "adjust" ? "Set Quantity" : "Quantity"}
                  </label>
                  <input
                    type="number"
                    value={stockQty}
                    onChange={e => { setStockQty(e.target.value); setStockError(""); }}
                    placeholder="Enter quantity"
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-teal-500 text-sm transition-colors"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1.5">Reason</label>
                  <input
                    type="text"
                    value={stockReason}
                    onChange={e => { setStockReason(e.target.value); setStockError(""); }}
                    placeholder="e.g. Dispensed to OPD / New purchase"
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-teal-500 text-sm transition-colors"
                  />
                </div>
              </div>
              {stockError && (
                <p className="text-red-500 dark:text-red-400 text-xs font-medium">{stockError}</p>
              )}
              <button
                onClick={handleStockUpdate}
                className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-400 text-white font-semibold px-5 py-2 rounded-xl hover:scale-[1.02] transition-transform shadow-lg shadow-emerald-500/20 text-sm"
              >
                <RefreshCw className="w-4 h-4" /> Update Stock
              </button>
            </div>
          )}
        </SectionCard>
      </div>

      {/* Stock History */}
      <div className="max-w-6xl">
        <SectionCard title="Stock History" icon={History}>
          {(!med.stockHistory || med.stockHistory.length === 0) ? (
            <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-sm">No stock history available.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[400px]">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50">
                    {["Date", "Action", "Quantity", "Reason"].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...med.stockHistory].reverse().map(h => (
                    <tr key={h.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800/50">{h.date}</td>
                      <td className="px-4 py-3 border-b border-slate-100 dark:border-slate-800/50">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                          h.action === "Add Stock"
                            ? "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20"
                            : h.action === "Reduce Stock"
                            ? "bg-red-50 dark:bg-red-500/15 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/20"
                            : "bg-violet-50 dark:bg-violet-500/15 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-500/20"
                        }`}>
                          {h.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 border-b border-slate-100 dark:border-slate-800/50">
                        <span className={`font-bold ${h.quantity > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                          {h.quantity > 0 ? `+${h.quantity}` : h.quantity}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800/50">{h.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}