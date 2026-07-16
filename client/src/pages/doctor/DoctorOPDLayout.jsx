// client/src/pages/doctor/DoctorOPDLayout.jsx
// NEW FILE — add this alongside DoctorOPDDashboard.jsx
//
// Renders the read-only banner + a tab strip that are REAL routes (NavLink),
// so the URL always matches what's on screen and the sidebar highlights
// correctly. The three doctor-OPD routes (dashboard/patients/followups) all
// render inside this layout via <Outlet />.
import { Outlet } from "react-router-dom";
import { NavLink } from "react-router-dom";
import { Users, CalendarClock, ShieldAlert, LayoutDashboard, IndianRupee } from "lucide-react";

const TABS = [
  { key: "dashboard", label: "Dashboard",  icon: LayoutDashboard, to: "/doctor/opd/dashboard" },
  { key: "patients",  label: "Patients",   icon: Users,           to: "/doctor/opd/patients"  },
  { key: "followups", label: "Follow-Ups", icon: CalendarClock,   to: "/doctor/opd/followups" },
  // { key: "revenue",   label: "Revenue",    icon: IndianRupee,     to: "/doctor/opd/revenue"   },
];

export default function DoctorOPDLayout() {
  return (
    <div>
      {/* Read-only banner for payment restrictions */}
      <div className="flex items-center gap-2.5 px-4 py-2.5 mb-5 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl w-fit text-xs text-amber-700 dark:text-amber-400 font-medium">
        <ShieldAlert className="w-4 h-4 flex-shrink-0" />
        Read-only for payments — Doctor can add diagnosis, prescription &amp; notes
      </div>

      {/* Tab switcher — now real routes */}
      <div className="flex items-center gap-1 mb-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-1 w-fit shadow-sm dark:shadow-none transition-colors duration-300">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <NavLink
              key={t.key}
              to={t.to}
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? "bg-teal-50 dark:bg-teal-500/20 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-500/20"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
                }`
              }
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{t.label}</span>
            </NavLink>
          );
        })}
      </div>

      <Outlet />
    </div>
  );
}