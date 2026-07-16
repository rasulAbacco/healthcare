// client/src/pages/doctor/IPDDoctorDashboard.jsx
//
// Doctor-facing landing page. Card-wise summary of the IPD ward
// (admitted / discharged / ready-for-discharge / dues) plus three
// panels: Recent Patients (admitted today), upcoming Follow-Ups,
// and pending WhatsApp Reminders (full width, below).
//
// Reuses the same API functions and UI primitives as IPDPatientList.jsx
// and IPDFollowUps.jsx so it stays visually consistent with the rest
// of the IPD module.

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader, EmptyState } from "../../components/UI";
import {
  Users, BedDouble, CheckCircle2, Clock, CalendarClock, Bell,
  CreditCard, Phone, MessageCircle, Loader2, ArrowRight, AlertCircle,
} from "lucide-react";
import { fetchPatients, fetchFollowUps } from "../ipd/api/ipd.api";

const toDateStr = (d) => (d ? new Date(d).toISOString().split("T")[0] : "");

// A big number of patients in one page-fetch so we can compute ward-wide
// counts client side (mirrors the approach already used in IPDFollowUps.jsx,
// which pulls the full follow-up list rather than a paginated slice).
const ALL_PATIENTS_LIMIT = 1000;

export function IPDDoctorDashboard() {
  const [patients, setPatients]     = useState([]);
  const [followUps, setFollowUps]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");
      try {
        const [patientsRes, followUpsRes] = await Promise.all([
          fetchPatients({ limit: ALL_PATIENTS_LIMIT }),
          fetchFollowUps(),
        ]);
        setPatients(patientsRes.data || []);
        setFollowUps(
          (followUpsRes.patients || []).map((p) => ({
            ...p,
            followUpDate: toDateStr(p.followUpDate),
          }))
        );
      } catch (err) {
        setError(err.message || "Could not load dashboard data.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const today = new Date().toISOString().split("T")[0];
  const next7 = new Date();
  next7.setDate(next7.getDate() + 7);

  // --- ward counts ---
  const totalPatients   = patients.length;
  const admittedCount   = patients.filter((p) => (p.dischargeStatus || "Admitted") === "Admitted").length;
  const readyForDischarge = patients.filter((p) => p.dischargeStatus === "Ready For Discharge").length;
  const dischargedCount  = patients.filter((p) => p.dischargeStatus === "Discharged").length;
  const duesCount        = patients.filter((p) => (p.balance || 0) > 0).length;
  const totalDuesAmount  = patients.reduce((sum, p) => sum + (p.balance > 0 ? p.balance : 0), 0);

  // --- recent patients: admitted TODAY only (not yesterday / earlier days) ---
  const recentPatients = patients
    .filter((p) => toDateStr(p.admissionDate) === today)
    .sort((a, b) => new Date(b.admissionDate) - new Date(a.admissionDate));

  // --- follow-ups ---
  const pendingFollowUps = followUps
    .filter((p) => p.followUpStatus === "Pending" && p.followUpDate)
    .sort((a, b) => new Date(a.followUpDate) - new Date(b.followUpDate));

  const todayFollowUps = pendingFollowUps.filter((p) => p.followUpDate === today);

  const upcomingFollowUps = pendingFollowUps
    .filter((p) => p.followUpDate >= today && new Date(p.followUpDate) <= next7)
    .slice(0, 5);

  const pendingReminders = followUps
    .filter((p) => p.reminderEnabled && p.reminderStatus === "Pending" && p.followUpDate >= today)
    .sort((a, b) => new Date(a.followUpDate) - new Date(b.followUpDate))
    .slice(0, 5);

  const cards = [
    {
      label: "Total Patients",
      value: totalPatients,
      icon: Users,
      color: "violet",
    //   onClick: () => navigate("/ipd"),
    },
    {
      label: "Admitted",
      value: admittedCount,
      icon: BedDouble,
      color: "blue",
    //   onClick: () => navigate("/ipd"),
    },
    {
      label: "Pending Follow-Ups",
      value: pendingFollowUps.length,
      icon: CalendarClock,
      color: "amber",
    //   onClick: () => navigate("/ipd/followups"),
    },
    {
      label: "Discharged",
      value: dischargedCount,
      icon: CheckCircle2,
      color: "emerald",
    //   onClick: () => navigate("/ipd"),
    },
     
  ];

  const colorClasses = {
    violet:  "bg-violet-50 dark:bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-100 dark:border-violet-500/20",
    blue:    "bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-500/20",
    amber:   "bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-500/20",
    emerald: "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/20",
    red:     "bg-red-50 dark:bg-red-500/15 text-red-600 dark:text-red-400 border-red-100 dark:border-red-500/20",
  };

  return (
    <div className="w-full px-2 sm:px-4 max-w-7xl mx-auto">
      <PageHeader title="Doctor Dashboard" subtitle="IPD ward overview at a glance" />

      {error && (
        <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-xl px-4 py-3 text-rose-600 dark:text-rose-400 text-sm font-medium mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="flex items-center gap-3 text-slate-400 dark:text-slate-500 text-sm font-medium">
            <Loader2 className="w-5 h-5 animate-spin" /> Loading dashboard...
          </div>
        </div>
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
            {cards.map((c) => {
              const Icon = c.icon;
              return (
                <button
                  key={c.label}
                  onClick={c.onClick}
                  className="text-left bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm dark:shadow-none hover:shadow-md hover:-translate-y-0.5 transition-all"
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center border mb-3 ${colorClasses[c.color]}`}>
                    <Icon className="w-4.5 h-4.5" />
                  </div>
                  <p className="text-2xl font-bold text-slate-800 dark:text-white leading-tight">{c.value}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">{c.label}</p>
                  {c.sub && <p className="text-[11px] text-red-500 dark:text-red-400 font-semibold mt-1">{c.sub}</p>}
                </button>
              );
            })}
          </div>

          {/* Row: Recent Patients (today's admissions) + Upcoming Follow-Ups */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mb-5">
            {/* Recent Patients panel — TODAY's admissions only */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm dark:shadow-none">
              <div className="flex items-center justify-between mb-3">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-white">
                  <BedDouble className="w-4 h-4 text-blue-500" /> Recent Patients
                </h3>
                <button
                  onClick={() => navigate("/doctor/ipd")}
                  className="flex items-center gap-1 text-xs font-semibold text-violet-600 dark:text-violet-400 hover:underline"
                >
                  View all <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              {recentPatients.length === 0 ? (
                <EmptyState icon={BedDouble} message="No patients admitted today" />
              ) : (
                <div className="space-y-2.5">
                  {recentPatients.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center gap-3 border border-slate-100 dark:border-slate-800 rounded-xl p-2.5"
                    >
                      <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs border border-blue-100 dark:border-transparent flex-shrink-0">
                        {p.name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 dark:text-white truncate">{p.name}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500">
                          {p.serialNumber ? `${p.serialNumber} · ` : ""}
                          {new Date(p.admissionDate).toLocaleDateString()}
                          {p.admissionTime ? `, ${p.admissionTime}` : ""}
                        </p>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-500/20 font-semibold flex-shrink-0">
                        {p.dischargeStatus || "Admitted"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Upcoming Follow-Ups panel */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm dark:shadow-none">
              <div className="flex items-center justify-between mb-3">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-white">
                  <CalendarClock className="w-4 h-4 text-violet-500" /> Upcoming Follow-Ups
                </h3>
                <button
                  onClick={() => navigate("/doctor/ipd/followups")}
                  className="flex items-center gap-1 text-xs font-semibold text-violet-600 dark:text-violet-400 hover:underline"
                >
                  View all <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              {upcomingFollowUps.length === 0 ? (
                <EmptyState icon={CalendarClock} message="No follow-ups in the next 7 days" />
              ) : (
                <div className="space-y-2.5">
                  {upcomingFollowUps.map((p) => {
                    const isToday = p.followUpDate === today;
                    return (
                      <div
                        key={p.id}
                        className="flex items-center gap-3 border border-slate-100 dark:border-slate-800 rounded-xl p-2.5"
                      >
                        <div className="w-8 h-8 rounded-full bg-violet-50 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 flex items-center justify-center font-bold text-xs border border-violet-100 dark:border-transparent flex-shrink-0">
                          {p.name[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 dark:text-white truncate">{p.name}</p>
                          <p className="text-xs text-slate-400 dark:text-slate-500">{p.followUpDate}</p>
                        </div>
                        {isToday && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 font-semibold border border-amber-200 dark:border-amber-500/30 flex-shrink-0">
                            Today
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Pending Reminders panel — full width, below */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm dark:shadow-none">
            <div className="flex items-center justify-between mb-3">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-white">
                <Bell className="w-4 h-4 text-red-500" /> Pending Reminders
              </h3>
              <button
                onClick={() => navigate("/doctor/ipd/followups")}
                className="flex items-center gap-1 text-xs font-semibold text-violet-600 dark:text-violet-400 hover:underline"
              >
                View all <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {pendingReminders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <CheckCircle2 className="w-9 h-9 text-emerald-400 dark:text-emerald-500" strokeWidth={1.5} />
                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">No pending reminders</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {pendingReminders.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 border border-slate-100 dark:border-slate-800 rounded-xl p-2.5"
                  >
                    <div className="w-8 h-8 rounded-full bg-violet-50 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 flex items-center justify-center font-bold text-xs border border-violet-100 dark:border-transparent flex-shrink-0">
                      {p.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 dark:text-white truncate">{p.name}</p>
                      <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
                        <CalendarClock className="w-3 h-3" /> {p.followUpDate}
                        {p.phone && (
                          <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{p.phone}</span>
                        )}
                      </div>
                    </div>
                    {p.phone && (
                      <a
                        href={`https://wa.me/91${p.phone}?text=Dear ${encodeURIComponent(p.name)}, your follow-up is scheduled on ${p.followUpDate}.`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 hover:bg-emerald-100 dark:hover:bg-emerald-500/30 transition-colors flex-shrink-0"
                      >
                        <MessageCircle className="w-3 h-3" /> WhatsApp
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {duesCount > 0 && (
            <p className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 mt-5">
              <AlertCircle className="w-3.5 h-3.5" />
              {duesCount} patient{duesCount > 1 ? "s" : ""} still have pending balances — check the patient list for details.
            </p>
          )}
        </>
      )}
    </div>
  );
}