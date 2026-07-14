// client/src/pages/pharmacy/PharmacyStockHistory.jsx
import { useState, useEffect } from "react";
import { PageHeader, SearchBar, EmptyState } from "../../components/UI";
import { History, TrendingUp, TrendingDown, RefreshCw, Calendar, Tag, FileText, Loader2 } from "lucide-react";
import { api } from "../../lib/api";

export default function PharmacyStockHistory() {
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");
      try {
        const { medicines: data } = await api.get("/pharmacy/medicines");
        setMedicines(data);
      } catch (err) {
        setError(err.message || "Could not load stock history.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Flatten all stock history across all medicines
  const allHistory = medicines.flatMap(m =>
    (m.stockHistory || []).map(h => ({
      ...h,
      drugName: m.drugName,
      batchNumber: m.batchNumber,
      medicineId: m.id,
    }))
  ).sort((a, b) => new Date(b.date) - new Date(a.date));

  const filtered = allHistory.filter(h =>
    h.drugName.toLowerCase().includes(search.toLowerCase()) ||
    h.reason.toLowerCase().includes(search.toLowerCase()) ||
    h.action.toLowerCase().includes(search.toLowerCase())
  );

  const totalAdded   = allHistory.filter(h => h.quantity > 0).reduce((s, h) => s + h.quantity, 0);
  const totalRemoved = Math.abs(allHistory.filter(h => h.quantity < 0).reduce((s, h) => s + h.quantity, 0));

  return (
    <div className="w-full px-2 sm:px-4 max-w-7xl mx-auto">
      <PageHeader title="Stock History" subtitle="All stock transactions across medicines" />

      {error && (
        <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-xl px-4 py-3 text-rose-600 dark:text-rose-400 text-sm font-medium mb-4">
          {error}
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        {[
          { label: "Total Transactions", val: allHistory.length,   color: "text-teal-600 dark:text-teal-400",   bg: "bg-teal-50 dark:bg-teal-500/10 border-teal-200 dark:border-teal-500/20" },
          { label: "Units Added",        val: totalAdded,           color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20" },
          { label: "Units Removed",      val: totalRemoved,         color: "text-red-500 dark:text-red-400",      bg: "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20" },
        ].map(item => (
          <div key={item.label} className={`${item.bg} border rounded-2xl p-4 text-center shadow-sm dark:shadow-none`}>
            <div className={`font-bold text-2xl ${item.color}`}>{item.val}</div>
            <div className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-0.5">{item.label}</div>
          </div>
        ))}
      </div>

      <div className="mb-4">
        <SearchBar value={search} onChange={setSearch} placeholder="Search medicine, action, reason..." />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="flex items-center gap-3 text-slate-400 dark:text-slate-500 text-sm font-medium">
            <Loader2 className="w-5 h-5 animate-spin" /> Loading stock history...
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8">
          <EmptyState icon={History} message="No stock history found" />
        </div>
      ) : (
        <>
          {/* 1. DESKTOP LOG TABLE */}
          <div className="hidden md:block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm dark:shadow-none transition-colors duration-300">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[640px]">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/50">
                    {["Date", "Medicine", "Batch", "Action", "Quantity", "Reason"].map(h => (
                      <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((h, idx) => (
                    <tr key={`${h.medicineId}-${h.id}-${idx}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors border-t border-slate-100 dark:border-slate-800/50">
                      <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400 whitespace-nowrap">{h.date}</td>
                      <td className="px-5 py-3.5 text-slate-800 dark:text-white font-medium">{h.drugName}</td>
                      <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400 font-mono text-xs whitespace-nowrap">{h.batchNumber}</td>
                      <td className="px-5 py-3.5">
                        <span className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border w-fit whitespace-nowrap ${
                          h.action === "Add Stock"
                            ? "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20"
                            : h.action === "Reduce Stock"
                            ? "bg-red-50 dark:bg-red-500/15 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/20"
                            : "bg-violet-50 dark:bg-violet-500/15 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-500/20"
                        }`}>
                          {h.action === "Add Stock" ? <TrendingUp className="w-3 h-3" /> : h.action === "Reduce Stock" ? <TrendingDown className="w-3 h-3" /> : <RefreshCw className="w-3 h-3" />}
                          {h.action}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className={`font-bold ${h.quantity > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                          {h.quantity > 0 ? `+${h.quantity}` : h.quantity}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400">{h.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 2. MOBILE TIMELINE CARDS */}
          <div className="block md:hidden space-y-3">
            {filtered.map((h, idx) => (
              <div key={`mob-${h.medicineId}-${h.id}-${idx}`} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
                <div className="flex justify-between items-start gap-2 border-b border-slate-100 dark:border-slate-800/60 pb-2.5 mb-2.5">
                  <div className="min-w-0">
                    <h4 className="text-slate-800 dark:text-white font-semibold text-sm truncate">{h.drugName}</h4>
                    <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-400 font-mono">
                      <Tag className="w-3 h-3 text-slate-400 flex-shrink-0" />
                      <span>B: {h.batchNumber}</span>
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <span className={`text-base font-extrabold ${h.quantity > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                      {h.quantity > 0 ? `+${h.quantity}` : h.quantity}
                    </span>
                    <span className="text-[10px] block text-slate-400 dark:text-slate-500 uppercase font-medium">units</span>
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" /> Date:
                    </span>
                    <span className="text-slate-700 dark:text-slate-300 font-medium">{h.date}</span>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <RefreshCw className="w-3.5 h-3.5 text-slate-400" /> Action:
                    </span>
                    <span className={`flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                      h.action === "Add Stock"
                        ? "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20"
                        : h.action === "Reduce Stock"
                        ? "bg-red-50 dark:bg-red-500/15 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/20"
                        : "bg-violet-50 dark:bg-violet-500/15 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-500/20"
                    }`}>
                      {h.action}
                    </span>
                  </div>

                  <div className="flex items-start justify-between gap-4 bg-slate-50 dark:bg-slate-800/40 p-2 rounded-xl mt-1">
                    <span className="text-slate-400 flex items-center gap-1.5 text-[11px] font-medium flex-shrink-0 mt-0.5">
                      <FileText className="w-3.5 h-3.5 text-slate-400" /> Reason:
                    </span>
                    <span className="text-slate-600 dark:text-slate-400 text-right text-xs leading-relaxed max-w-[70%] break-words">
                      {h.reason}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}