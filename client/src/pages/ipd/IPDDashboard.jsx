// client/src/pages/ipd/IPDDashboard.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchIpdStats } from "./api/ipd.api";
import { StatCard, PageHeader, StatusBadge } from "../../components/UI";
import {
  BedDouble, Pill, CheckCircle2, AlertTriangle, UserPlus,
  TrendingUp, Users, DollarSign,
} from "lucide-react";

export default function IPDDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchIpdStats()
      .then((data) => { if (!cancelled) setStats(data); })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return <div className="p-6 text-sm text-slate-400">Loading dashboard…</div>;
  }
  if (error) {
    return <div className="p-6 text-sm text-red-500">Failed to load dashboard: {error}</div>;
  }

  const {
    totalAdmittedEver, activeCount, dischargedCount, totalBalance,
    totalDeposits, totalCash, totalUpi, activePatients, recentDischarges,
  } = stats;

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto w-full overflow-hidden">
      <PageHeader
        title="IPD Dashboard"
        subtitle="Inpatient Department Overview"
        action={
          <button
            onClick={() => navigate("/ipd/admit")}
            className="flex items-center justify-center gap-2 w-full sm:w-auto bg-gradient-to-r from-violet-500 to-purple-400 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:scale-[1.02] transition-transform shadow-lg shadow-violet-500/20"
          >
            <UserPlus className="w-4 h-4" />
            <span>Admit Patient</span>
          </button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <StatCard label="Total Admitted"   value={totalAdmittedEver}                       icon={BedDouble}     color="purple" />
        <StatCard label="Active Patients"  value={activeCount}                             icon={Pill}          color="blue"   sub="Currently admitted" />
        <StatCard label="Discharged"       value={dischargedCount}                         icon={CheckCircle2}  color="green"  sub="Successfully treated" />
        <StatCard label="Pending Balance"  value={`₹${totalBalance.toLocaleString()}`}     icon={AlertTriangle} color="red"    sub="From active patients" />
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Active patients list */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm dark:shadow-none transition-colors duration-300">
          <div className="flex items-center justify-between px-4 sm:px-5 py-4 border-b border-slate-200 dark:border-slate-800">
            <h3 className="text-slate-800 dark:text-white font-semibold text-sm flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-400 dark:text-slate-500" /> Active Patients
            </h3>
            <button
              onClick={() => navigate("/ipd/patients")}
              className="text-violet-600 dark:text-violet-400 text-xs hover:text-violet-700 dark:hover:text-violet-300 font-medium transition-colors"
            >
              View All →
            </button>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
            {activePatients.length === 0 ? (
              <p className="p-5 text-xs text-slate-400 text-center">No active inpatients currently admitted.</p>
            ) : (
              activePatients.slice(0, 8).map(p => (
                <div key={p.id} className="flex items-center gap-3 px-4 sm:px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <div className="w-9 h-9 rounded-full bg-violet-50 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 flex items-center justify-center font-bold text-sm border border-violet-100 dark:border-transparent flex-shrink-0">
                    {p.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-slate-800 dark:text-white text-sm font-medium truncate">{p.name}</div>
                    <div className="text-slate-400 dark:text-slate-500 text-xs truncate">Admitted: {new Date(p.admissionDate).toLocaleDateString()}</div>
                  </div>
                  <div className="text-right flex-shrink-0 pl-2">
                    <div className="text-red-500 dark:text-red-400 text-xs font-semibold">₹{p.balance?.toLocaleString()}</div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-medium">pending</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-4">
          {/* Revenue Overview */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm dark:shadow-none transition-colors duration-300">
            <h3 className="text-slate-800 dark:text-white font-semibold text-sm mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-slate-400 dark:text-slate-500" /> Revenue Overview
            </h3>
            <div className="space-y-1">
              {[
                { label: "Total Deposits", val: `₹${totalDeposits.toLocaleString()}`, color: "text-emerald-600 dark:text-emerald-400" },
                { label: "Total Cash",      val: `₹${totalCash.toLocaleString()}`,    color: "text-amber-600 dark:text-amber-400" },
                { label: "Total UPI",       val: `₹${totalUpi.toLocaleString()}`,     color: "text-violet-600 dark:text-violet-400" },
                { label: "Total Pending",   val: `₹${totalBalance.toLocaleString()}`, color: "text-red-500 dark:text-red-400" },
              ].map(item => (
                <div key={item.label} className="flex justify-between items-center py-2.5 border-b border-slate-100 dark:border-slate-800 last:border-0">
                  <span className="text-slate-500 dark:text-slate-400 text-sm">{item.label}</span>
                  <span className={`font-bold text-sm ${item.color}`}>{item.val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent discharges */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm dark:shadow-none transition-colors duration-300">
            <h3 className="text-slate-800 dark:text-white font-semibold text-sm mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-slate-400 dark:text-slate-500" /> Recent Discharges
            </h3>
            <div className="space-y-1">
              {recentDischarges.length === 0 ? (
                <p className="py-3 text-xs text-slate-400">No recent discharges found.</p>
              ) : (
                recentDischarges.map(p => (
                  <div key={p.id} className="flex items-center gap-3 py-2 border-b border-slate-100 dark:border-slate-800/60 last:border-0">
                    <div className="w-7 h-7 rounded-full bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs font-bold border border-emerald-100 dark:border-transparent flex-shrink-0">
                      {p.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-slate-800 dark:text-white text-xs font-medium truncate">{p.name}</div>
                      <div className="text-slate-400 dark:text-slate-500 text-xs truncate">Discharged: {p.dischargeDate ? new Date(p.dischargeDate).toLocaleDateString() : "—"}</div>
                    </div>
                    <div className="flex-shrink-0">
                      <StatusBadge status="Discharged" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}