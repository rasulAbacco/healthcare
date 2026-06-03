// client/src/pages/doctor/DoctorOPDDashboard.jsx
import { useState } from "react";
import OPDPatientList from "../opd/OPDPatientList";
import OPDFollowUps from "../opd/OPDFollowUps";
import { Users, CalendarClock, ShieldAlert } from "lucide-react";

export function DoctorOPDDashboard({ patients, setPatients }) {
  const [tab, setTab] = useState("patients");

  return (
    <div>
      {/* Read-only banner for payment restrictions */}
      <div className="flex items-center gap-2.5 px-4 py-2.5 mb-5 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl w-fit text-xs text-amber-700 dark:text-amber-400 font-medium">
        <ShieldAlert className="w-4 h-4 flex-shrink-0" />
        Read-only for payments — Doctor can add diagnosis, prescription &amp; notes
      </div>

      {/* Tab switcher */}
      <div className="flex items-center gap-1 mb-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-1 w-fit shadow-sm dark:shadow-none transition-colors duration-300">
        {[
          { key: "patients",  label: "Patients",   icon: Users },
          { key: "followups", label: "Follow-Ups", icon: CalendarClock },
        ].map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                tab === t.key
                  ? "bg-teal-50 dark:bg-teal-500/20 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-500/20"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* readOnly=true restricts delete/edit payment, but OPDPatientDetails shows doctor edit section when readOnly=true */}
      {tab === "patients"  && <OPDPatientList patients={patients} setPatients={setPatients || (() => {})} readOnly />}
      {tab === "followups" && <OPDFollowUps   patients={patients} />}
    </div>
  );
}