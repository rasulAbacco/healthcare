// client/src/pages/pharmacy/PharmacyDashboard.jsx
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { StatCard, PageHeader } from "../../components/UI";
import {
  Pill, AlertTriangle, PackageX, TrendingUp,
  FlaskConical, Plus, Clock, CheckCircle2, Package,
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

export default function PharmacyDashboard({ medicines }) {
  const navigate = useNavigate();

  const stats = useMemo(() => {
    const today = new Date();
    let lowStock = 0, expiringSoon = 0, outOfStock = 0, expired = 0;
    let totalValue = 0;
    medicines.forEach(m => {
      const status = getMedicineStatus(m);
      if (status === "Low Stock") lowStock++;
      if (status === "Out of Stock") outOfStock++;
      if (status === "Expiring Soon") expiringSoon++;
      if (status === "Expired") expired++;
      totalValue += m.purchasePrice * m.quantity;
    });
    return { lowStock, expiringSoon, outOfStock, expired, totalValue };
  }, [medicines]);

  const expiryAlerts = useMemo(() => {
    const today = new Date();
    return medicines
      .map(m => {
        const expiry = new Date(m.expiryDate);
        const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
        return { ...m, diffDays };
      })
      .filter(m => m.diffDays <= 60)
      .sort((a, b) => a.diffDays - b.diffDays)
      .slice(0, 6);
  }, [medicines]);

  const lowStockMeds = useMemo(() =>
    medicines.filter(m => m.quantity > 0 && m.quantity <= m.reorderLevel)
      .sort((a, b) => a.quantity - b.quantity)
      .slice(0, 5),
    [medicines]
  );

  const recentMeds = [...medicines].reverse().slice(0, 5);

  return (
    <div>
      <PageHeader
        title="Pharmacy Dashboard"
        subtitle="Inventory & Medicine Overview"
        action={
          <button
            onClick={() => navigate("/pharmacy/add")}
            className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-400 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:scale-[1.02] transition-transform shadow-lg shadow-emerald-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>Add Medicine</span>
          </button>
        }
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <StatCard label="Total Medicines"   value={medicines.length}                           icon={Pill}       color="teal"   />
        <StatCard label="Low Stock"         value={stats.lowStock}                             icon={AlertTriangle} color="yellow" sub="Need reorder" />
        <StatCard label="Expiring Soon"     value={stats.expiringSoon}                         icon={Clock}      color="purple" sub="Within 30 days" />
        <StatCard label="Out of Stock"      value={stats.outOfStock}                           icon={PackageX}   color="red"    sub="Needs restock" />
        <StatCard label="Inventory Value"   value={`₹${stats.totalValue.toLocaleString()}`}    icon={TrendingUp} color="green"  sub="Purchase cost" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Expiry Alerts */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm dark:shadow-none transition-colors duration-300">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
            <h3 className="text-slate-800 dark:text-white font-semibold text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400 dark:text-slate-500" /> Expiry Alerts
            </h3>
            <button
              onClick={() => navigate("/pharmacy/expiry")}
              className="text-emerald-600 dark:text-emerald-400 text-xs hover:text-emerald-700 dark:hover:text-emerald-300 font-medium transition-colors"
            >
              View All →
            </button>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
            {expiryAlerts.length === 0 ? (
              <div className="flex items-center justify-center py-10 text-slate-400 dark:text-slate-500 text-sm">
                <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-400" /> All medicines are within safe expiry
              </div>
            ) : expiryAlerts.map(m => {
              const isExpired = m.diffDays <= 0;
              const isUrgent = m.diffDays <= 30;
              return (
                <div key={m.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm border flex-shrink-0 ${
                    isExpired
                      ? "bg-red-50 dark:bg-red-500/20 text-red-600 dark:text-red-400 border-red-100 dark:border-transparent"
                      : isUrgent
                      ? "bg-amber-50 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-transparent"
                      : "bg-violet-50 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 border-violet-100 dark:border-transparent"
                  }`}>
                    {m.drugName[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-slate-800 dark:text-white text-sm font-medium truncate">{m.drugName}</div>
                    <div className="text-slate-400 dark:text-slate-500 text-xs">{m.batchNumber}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className={`text-xs font-semibold px-2 py-1 rounded-full border ${
                      isExpired
                        ? "bg-red-50 dark:bg-red-500/15 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/20"
                        : isUrgent
                        ? "bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/20"
                        : "bg-violet-50 dark:bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-500/20"
                    }`}>
                      {isExpired ? "Expired" : `${m.diffDays}d left`}
                    </div>
                    <div className="text-slate-400 dark:text-slate-600 text-xs mt-0.5">{m.expiryDate}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Low Stock */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm dark:shadow-none transition-colors duration-300">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-slate-800 dark:text-white font-semibold text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-slate-400 dark:text-slate-500" /> Low Stock Medicines
              </h3>
              <button
                onClick={() => navigate("/pharmacy/medicines")}
                className="text-emerald-600 dark:text-emerald-400 text-xs hover:text-emerald-700 dark:hover:text-emerald-300 font-medium transition-colors"
              >
                View All →
              </button>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {lowStockMeds.length === 0 ? (
                <div className="flex items-center justify-center py-8 text-slate-400 dark:text-slate-500 text-sm">
                  <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-400" /> All stock levels are healthy
                </div>
              ) : lowStockMeds.map(m => (
                <div key={m.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-amber-50 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-xs border border-amber-100 dark:border-transparent flex-shrink-0">
                    {m.drugName[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-slate-800 dark:text-white text-xs font-medium truncate">{m.drugName}</div>
                    <div className="text-slate-400 dark:text-slate-500 text-xs">Reorder at: {m.reorderLevel}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-amber-500 dark:text-amber-400 font-bold text-sm">{m.quantity}</div>
                    <div className="text-slate-400 dark:text-slate-600 text-xs">units</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Inventory Summary */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm dark:shadow-none transition-colors duration-300">
            <h3 className="text-slate-800 dark:text-white font-semibold text-sm mb-4 flex items-center gap-2">
              <Package className="w-4 h-4 text-slate-400 dark:text-slate-500" /> Inventory Summary
            </h3>
            <div className="space-y-2">
              {[
                { label: "Total Medicines",  val: medicines.length,                                            color: "text-teal-600 dark:text-teal-400" },
                { label: "In Stock",         val: medicines.filter(m => getMedicineStatus(m) === "In Stock").length, color: "text-emerald-600 dark:text-emerald-400" },
                { label: "Low Stock",        val: stats.lowStock,                                              color: "text-amber-600 dark:text-amber-400" },
                { label: "Out of Stock",     val: stats.outOfStock,                                            color: "text-red-500 dark:text-red-400" },
                { label: "Inventory Value",  val: `₹${stats.totalValue.toLocaleString()}`,                    color: "text-violet-600 dark:text-violet-400" },
              ].map(item => (
                <div key={item.label} className="flex justify-between items-center py-1.5 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500 dark:text-slate-400 text-sm">{item.label}</span>
                  <span className={`font-bold text-sm ${item.color}`}>{item.val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Medicines */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm dark:shadow-none transition-colors duration-300">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
          <h3 className="text-slate-800 dark:text-white font-semibold text-sm flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-slate-400 dark:text-slate-500" /> Recent Medicines
          </h3>
          <button
            onClick={() => navigate("/pharmacy/medicines")}
            className="text-emerald-600 dark:text-emerald-400 text-xs hover:text-emerald-700 dark:hover:text-emerald-300 font-medium transition-colors"
          >
            View All →
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[540px]">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50">
                {["Medicine", "Category", "Batch", "Stock", "Selling Price", "Expiry", "Status"].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentMeds.map(m => {
                const status = getMedicineStatus(m);
                return (
                  <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors border-t border-slate-100 dark:border-slate-800/50">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 text-xs font-bold border border-emerald-100 dark:border-transparent flex-shrink-0">
                          {m.drugName[0]}
                        </div>
                        <div>
                          <span className="text-slate-800 dark:text-white font-medium truncate block">{m.drugName}</span>
                          <span className="text-slate-400 dark:text-slate-500 text-xs">{m.genericName}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400">{m.category}</td>
                    <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400 font-mono text-xs">{m.batchNumber}</td>
                    <td className="px-5 py-3.5">
                      <span className={`font-bold ${m.quantity === 0 ? 'text-red-500 dark:text-red-400' : m.quantity <= m.reorderLevel ? 'text-amber-500 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        {m.quantity}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-emerald-600 dark:text-emerald-400 font-medium">₹{m.sellingPrice}</td>
                    <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400">{m.expiryDate}</td>
                    <td className="px-5 py-3.5"><PharmacyStatusBadge status={status} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function PharmacyStatusBadge({ status }) {
  const map = {
    "In Stock":      "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20",
    "Low Stock":     "bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20",
    "Out of Stock":  "bg-red-50 dark:bg-red-500/15 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/20",
    "Expiring Soon": "bg-violet-50 dark:bg-violet-500/15 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-500/20",
    "Expired":       "bg-slate-100 dark:bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-500/20",
  };
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border whitespace-nowrap ${map[status] || map["In Stock"]}`}>
      {status}
    </span>
  );
}