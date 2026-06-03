// client/src/pages/opd/OPDDashboard.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { opdPatients as initialData } from "../../data/dummyData";
import { StatCard, PageHeader, StatusBadge } from "../../components/UI";
import { Users, Stethoscope, Banknote, Smartphone, UserPlus, TrendingUp, CalendarClock, Bell, ArrowRight } from "lucide-react";

export default function OPDDashboard() {
  const [patients] = useState(initialData);
  const navigate = useNavigate();

  const today = patients.filter(p => p.visitDate === "2025-01-15");
  const todayStr = new Date().toISOString().split("T")[0];

  const totalFee   = today.reduce((s, p) => s + p.fee, 0);
  const totalCash  = today.reduce((s, p) => s + p.cash, 0);
  const totalUPI   = today.reduce((s, p) => s + p.upi, 0);
  const recentPatients = [...patients].reverse().slice(0, 5);

  // Today's follow-ups
  const todayFollowUps = patients.filter(p => p.followUpDate === todayStr);

  // Incoming patients (next 7 days)
  const next7 = new Date();
  next7.setDate(next7.getDate() + 7);
  const incomingPatients = patients
    .filter(p => p.followUpDate && p.followUpDate >= todayStr && new Date(p.followUpDate) <= next7)
    .sort((a, b) => new Date(a.followUpDate) - new Date(b.followUpDate))
    .slice(0, 5);

  // Pending reminders
  const pendingReminders = patients.filter(p => p.reminderEnabled && p.reminderStatus === "Pending" && p.followUpDate >= todayStr);

  return (
    <div>
      <PageHeader
        title="OPD Dashboard"
        subtitle="Outpatient Department Overview"
        action={
          <button
            onClick={() => navigate("/opd/register")}
            className="flex items-center gap-2 bg-gradient-to-r from-teal-500 to-cyan-400 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:scale-[1.02] transition-transform shadow-lg shadow-teal-500/20"
          >
            <UserPlus className="w-4 h-4" />
            <span>Register Patient</span>
          </button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <StatCard label="Patients Today"          value={today.length}                               icon={Users}       color="blue"   sub="Jan 15, 2025" />
        <StatCard label="Consultation Collection" value={`₹${totalFee.toLocaleString()}`}            icon={Stethoscope} color="green"  sub="Today's fees" />
        <StatCard label="Cash Collection"         value={`₹${totalCash.toLocaleString()}`}           icon={Banknote}    color="yellow" sub="Cash payments" />
        <StatCard label="UPI Collection"          value={`₹${totalUPI.toLocaleString()}`}            icon={Smartphone}  color="purple" sub="UPI payments" />
      </div>

      {/* New: Today's Follow-Ups, Incoming, Reminders row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {/* Today's Follow-Ups */}
        <div className="bg-amber-50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/20 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-amber-800 dark:text-amber-400 font-semibold text-sm flex items-center gap-2">
              <CalendarClock className="w-4 h-4" /> Today's Follow-Ups
            </h3>
            <button onClick={() => navigate("/opd/followups")} className="text-amber-600 dark:text-amber-400 text-xs font-medium hover:underline">
              View All →
            </button>
          </div>
          {todayFollowUps.length === 0 ? (
            <p className="text-amber-600/70 dark:text-amber-400/50 text-xs">No follow-ups today</p>
          ) : (
            <div className="space-y-2">
              {todayFollowUps.slice(0, 3).map(p => (
                <div key={p.id} className="flex items-center gap-2 text-xs">
                  <div className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center justify-center font-bold text-[10px] flex-shrink-0">
                    {p.name[0]}
                  </div>
                  <span className="text-slate-700 dark:text-slate-300 font-medium truncate">{p.name}</span>
                  <StatusBadge status={p.condition} />
                </div>
              ))}
              {todayFollowUps.length > 3 && <p className="text-amber-600/70 dark:text-amber-400/50 text-xs">+{todayFollowUps.length - 3} more</p>}
            </div>
          )}
          <div className="mt-3 text-2xl font-bold text-amber-700 dark:text-amber-400">{todayFollowUps.length}</div>
        </div>

        {/* Incoming Patients */}
        <div className="bg-blue-50 dark:bg-blue-500/5 border border-blue-200 dark:border-blue-500/20 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-blue-800 dark:text-blue-400 font-semibold text-sm flex items-center gap-2">
              <Users className="w-4 h-4" /> Incoming (7 days)
            </h3>
            <button onClick={() => navigate("/opd/followups")} className="text-blue-600 dark:text-blue-400 text-xs font-medium hover:underline">
              View All →
            </button>
          </div>
          {incomingPatients.length === 0 ? (
            <p className="text-blue-600/70 dark:text-blue-400/50 text-xs">No upcoming patients</p>
          ) : (
            <div className="space-y-2">
              {incomingPatients.slice(0, 3).map(p => (
                <div key={p.id} className="flex items-center gap-2 text-xs">
                  <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 flex items-center justify-center font-bold text-[10px] flex-shrink-0">
                    {p.name[0]}
                  </div>
                  <span className="text-slate-700 dark:text-slate-300 font-medium truncate">{p.name}</span>
                  <span className="text-blue-500 dark:text-blue-400 ml-auto flex-shrink-0">{p.followUpDate}</span>
                </div>
              ))}
              {incomingPatients.length > 3 && <p className="text-blue-600/70 dark:text-blue-400/50 text-xs">+{incomingPatients.length - 3} more</p>}
            </div>
          )}
          <div className="mt-3 text-2xl font-bold text-blue-700 dark:text-blue-400">{incomingPatients.length}</div>
        </div>

        {/* Pending Reminders */}
        <div className="bg-violet-50 dark:bg-violet-500/5 border border-violet-200 dark:border-violet-500/20 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-violet-800 dark:text-violet-400 font-semibold text-sm flex items-center gap-2">
              <Bell className="w-4 h-4" /> Pending Reminders
            </h3>
            <button onClick={() => navigate("/opd/followups")} className="text-violet-600 dark:text-violet-400 text-xs font-medium hover:underline">
              Send →
            </button>
          </div>
          {pendingReminders.length === 0 ? (
            <p className="text-violet-600/70 dark:text-violet-400/50 text-xs">All reminders sent</p>
          ) : (
            <div className="space-y-2">
              {pendingReminders.slice(0, 3).map(p => (
                <div key={p.id} className="flex items-center gap-2 text-xs">
                  <div className="w-6 h-6 rounded-full bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-400 flex items-center justify-center font-bold text-[10px] flex-shrink-0">
                    {p.name[0]}
                  </div>
                  <span className="text-slate-700 dark:text-slate-300 font-medium truncate">{p.name}</span>
                  <span className="text-violet-500 dark:text-violet-400 ml-auto flex-shrink-0">{p.phone}</span>
                </div>
              ))}
              {pendingReminders.length > 3 && <p className="text-violet-600/70 dark:text-violet-400/50 text-xs">+{pendingReminders.length - 3} more</p>}
            </div>
          )}
          <div className="mt-3 text-2xl font-bold text-violet-700 dark:text-violet-400">{pendingReminders.length}</div>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {/* Payment split */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm dark:shadow-none transition-colors duration-300">
          <h3 className="text-slate-800 dark:text-white font-semibold text-sm mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-slate-400 dark:text-slate-500" />
            Payment Split (Today)
          </h3>
          <div className="space-y-3">
            {[
              { label: "Cash", amount: totalCash, color: "bg-amber-400" },
              { label: "UPI",  amount: totalUPI,  color: "bg-violet-400" },
            ].map(item => (
              <div key={item.label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-500 dark:text-slate-400">{item.label}</span>
                  <span className="text-slate-800 dark:text-white font-medium">₹{item.amount.toLocaleString()}</span>
                </div>
                <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${item.color} rounded-full transition-all duration-700`}
                    style={{ width: totalFee ? `${(item.amount / totalFee) * 100}%` : "0%" }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* All-time stats */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm dark:shadow-none transition-colors duration-300">
          <h3 className="text-slate-800 dark:text-white font-semibold text-sm mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-slate-400 dark:text-slate-500" />
            All Time Stats
          </h3>
          <div className="space-y-2">
            {[
              { label: "Total Patients", val: patients.length,                                                          color: "text-blue-600 dark:text-blue-400" },
              { label: "Total Revenue",  val: `₹${patients.reduce((s, p) => s + p.total, 0).toLocaleString()}`,         color: "text-emerald-600 dark:text-emerald-400" },
              { label: "Total Cash",     val: `₹${patients.reduce((s, p) => s + p.cash, 0).toLocaleString()}`,          color: "text-amber-600 dark:text-amber-400" },
              { label: "Total UPI",      val: `₹${patients.reduce((s, p) => s + p.upi, 0).toLocaleString()}`,           color: "text-violet-600 dark:text-violet-400" },
            ].map(item => (
              <div key={item.label} className="flex justify-between items-center py-1.5 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400 text-sm">{item.label}</span>
                <span className={`font-bold text-sm ${item.color}`}>{item.val}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Follow-Ups */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm dark:shadow-none transition-colors duration-300 sm:col-span-2 lg:col-span-1">
          <h3 className="text-slate-800 dark:text-white font-semibold text-sm mb-4 flex items-center gap-2">
            <CalendarClock className="w-4 h-4 text-slate-400 dark:text-slate-500" />
            Upcoming Follow-Ups
          </h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {patients.filter(p => p.followUpDate).slice(0, 5).map(p => (
              <div key={p.id} className="flex items-center gap-3 py-1.5">
                <div className="w-8 h-8 rounded-full bg-teal-50 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center text-xs font-bold flex-shrink-0 border border-teal-100 dark:border-transparent">
                  {p.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-slate-800 dark:text-white text-xs font-medium truncate">{p.name}</div>
                  <div className="text-slate-400 dark:text-slate-500 text-xs">{p.followUpDate}</div>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 flex-shrink-0">
                  {p.condition}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent patients */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm dark:shadow-none transition-colors duration-300">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
          <h3 className="text-slate-800 dark:text-white font-semibold text-sm flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-400 dark:text-slate-500" /> Recent Patients
          </h3>
          <button
            onClick={() => navigate("/opd/patients")}
            className="text-teal-600 dark:text-teal-400 text-xs hover:text-teal-700 dark:hover:text-teal-300 transition-colors font-medium"
          >
            View All →
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[540px]">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50">
                {["Token", "Patient", "Age", "Phone", "Fee", "Payment", "Visit Date"].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-500 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentPatients.map(p => (
                <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors border-t border-slate-100 dark:border-slate-800/50">
                  <td className="px-5 py-3.5 font-mono text-xs text-teal-600 dark:text-teal-400 font-bold">{p.serialNumber}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-teal-50 dark:bg-teal-500/20 flex items-center justify-center text-teal-600 dark:text-teal-400 text-xs font-bold border border-teal-100 dark:border-transparent flex-shrink-0">
                        {p.name[0]}
                      </div>
                      <span className="text-slate-800 dark:text-white font-medium truncate">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400">{p.age}y</td>
                  <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400">{p.phone}</td>
                  <td className="px-5 py-3.5 text-emerald-600 dark:text-emerald-400 font-medium">₹{p.fee}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex gap-1 flex-wrap">
                      {p.cash > 0 && <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-transparent">Cash</span>}
                      {p.upi  > 0 && <span className="text-xs px-2 py-0.5 rounded-full bg-violet-50 dark:bg-violet-500/15 text-violet-700 dark:text-violet-400 border border-violet-200 dark:border-transparent">UPI</span>}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400">{p.visitDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}