// client/src/pages/doctor/DoctorOPDDashboard.jsx
// Replace your existing DoctorOPDDashboard.jsx with this file.
//
// This is now JUST the dashboard overview content — tabs live in
// DoctorOPDLayout.jsx as real routes, so this component doesn't need to know
// about "patients" / "followups" tabs anymore. It renders at /doctor/opd/dashboard.
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import {
  Users, CalendarClock, AlertTriangle, Activity, Loader2, ArrowRight, IndianRupee, Wallet,
} from "lucide-react";

function StatCard({ icon: Icon, label, value, accent }) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 flex items-center gap-4 shadow-sm">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${accent.iconWrap}`}>
        <Icon className="w-5 h-5" strokeWidth={2.25} />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-slate-800 dark:text-white leading-none">{value}</p>
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1.5">{label}</p>
      </div>
    </div>
  );
}

const conditionColors = {
  Critical:  "bg-red-50 dark:bg-red-500/15 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/20",
  Chronic:   "bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20",
  Mild:      "bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20",
  Improving: "bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/20",
  Stable:    "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20",
  Good:      "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20",
};

export function DoctorOPDDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const data = await api.get("/opd/patients/stats");
        if (cancelled) return;
        setStats(data);
      } catch (err) {
        if (!cancelled) setError(err.message || "Could not load dashboard data.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex items-center gap-3 text-slate-400 dark:text-slate-500 text-sm font-medium">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading dashboard...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-xl px-4 py-3 text-rose-600 dark:text-rose-400 text-sm font-medium">
        {error}
      </div>
    );
  }

  const {
    totalPatients, seenToday, pendingFollowUps, criticalCount,
    totalRevenue, todayRevenue, todayCash, todayUpi,
    recentPatients, criticalPatients,
  } = stats;

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label="Patients Today"
          value={seenToday}
          accent={{ iconWrap: "bg-teal-100 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400" }}
        />
        <StatCard
          icon={Activity}
          label="Total OPD Patients"
          value={totalPatients}
          accent={{ iconWrap: "bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400" }}
        />
        <StatCard
          icon={CalendarClock}
          label="Pending Follow-Ups"
          value={pendingFollowUps}
          accent={{ iconWrap: "bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400" }}
        />
        <StatCard
          icon={AlertTriangle}
          label="Critical Patients"
          value={criticalCount}
          accent={{ iconWrap: "bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400" }}
        />
      </div>

      {/* Revenue stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={IndianRupee}
          label="Today's Revenue"
          value={`₹${todayRevenue.toLocaleString()}`}
          accent={{ iconWrap: "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400" }}
        />
        <StatCard
          icon={Wallet}
          label="Today — Cash"
          value={`₹${todayCash.toLocaleString()}`}
          accent={{ iconWrap: "bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400" }}
        />
        <StatCard
          icon={Wallet}
          label="Today — UPI"
          value={`₹${todayUpi.toLocaleString()}`}
          accent={{ iconWrap: "bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400" }}
        />
        <StatCard
          icon={IndianRupee}
          label="Total Revenue (All Time)"
          value={`₹${totalRevenue.toLocaleString()}`}
          accent={{ iconWrap: "bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400" }}
        />
      </div>

      {/* Critical patients callout */}
      {criticalPatients.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-red-200 dark:border-red-500/20 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <h3 className="text-sm font-semibold text-slate-800 dark:text-white">Needs Attention</h3>
          </div>
          <div className="space-y-2">
            {criticalPatients.slice(0, 4).map(p => (
              <div key={p.id} className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="font-mono text-xs text-teal-600 dark:text-teal-400 font-bold flex-shrink-0">{p.serialNumber}</span>
                  <span className="text-sm text-slate-800 dark:text-white font-medium truncate">{p.name}</span>
                </div>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border flex-shrink-0 ${conditionColors.Critical}`}>
                  Critical
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent patients + quick links */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-white">Recent Patients</h3>
            <button
              onClick={() => navigate("/doctor/opd/patients")}
              className="flex items-center gap-1 text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline"
            >
              View all <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          {recentPatients.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-slate-500 py-6 text-center">No patients yet.</p>
          ) : (
            <div className="space-y-1.5">
              {recentPatients.map(p => (
                <div key={p.id} className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-teal-50 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {p.name[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 dark:text-white truncate">{p.name}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">{p.serialNumber} · {p.visitDate}</p>
                    </div>
                  </div>
                  {p.condition && (
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border flex-shrink-0 ${conditionColors[p.condition] || conditionColors.Stable}`}>
                      {p.condition}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-white mb-3">Quick Actions</h3>
          <div className="space-y-2">
            <button
              onClick={() => navigate("/doctor/opd/followups")}
              className="w-full flex items-center justify-between px-3.5 py-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-400 text-sm font-medium hover:bg-amber-100 dark:hover:bg-amber-500/15 transition-colors"
            >
              <span className="flex items-center gap-2"><CalendarClock className="w-4 h-4" /> Review Follow-Ups</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => navigate("/doctor/opd/patients")}
              className="w-full flex items-center justify-between px-3.5 py-3 rounded-xl bg-teal-50 dark:bg-teal-500/10 border border-teal-200 dark:border-teal-500/20 text-teal-700 dark:text-teal-400 text-sm font-medium hover:bg-teal-100 dark:hover:bg-teal-500/15 transition-colors"
            >
              <span className="flex items-center gap-2"><Users className="w-4 h-4" /> View All Patients</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}