// client/src/pages/admin/AdminDashboard.jsx
// Combined overview for Admin.
//
// Data sources:
//   /opd/patients/stats       (opd.controller.js getStats)
//   /opd/patients             (opd.controller.js list — used client-side for
//                               daily/monthly trends, recent registrations,
//                               follow-ups, and today's appointments)
//   /ipd/stats                (ipd.controller.js getStats — mounted flat)
//   /ipd/patients              (ipd.controller.js list — used client-side for
//                               admissions/discharges trend + recent lists)
//   /pharmacy/medicines/stats (medicine.controller.js getMedicineStats)
//   /pharmacy/medicines        (medicine.controller.js list — used for stock
//                               status, top-consumed medicines, low-stock list)
//   /admin/employees          (admin.controller.js listEmployees)
//
// NOTE: the four "*.list" endpoints below are assumed to mirror the existing
// naming pattern of their sibling "*.stats" endpoints. If your actual routes
// differ, update the ENDPOINTS object — everything else derives from these
// four strings, and every list-based section fails independently (via
// Promise.allSettled) so one wrong path only disables its own charts/widgets
// rather than the whole dashboard.
import { useState, useEffect, useMemo } from "react";
import { api } from "../../lib/api";
import { StatCard } from "../../components/UI";
import {
  Users, Activity, CalendarClock, AlertTriangle, IndianRupee,
  BedDouble, Wallet, Pill, PackageX, Clock, Loader2, Stethoscope,
  UserCog, Building2, PackageCheck, PackageSearch, TrendingUp,
  ClipboardList, CalendarCheck2, CalendarDays, UserCheck,
} from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";

const ENDPOINTS = {
  opdStats: "/opd/patients/stats",
  opdList: "/opd/patients",
  ipdStats: "/ipd/stats",
  ipdList: "/ipd/patients",
  pharmacyStats: "/pharmacy/medicines/stats",
  pharmacyList: "/pharmacy/medicines",
  employees: "/admin/employees",
};

const COLORS = {
  teal: "#14b8a6",
  cyan: "#22d3ee",
  violet: "#8b5cf6",
  purple: "#a78bfa",
  emerald: "#10b981",
  blue: "#3b82f6",
  amber: "#f59e0b",
  rose: "#f43f5e",
  slate: "#94a3b8",
};

// ---------------------------------------------------------------------------
// Date helpers — everything below works off plain JS Dates, no library.
// ---------------------------------------------------------------------------
function toDateOnly(d) {
  const date = new Date(d);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
function sameDay(a, b) {
  const x = toDateOnly(a), y = toDateOnly(b);
  return x.getTime() === y.getTime();
}
function isToday(d) {
  if (!d) return false;
  return sameDay(d, new Date());
}
function lastNDays(n) {
  const days = [];
  const today = toDateOnly(new Date());
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.push(d);
  }
  return days;
}
function lastNMonths(n) {
  const months = [];
  const today = new Date();
  for (let i = n - 1; i >= 0; i--) {
    months.push(new Date(today.getFullYear(), today.getMonth() - i, 1));
  }
  return months;
}
const DAY_LABEL = (d) => d.toLocaleDateString("en-IN", { weekday: "short" });
const MONTH_LABEL = (d) => d.toLocaleDateString("en-IN", { month: "short" });

function groupByDay(list, dateField, n = 7) {
  const days = lastNDays(n);
  return days.map((d) => ({
    label: DAY_LABEL(d),
    count: list.filter((item) => item?.[dateField] && sameDay(item[dateField], d)).length,
  }));
}
function groupByMonth(list, dateField, n = 6) {
  const months = lastNMonths(n);
  return months.map((m) => ({
    label: MONTH_LABEL(m),
    count: list.filter((item) => {
      if (!item?.[dateField]) return false;
      const d = new Date(item[dateField]);
      return d.getFullYear() === m.getFullYear() && d.getMonth() === m.getMonth();
    }).length,
  }));
}
function safeArray(v) {
  return Array.isArray(v) ? v : [];
}
function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default function AdminDashboard() {
  const [opd, setOpd] = useState(null);
  const [ipd, setIpd] = useState(null);
  const [pharmacy, setPharmacy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [opdPatients, setOpdPatients] = useState([]);
  const [ipdPatients, setIpdPatients] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [employees, setEmployees] = useState([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      try {
        // Core stats power the four summary cards — if any of these three
        // fail, the whole dashboard is genuinely unusable, so this part
        // still throws on failure like before.
        const [opdData, ipdData, pharmacyData] = await Promise.all([
          api.get(ENDPOINTS.opdStats),
          api.get(ENDPOINTS.ipdStats),
          api.get(ENDPOINTS.pharmacyStats),
        ]);
        if (cancelled) return;
        setOpd(opdData);
        setIpd(ipdData);
        setPharmacy(pharmacyData);
      } catch (err) {
        if (!cancelled) setError(err.message || "Could not load dashboard data.");
      } finally {
        if (!cancelled) setLoading(false);
      }

      // Everything analytics/widgets need is best-effort: each list is
      // fetched independently so one missing/renamed endpoint only takes
      // out its own charts, not the page.
      const [opdListRes, ipdListRes, medsRes, empRes] = await Promise.allSettled([
        api.get(ENDPOINTS.opdList),
        api.get(ENDPOINTS.ipdList),
        api.get(ENDPOINTS.pharmacyList),
        api.get(ENDPOINTS.employees),
      ]);
      if (cancelled) return;

      if (opdListRes.status === "fulfilled") {
        setOpdPatients(safeArray(opdListRes.value?.patients || opdListRes.value?.opdPatients || opdListRes.value));
      }
      if (ipdListRes.status === "fulfilled") {
        setIpdPatients(safeArray(ipdListRes.value?.patients || ipdListRes.value?.ipdPatients || ipdListRes.value));
      }
      if (medsRes.status === "fulfilled") {
        setMedicines(safeArray(medsRes.value?.medicines || medsRes.value));
      }
      if (empRes.status === "fulfilled") {
        setEmployees(safeArray(empRes.value?.employees || empRes.value));
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  // ---- Derived: Employees summary (client-side, from /admin/employees) ----
  const employeeSummary = useMemo(() => {
    const total = employees.length;
    const active = employees.filter((e) => e.isActive).length;
    const departments = new Set(employees.map((e) => (e.designation || "").trim()).filter(Boolean));
    return { total, active, departments: departments.size };
  }, [employees]);

  const employeesByDept = useMemo(() => {
    const counts = {};
    employees.forEach((e) => {
      const dept = (e.designation || "Unspecified").trim() || "Unspecified";
      counts[dept] = (counts[dept] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [employees]);

  const employeeActiveInactive = useMemo(() => ([
    { label: "Active", value: employees.filter((e) => e.isActive).length, color: COLORS.emerald },
    { label: "Inactive", value: employees.filter((e) => !e.isActive).length, color: COLORS.slate },
  ]), [employees]);

  // ---- Derived: OPD analytics ----
  const opdDaily = useMemo(() => groupByDay(opdPatients, "visitDate", 7), [opdPatients]);
  const opdMonthly = useMemo(() => groupByMonth(opdPatients, "visitDate", 6), [opdPatients]);
  const recentOpdRegistrations = useMemo(
    () => [...opdPatients]
      .sort((a, b) => new Date(b.visitDate || b.createdAt) - new Date(a.visitDate || a.createdAt))
      .slice(0, 5),
    [opdPatients]
  );
  const todaysAppointments = useMemo(
    () => opdPatients.filter((p) => isToday(p.visitDate)),
    [opdPatients]
  );
  const upcomingFollowUps = useMemo(() => {
    const today = toDateOnly(new Date());
    const fromOpd = opdPatients
      .filter((p) => p.followUpDate && p.followUpStatus === "PENDING" && toDateOnly(p.followUpDate) >= today)
      .map((p) => ({ name: p.name, date: p.followUpDate, source: "OPD" }));
    const fromIpd = ipdPatients
      .filter((p) => p.followUpDate && p.followUpStatus === "PENDING" && toDateOnly(p.followUpDate) >= today)
      .map((p) => ({ name: p.name, date: p.followUpDate, source: "IPD" }));
    return [...fromOpd, ...fromIpd]
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, 5);
  }, [opdPatients, ipdPatients]);

  // ---- Derived: IPD analytics ----
  const ipdAdmissionsDischarges = useMemo(() => {
    const months = lastNMonths(6);
    return months.map((m) => ({
      label: MONTH_LABEL(m),
      admissions: ipdPatients.filter((p) => {
        if (!p.admissionDate) return false;
        const d = new Date(p.admissionDate);
        return d.getFullYear() === m.getFullYear() && d.getMonth() === m.getMonth();
      }).length,
      discharges: ipdPatients.filter((p) => {
        if (!p.dischargeDate) return false;
        const d = new Date(p.dischargeDate);
        return d.getFullYear() === m.getFullYear() && d.getMonth() === m.getMonth();
      }).length,
    }));
  }, [ipdPatients]);

  const ipdOccupancy = useMemo(() => ([
    { label: "Currently Admitted", value: ipd?.activeCount || 0, color: COLORS.violet },
    { label: "Discharged", value: ipd?.dischargedCount || 0, color: COLORS.slate },
  ]), [ipd]);

  const recentAdmissions = useMemo(
    () => [...ipdPatients]
      .filter((p) => p.admissionDate)
      .sort((a, b) => new Date(b.admissionDate) - new Date(a.admissionDate))
      .slice(0, 5),
    [ipdPatients]
  );
  const recentDischarges = useMemo(
    () => [...ipdPatients]
      .filter((p) => p.dischargeDate)
      .sort((a, b) => new Date(b.dischargeDate) - new Date(a.dischargeDate))
      .slice(0, 5),
    [ipdPatients]
  );

  // ---- Derived: Pharmacy analytics ----
  const stockStatus = useMemo(() => {
    let available = 0, low = 0, out = 0;
    medicines.forEach((m) => {
      const qty = Number(m.quantity) || 0;
      const reorder = Number(m.reorderLevel) || 0;
      if (qty <= 0) out += 1;
      else if (qty <= reorder) low += 1;
      else available += 1;
    });
    return [
      { label: "Available", value: available, color: COLORS.emerald },
      { label: "Low Stock", value: low, color: COLORS.amber },
      { label: "Out of Stock", value: out, color: COLORS.rose },
    ];
  }, [medicines]);

  // Consumed units (initialQuantity - quantity) is used as a proxy for how
  // much a medicine has been dispensed, since per-dispense counts aren't
  // exposed by the stats endpoint.
  const topConsumedMedicines = useMemo(() => {
    return [...medicines]
      .map((m) => ({
        label: m.drugName || m.name || "Unknown",
        consumed: Math.max(0, (Number(m.initialQuantity) || 0) - (Number(m.quantity) || 0)),
      }))
      .filter((m) => m.consumed > 0)
      .sort((a, b) => b.consumed - a.consumed)
      .slice(0, 6);
  }, [medicines]);

  const lowStockList = useMemo(() => {
    return medicines
      .filter((m) => (Number(m.quantity) || 0) <= (Number(m.reorderLevel) || 0))
      .sort((a, b) => (Number(a.quantity) || 0) - (Number(b.quantity) || 0))
      .slice(0, 6);
  }, [medicines]);

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

  return (
    <div className="space-y-10">

       <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-slate-400" />
          <h2 className="text-base font-bold text-slate-800 dark:text-white">Dashboard Analytics</h2>
        </div>

      {/* ================= Summary cards ================= */}
      <section>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard
            icon={Stethoscope}
            title="OPD"
            accent="teal"
            rows={[
              { label: "Total Patients", value: opd.totalPatients ?? 0 },
              { label: "Today's Patients", value: opd.seenToday ?? 0 },
              { label: "Total Visits", value: opd.totalPatients ?? 0 },
            ]}
          />
          <SummaryCard
            icon={BedDouble}
            title="IPD"
            accent="violet"
            rows={[
              { label: "Total Admitted", value: ipd.totalAdmittedEver ?? 0 },
              { label: "Currently Admitted", value: ipd.activeCount ?? 0 },
              { label: "Total Discharged", value: ipd.dischargedCount ?? 0 },
            ]}
          />
          <SummaryCard
            icon={Pill}
            title="Pharmacy"
            accent="emerald"
            rows={[
              { label: "Total Medicines", value: pharmacy.totalMedicines ?? 0 },
              { label: "Available Stock", value: stockStatus[0].value },
              { label: "Low Stock", value: pharmacy.lowStockCount ?? stockStatus[1].value },
            ]}
          />
          <SummaryCard
            icon={UserCog}
            title="Employees"
            accent="blue"
            rows={[
              { label: "Total Employees", value: employeeSummary.total },
              { label: "Active Employees", value: employeeSummary.active },
              { label: "Total Departments", value: employeeSummary.departments },
            ]}
          />
        </div>
      </section>

      {/* ================= Dashboard Analytics ================= */}
      <section className="space-y-8">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-slate-400" />
          <h2 className="text-base font-bold text-slate-800 dark:text-white">Dashboard Analytics</h2>
        </div>

        {/* OPD analytics */}
        <SubSection icon={Stethoscope} title="OPD Analytics" color="teal">
          <ChartCard title="Daily OPD Patients (Last 7 Days)">
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={opdDaily}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-200 dark:text-slate-800" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="currentColor" className="text-slate-400" />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="currentColor" className="text-slate-400" />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="count" name="Patients" stroke={COLORS.teal} strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title="Monthly OPD Patients">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={opdMonthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-200 dark:text-slate-800" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="currentColor" className="text-slate-400" />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="currentColor" className="text-slate-400" />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" name="Patients" fill={COLORS.cyan} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </SubSection>

        {/* IPD analytics */}
        <SubSection icon={BedDouble} title="IPD Analytics" color="violet">
          <ChartCard title="Admissions vs Discharges (Last 6 Months)">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={ipdAdmissionsDischarges}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-200 dark:text-slate-800" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="currentColor" className="text-slate-400" />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="currentColor" className="text-slate-400" />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                <Bar dataKey="admissions" name="Admissions" fill={COLORS.violet} radius={[6, 6, 0, 0]} />
                <Bar dataKey="discharges" name="Discharges" fill={COLORS.purple} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title="Current Occupancy">
            <DonutChart data={ipdOccupancy} />
          </ChartCard>
        </SubSection>

        {/* Pharmacy analytics */}
        <SubSection icon={Pill} title="Pharmacy Analytics" color="emerald">
          <ChartCard title="Medicine Stock Status">
            <DonutChart data={stockStatus} />
          </ChartCard>
          <ChartCard title="Top Consumed Medicines">
            {topConsumedMedicines.length === 0 ? (
              <EmptyChartState message="No dispensing activity recorded yet." />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={topConsumedMedicines} layout="vertical" margin={{ left: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-200 dark:text-slate-800" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} stroke="currentColor" className="text-slate-400" />
                  <YAxis type="category" dataKey="label" width={110} tick={{ fontSize: 11 }} stroke="currentColor" className="text-slate-400" />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="consumed" name="Units Consumed" fill={COLORS.emerald} radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </SubSection>

        {/* Employee analytics */}
        <SubSection icon={UserCog} title="Employee Analytics" color="blue">
          <ChartCard title="Employees by Department">
            {employeesByDept.length === 0 ? (
              <EmptyChartState message="No employee records yet." />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={employeesByDept}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-200 dark:text-slate-800" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="currentColor" className="text-slate-400" interval={0} angle={-20} textAnchor="end" height={60} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="currentColor" className="text-slate-400" />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="count" name="Employees" fill={COLORS.blue} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
          <ChartCard title="Active vs Inactive Employees">
            <DonutChart data={employeeActiveInactive} />
          </ChartCard>
        </SubSection>
      </section>

      

      <p className="text-xs text-slate-400 dark:text-slate-500">
        Pharmacy inventory values use per-unit price (purchase/selling price ÷ units per pack) — see the `unitsPerPack`
        field on each medicine. "Top Consumed Medicines" is derived from initial vs. current stock as a proxy for
        dispensing volume. Values will be approximate until a real per-dispense counter is tracked.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Presentational subcomponents
// ---------------------------------------------------------------------------

const ACCENTS = {
  teal: {
    ring: "from-teal-500 to-cyan-400",
    icon: "text-teal-500 bg-teal-50 dark:bg-teal-500/10",
    text: "text-teal-600 dark:text-teal-400",
  },
  violet: {
    ring: "from-violet-500 to-purple-400",
    icon: "text-violet-500 bg-violet-50 dark:bg-violet-500/10",
    text: "text-violet-600 dark:text-violet-400",
  },
  emerald: {
    ring: "from-emerald-500 to-teal-400",
    icon: "text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10",
    text: "text-emerald-600 dark:text-emerald-400",
  },
  blue: {
    ring: "from-blue-500 to-cyan-400",
    icon: "text-blue-500 bg-blue-50 dark:bg-blue-500/10",
    text: "text-blue-600 dark:text-blue-400",
  },
};

function SummaryCard({ icon: Icon, title, accent, rows }) {
  const a = ACCENTS[accent] || ACCENTS.teal;
  return (
    <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 h-full flex flex-col shadow-sm hover:shadow-md transition-shadow">
      <div className={`absolute inset-x-0 top-0 h-1 rounded-t-2xl bg-gradient-to-r ${a.ring}`} />
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${a.icon}`}>
          <Icon className="w-5 h-5" />
        </div>
        <h3 className="text-sm font-bold text-slate-800 dark:text-white">{title}</h3>
      </div>
      <div className="space-y-2.5 mt-auto">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between text-sm">
            <span className="text-slate-500 dark:text-slate-400">{r.label}</span>
            <span className={`font-bold ${a.text}`}>{typeof r.value === "number" ? r.value.toLocaleString("en-IN") : r.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const SUBSECTION_COLORS = {
  teal: "text-teal-500",
  violet: "text-violet-500",
  emerald: "text-emerald-500",
  blue: "text-blue-500",
};

function SubSection({ icon: Icon, title, color, children }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Icon className={`w-4 h-4 ${SUBSECTION_COLORS[color]}`} />
        <h3 className="text-sm font-bold text-slate-800 dark:text-white">{title}</h3>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">{children}</div>
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">{title}</h4>
      {children}
    </div>
  );
}

function EmptyChartState({ message }) {
  return (
    <div className="h-[240px] flex items-center justify-center text-sm text-slate-400 dark:text-slate-500 text-center px-6">
      {message}
    </div>
  );
}

const tooltipStyle = {
  borderRadius: 12,
  border: "1px solid rgba(148, 163, 184, 0.3)",
  fontSize: 12,
};

function DonutChart({ data }) {
  const total = data.reduce((sum, d) => sum + (d.value || 0), 0);
  if (total === 0) {
    return <EmptyChartState message="No data available yet." />;
  }
  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="label"
          innerRadius={60}
          outerRadius={90}
          paddingAngle={3}
        >
          {data.map((d, i) => (
            <Cell key={i} fill={d.color} />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

const WIDGET_COLORS = {
  violet: "text-violet-500 bg-violet-50 dark:bg-violet-500/10",
  teal: "text-teal-500 bg-teal-50 dark:bg-teal-500/10",
  slate: "text-slate-500 bg-slate-100 dark:bg-slate-800",
  rose: "text-rose-500 bg-rose-50 dark:bg-rose-500/10",
  amber: "text-amber-500 bg-amber-50 dark:bg-amber-500/10",
  cyan: "text-cyan-500 bg-cyan-50 dark:bg-cyan-500/10",
};

 