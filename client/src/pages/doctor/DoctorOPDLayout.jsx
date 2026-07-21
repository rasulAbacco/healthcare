// client/src/pages/doctor/DoctorOPDLayout.jsx
// NEW FILE — add this alongside DoctorOPDDashboard.jsx
//
// Renders the read-only banner + a tab strip that are REAL routes (NavLink),
// so the URL always matches what's on screen and the sidebar highlights
// correctly. The three doctor-OPD routes (dashboard/patients/followups) all
// render inside this layout via <Outlet />.
import { Outlet } from "react-router-dom";
import { ShieldAlert } from "lucide-react";

export default function DoctorOPDLayout() {
  return (
    <div>
      {/* Read-only banner for payment restrictions */}
      <div className="flex items-center gap-2.5 px-4 py-2.5 mb-5 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl w-fit text-xs text-amber-700 dark:text-amber-400 font-medium">
        <ShieldAlert className="w-4 h-4 flex-shrink-0" />
        Read-only for payments — Doctor can add diagnosis, prescription &amp; notes
      </div>

      <Outlet />
    </div>
  );
}