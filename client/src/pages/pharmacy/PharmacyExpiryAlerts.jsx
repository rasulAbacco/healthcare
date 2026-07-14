// client/src/pages/pharmacy/PharmacyExpiryAlerts.jsx
import { useState, useEffect } from "react";
import { PageHeader, SearchBar } from "../../components/UI";
import { PharmacyStatusBadge } from "./PharmacyDashboard";
import { Clock, AlertTriangle, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { api } from "../../lib/api";

function getExpiryInfo(med) {
  const today = new Date();
  const expiry = new Date(med.expiryDate);
  const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return { label: "Expired", diffDays, urgency: 4 };
  if (diffDays <= 30) return { label: "Expiring Within 30 Days", diffDays, urgency: 3 };
  if (diffDays <= 60) return { label: "Expiring Within 60 Days", diffDays, urgency: 2 };
  return { label: "Safe", diffDays, urgency: 1 };
}

export default function PharmacyExpiryAlerts() {
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
        setError(err.message || "Could not load expiry data.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const alertMeds = medicines
    .map(m => ({ ...m, ...getExpiryInfo(m) }))
    .filter(m => m.urgency >= 2)
    .sort((a, b) => a.diffDays - b.diffDays);

  const filtered = alertMeds.filter(m =>
    m.drugName.toLowerCase().includes(search.toLowerCase()) ||
    m.batchNumber?.toLowerCase().includes(search.toLowerCase())
  );

  const expired  = filtered.filter(m => m.diffDays <= 0);
  const within30 = filtered.filter(m => m.diffDays > 0 && m.diffDays <= 30);
  const within60 = filtered.filter(m => m.diffDays > 30 && m.diffDays <= 60);

  const Card = ({ med }) => {
    const isExpired = med.diffDays <= 0;
    const isUrgent  = med.diffDays > 0 && med.diffDays <= 30;
    return (
      <div className={`bg-white dark:bg-slate-900 border rounded-2xl p-4 flex flex-col sm:flex-row gap-4 shadow-sm dark:shadow-none transition-all ${
        isExpired ? "border-red-200 dark:border-red-500/30"
        : isUrgent ? "border-amber-200 dark:border-amber-500/30"
        : "border-violet-200 dark:border-violet-500/20"
      }`}>
        <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 border ${
          isExpired ? "bg-red-50 dark:bg-red-500/20 text-red-600 dark:text-red-400 border-red-100 dark:border-transparent"
          : isUrgent ? "bg-amber-50 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-transparent"
          : "bg-violet-50 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 border-violet-100 dark:border-transparent"
        }`}>
          {med.drugName[0]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-slate-800 dark:text-white font-semibold text-sm">{med.drugName}</span>
            <PharmacyStatusBadge status={isExpired ? "Expired" : "Expiring Soon"} />
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
            <span>Batch: <span className="font-mono">{med.batchNumber}</span></span>
            <span>Category: {med.category}</span>
            <span>Stock: <span className="font-medium text-slate-700 dark:text-slate-300">{med.quantity} units</span></span>
          </div>
        </div>
        <div className="text-left sm:text-right flex-shrink-0">
          <div className={`text-sm font-bold ${
            isExpired ? "text-red-500 dark:text-red-400"
            : isUrgent ? "text-amber-500 dark:text-amber-400"
            : "text-violet-600 dark:text-violet-400"
          }`}>
            {isExpired ? "Expired" : `${med.diffDays} days`}
          </div>
          <div className="text-slate-400 dark:text-slate-500 text-xs mt-0.5">{med.expiryDate}</div>
          <div className="text-slate-400 dark:text-slate-600 text-xs">{med.manufacturer}</div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full px-2 sm:px-4 max-w-5xl mx-auto">
      <PageHeader title="Expiry Alerts" subtitle="Medicines requiring attention" />

      {error && (
        <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-xl px-4 py-3 text-rose-600 dark:text-rose-400 text-sm font-medium mb-4">
          {error}
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        {[
          { label: "Expired",           val: expired.length,  icon: XCircle,      color: "text-red-500 dark:text-red-400",       bg: "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20" },
          { label: "Within 30 Days",    val: within30.length, icon: AlertTriangle, color: "text-amber-600 dark:text-amber-400",   bg: "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20" },
          { label: "Within 60 Days",    val: within60.length, icon: Clock,         color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-50 dark:bg-violet-500/10 border-violet-200 dark:border-violet-500/20" },
        ].map(item => {
          const Icon = item.icon;
          return (
            <div key={item.label} className={`${item.bg} border rounded-2xl p-4 flex items-center gap-3`}>
              <Icon className={`w-6 h-6 flex-shrink-0 ${item.color}`} />
              <div>
                <div className={`font-bold text-2xl ${item.color}`}>{item.val}</div>
                <div className="text-slate-500 dark:text-slate-400 text-xs">{item.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mb-4">
        <SearchBar value={search} onChange={setSearch} placeholder="Search medicine or batch..." />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="flex items-center gap-3 text-slate-400 dark:text-slate-500 text-sm font-medium">
            <Loader2 className="w-5 h-5 animate-spin" /> Loading expiry data...
          </div>
        </div>
      ) : (
        <>
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 dark:text-emerald-500" strokeWidth={1.5} />
              <p className="text-slate-500 dark:text-slate-400 font-medium">All medicines are within safe expiry window</p>
            </div>
          )}

          {expired.length > 0 && (
            <div className="mb-6">
              <h3 className="text-red-600 dark:text-red-400 font-semibold text-sm mb-3 flex items-center gap-2">
                <XCircle className="w-4 h-4" /> Expired <span className="text-slate-400 dark:text-slate-500 font-normal">({expired.length})</span>
              </h3>
              <div className="space-y-3">{expired.map(m => <Card key={m.id} med={m} />)}</div>
            </div>
          )}

          {within30.length > 0 && (
            <div className="mb-6">
              <h3 className="text-amber-600 dark:text-amber-400 font-semibold text-sm mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Expiring Within 30 Days <span className="text-slate-400 dark:text-slate-500 font-normal">({within30.length})</span>
              </h3>
              <div className="space-y-3">{within30.map(m => <Card key={m.id} med={m} />)}</div>
            </div>
          )}

          {within60.length > 0 && (
            <div className="mb-6">
              <h3 className="text-violet-600 dark:text-violet-400 font-semibold text-sm mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4" /> Expiring Within 60 Days <span className="text-slate-400 dark:text-slate-500 font-normal">({within60.length})</span>
              </h3>
              <div className="space-y-3">{within60.map(m => <Card key={m.id} med={m} />)}</div>
            </div>
          )}
        </>
      )}
    </div>
  );
}