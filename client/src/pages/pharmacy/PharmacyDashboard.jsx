// client/src/pages/pharmacy/PharmacyDashboard.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { StatCard, PageHeader } from "../../components/UI";
import { api } from "../../lib/api";
import {
  Pill, Package, AlertTriangle, XCircle, Plus, TrendingUp,
  Clock, DollarSign, Boxes, Loader2,
} from "lucide-react";

// Shared status badge used across PharmacyMedicineList, PharmacyMedicineDetails,
// and PharmacyExpiryAlerts — kept here since this was the original home for it.
const STATUS_STYLES = {
  "In Stock":      "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20",
  "Low Stock":     "bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20",
  "Out of Stock":  "bg-red-50 dark:bg-red-500/15 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/20",
  "Expiring Soon": "bg-violet-50 dark:bg-violet-500/15 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-500/20",
  "Expired":       "bg-red-50 dark:bg-red-500/15 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/20",
};

export function PharmacyStatusBadge({ status }) {
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border whitespace-nowrap ${STATUS_STYLES[status] || STATUS_STYLES["In Stock"]}`}>
      {status}
    </span>
  );
}

export function getMedicineStatus(med) {
  const today = new Date();
  const expiry = new Date(med.expiryDate);
  const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
  if (med.quantity === 0) return "Out of Stock";
  if (diffDays <= 0) return "Expired";
  if (diffDays <= 30) return "Expiring Soon";
  if (med.quantity <= med.reorderLevel) return "Low Stock";
  return "In Stock";
}

export default function PharmacyDashboard() {
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");
      try {
        const { medicines: data } = await api.get("/pharmacy/medicines");
        setMedicines(data);
      } catch (err) {
        setError(err.message || "Could not load dashboard data.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const withStatus = medicines.map(m => ({ ...m, status: getMedicineStatus(m) }));

  const totalMedicines  = medicines.length;
  const inventoryValue  = medicines.reduce((s, m) => s + m.purchasePrice * m.quantity, 0);
  const lowStock        = withStatus.filter(m => m.status === "Low Stock");
  const outOfStock      = withStatus.filter(m => m.status === "Out of Stock");
  const expiringSoon    = withStatus.filter(m => m.status === "Expiring Soon");
  const expired         = withStatus.filter(m => m.status === "Expired");

  const recentMedicines = [...medicines].reverse().slice(0, 5);

  // Category breakdown (top 5 by medicine count)
  const categoryCounts = medicines.reduce((acc, m) => {
    acc[m.category] = (acc[m.category] || 0) + 1;
    return acc;
  }, {});
  const topCategories = Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const maxCategoryCount = topCategories[0]?.[1] || 1;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex items-center gap-3 text-slate-400 dark:text-slate-500 text-sm font-medium">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading dashboard...
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto w-full overflow-hidden">
      <PageHeader
        title="Pharmacy Dashboard"
        subtitle="Inventory overview"
        action={
          <button
            onClick={() => navigate("/pharmacy/add")}
            className="flex items-center justify-center gap-2 w-full sm:w-auto bg-gradient-to-r from-emerald-500 to-teal-400 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:scale-[1.02] transition-transform shadow-lg shadow-emerald-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>Add Medicine</span>
          </button>
        }
      />

      {error && (
        <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-xl px-4 py-3 text-rose-600 dark:text-rose-400 text-sm font-medium mb-6">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <StatCard label="Total Medicines"   value={totalMedicines}                            icon={Pill}    color="teal"   sub={`${Object.keys(categoryCounts).length} categories`} />
        <StatCard label="Inventory Value"   value={`₹${inventoryValue.toLocaleString()}`}     icon={DollarSign} color="green" sub="At purchase price" />
        <StatCard label="Low / Out of Stock" value={lowStock.length + outOfStock.length}       icon={Package} color="yellow" sub={`${outOfStock.length} out of stock`} />
        <StatCard label="Expiring / Expired" value={expiringSoon.length + expired.length}       icon={AlertTriangle} color="red" sub={`${expired.length} already expired`} />
      </div>

      {/* Alerts row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Low Stock */}
        <div className="bg-amber-50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/20 rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-amber-800 dark:text-amber-400 font-semibold text-sm flex items-center gap-2">
              <Package className="w-4 h-4" /> Low Stock
            </h3>
            <button onClick={() => navigate("/pharmacy/medicines")} className="text-amber-600 dark:text-amber-400 text-xs font-medium hover:underline flex-shrink-0">
              View All →
            </button>
          </div>
          {lowStock.length === 0 ? (
            <p className="text-amber-600/70 dark:text-amber-400/50 text-xs">Nothing running low</p>
          ) : (
            <div className="space-y-2">
              {lowStock.slice(0, 3).map(m => (
                <div key={m.id} className="flex items-center gap-2 text-xs">
                  <div className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center justify-center font-bold text-[10px] flex-shrink-0">
                    {m.drugName[0]}
                  </div>
                  <span className="text-slate-700 dark:text-slate-300 font-medium truncate">{m.drugName}</span>
                  <span className="text-amber-600 dark:text-amber-400 ml-auto flex-shrink-0">{m.quantity} left</span>
                </div>
              ))}
              {lowStock.length > 3 && <p className="text-amber-600/70 dark:text-amber-400/50 text-xs">+{lowStock.length - 3} more</p>}
            </div>
          )}
          <div className="mt-3 text-2xl font-bold text-amber-700 dark:text-amber-400">{lowStock.length}</div>
        </div>

        {/* Expiring Soon */}
        <div className="bg-violet-50 dark:bg-violet-500/5 border border-violet-200 dark:border-violet-500/20 rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-violet-800 dark:text-violet-400 font-semibold text-sm flex items-center gap-2">
              <Clock className="w-4 h-4" /> Expiring Soon
            </h3>
            <button onClick={() => navigate("/pharmacy/expiry")} className="text-violet-600 dark:text-violet-400 text-xs font-medium hover:underline flex-shrink-0">
              View All →
            </button>
          </div>
          {expiringSoon.length === 0 ? (
            <p className="text-violet-600/70 dark:text-violet-400/50 text-xs">Nothing expiring within 30 days</p>
          ) : (
            <div className="space-y-2">
              {expiringSoon.slice(0, 3).map(m => (
                <div key={m.id} className="flex items-center gap-2 text-xs">
                  <div className="w-6 h-6 rounded-full bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-400 flex items-center justify-center font-bold text-[10px] flex-shrink-0">
                    {m.drugName[0]}
                  </div>
                  <span className="text-slate-700 dark:text-slate-300 font-medium truncate">{m.drugName}</span>
                  <span className="text-violet-500 dark:text-violet-400 ml-auto flex-shrink-0">{m.expiryDate}</span>
                </div>
              ))}
              {expiringSoon.length > 3 && <p className="text-violet-600/70 dark:text-violet-400/50 text-xs">+{expiringSoon.length - 3} more</p>}
            </div>
          )}
          <div className="mt-3 text-2xl font-bold text-violet-700 dark:text-violet-400">{expiringSoon.length}</div>
        </div>

        {/* Expired */}
        <div className="bg-red-50 dark:bg-red-500/5 border border-red-200 dark:border-red-500/20 rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-red-800 dark:text-red-400 font-semibold text-sm flex items-center gap-2">
              <XCircle className="w-4 h-4" /> Expired
            </h3>
            <button onClick={() => navigate("/pharmacy/expiry")} className="text-red-600 dark:text-red-400 text-xs font-medium hover:underline flex-shrink-0">
              View All →
            </button>
          </div>
          {expired.length === 0 ? (
            <p className="text-red-600/70 dark:text-red-400/50 text-xs">No expired medicines</p>
          ) : (
            <div className="space-y-2">
              {expired.slice(0, 3).map(m => (
                <div key={m.id} className="flex items-center gap-2 text-xs">
                  <div className="w-6 h-6 rounded-full bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 flex items-center justify-center font-bold text-[10px] flex-shrink-0">
                    {m.drugName[0]}
                  </div>
                  <span className="text-slate-700 dark:text-slate-300 font-medium truncate">{m.drugName}</span>
                  <span className="text-red-500 dark:text-red-400 ml-auto flex-shrink-0">{m.expiryDate}</span>
                </div>
              ))}
              {expired.length > 3 && <p className="text-red-600/70 dark:text-red-400/50 text-xs">+{expired.length - 3} more</p>}
            </div>
          )}
          <div className="mt-3 text-2xl font-bold text-red-700 dark:text-red-400">{expired.length}</div>
        </div>
      </div>

      {/* Category breakdown + Recent medicines */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm dark:shadow-none transition-colors duration-300">
          <h3 className="text-slate-800 dark:text-white font-semibold text-sm mb-4 flex items-center gap-2">
            <Boxes className="w-4 h-4 text-slate-400 dark:text-slate-500" />
            Top Categories
          </h3>
          {topCategories.length === 0 ? (
            <p className="text-slate-400 dark:text-slate-500 text-xs">No medicines yet</p>
          ) : (
            <div className="space-y-3">
              {topCategories.map(([name, count]) => (
                <div key={name}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-500 dark:text-slate-400 truncate">{name}</span>
                    <span className="text-slate-800 dark:text-white font-medium flex-shrink-0 ml-2">{count}</span>
                  </div>
                  <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-teal-400 rounded-full transition-all duration-700"
                      style={{ width: `${(count / maxCategoryCount) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm dark:shadow-none transition-colors duration-300 lg:col-span-2">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
            <h3 className="text-slate-800 dark:text-white font-semibold text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-slate-400 dark:text-slate-500" /> Recently Added
            </h3>
            <button
              onClick={() => navigate("/pharmacy/medicines")}
              className="text-teal-600 dark:text-teal-400 text-xs hover:text-teal-700 dark:hover:text-teal-300 transition-colors font-medium flex-shrink-0"
            >
              View All →
            </button>
          </div>
          {recentMedicines.length === 0 ? (
            <div className="px-5 py-10 text-center text-slate-400 dark:text-slate-500 text-sm">No medicines added yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[480px]">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/50">
                    {["Medicine", "Category", "Stock", "Status"].map(h => (
                      <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-500 uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentMedicines.map(m => {
                    const status = getMedicineStatus(m);
                    return (
                      <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors border-t border-slate-100 dark:border-slate-800/50">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-teal-50 dark:bg-teal-500/20 flex items-center justify-center text-teal-600 dark:text-teal-400 text-xs font-bold border border-teal-100 dark:border-transparent flex-shrink-0">
                              {m.drugName[0]}
                            </div>
                            <span className="text-slate-800 dark:text-white font-medium truncate">{m.drugName}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400">{m.category}</td>
                        <td className="px-5 py-3.5 text-slate-700 dark:text-slate-300 font-medium">{m.quantity}</td>
                        <td className="px-5 py-3.5"><PharmacyStatusBadge status={status} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}