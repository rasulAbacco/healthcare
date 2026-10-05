// client/src/pages/admin/biometric/BiometricManagement.jsx
import { useState, useEffect, useCallback, useMemo } from "react";
import { api } from "../../../lib/api";
import {
  PageHeader,
  SearchBar,
  TableCard,
  Th,
  Td,
  SectionCard,
} from "../../../components/UI";
import {
  LayoutDashboard,
  MonitorSmartphone,
  Link2,
  Users2,
  FileBarChart,
  Plus,
  Loader2,
  Pencil,
  Power,
  X,
  UserPlus,
  Clock,
  Eye,
  Sun,
  Moon,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Wrench,
  Printer,
  LayoutList,
  CalendarDays,
  Info,
} from "lucide-react";

const TABS = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "devices", label: "Devices", icon: MonitorSmartphone },
  { key: "shifts", label: "Shifts", icon: Clock },
  { key: "userMapping", label: "User Mapping", icon: Link2 },
  { key: "employeeMapping", label: "Employee Mapping", icon: Users2 },
  { key: "report", label: "Attendance", icon: FileBarChart },
];

export default function BiometricManagement() {
  const [tab, setTab] = useState("dashboard");

  return (
    <div className="space-y-6 font-sans text-slate-900 bg-[#f4f5f7] dark:bg-slate-950 p-2 sm:p-4 rounded-3xl">
      <PageHeader
        title="Biometric Attendance"
        subtitle="Manage hardware devices, shift schedules, mappings, and attendance"
        action={
          <div className="flex gap-1.5 p-1 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-full shadow-2xs overflow-x-auto max-w-full">
            {TABS.map((t) => {
              const Icon = t.icon;
              const active = tab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-extrabold transition-all whitespace-nowrap ${
                    active
                      ? "bg-[#0f4a29] text-white shadow-xs"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-900"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" /> {t.label}
                </button>
              );
            })}
          </div>
        }
      />

      {tab === "dashboard" && <DashboardTab />}
      {tab === "devices" && <DevicesTab />}
      {tab === "shifts" && <ShiftsTab />}
      {tab === "userMapping" && <MappingTab kind="user" />}
      {tab === "employeeMapping" && <MappingTab kind="employee" />}
      {tab === "report" && <AttendanceTab />}
    </div>
  );
}

// ============================================================================
// Shared Subcomponents
// ============================================================================

function Banner({ error, info }) {
  return (
    <>
      {error && (
        <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/30 rounded-2xl px-4 py-3 text-rose-600 dark:text-rose-400 text-xs font-bold">
          {error}
        </div>
      )}
      {info && !error && (
        <div className="bg-[#0f4a29]/10 dark:bg-[#52b788]/20 border border-[#0f4a29]/20 text-[#0f4a29] dark:text-[#52b788] rounded-2xl px-4 py-3 text-xs font-bold">
          {info}
        </div>
      )}
    </>
  );
}

function Loading({ label }) {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="flex items-center gap-3 text-slate-400 text-xs font-bold">
        <Loader2 className="w-5 h-5 animate-spin text-[#0f4a29]" /> {label}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", placeholder, required }) {
  return (
    <div>
      <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
        {label}
        {required && <span className="text-rose-500 ml-0.5">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 dark:text-white focus:outline-none focus:border-[#0f4a29]"
      />
    </div>
  );
}

function IconBtn({ children, onClick, title }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
    >
      {children}
    </button>
  );
}

function Card({ label, value, sub, tone }) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-[24px] p-5 shadow-xs">
      <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500">
        {label}
      </p>
      <p className={`text-2xl font-extrabold mt-1 ${tone || "text-slate-900 dark:text-white"}`}>
        {value}
      </p>
      {sub && <p className="text-[11px] font-medium text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function Modal({ children, onClose, wide }) {
  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[28px] p-6 w-full shadow-2xl max-h-[90vh] overflow-y-auto ${wide ? "max-w-2xl" : "max-w-lg"}`}
      >
        {children}
      </div>
    </div>
  );
}

const selectCls =
  "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 dark:text-white focus:outline-none focus:border-[#0f4a29]";

function formatTime12h(value) {
  if (typeof value !== "string") return "—";
  const match = value.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return value;
  let hours = Number(match[1]);
  const minutes = match[2];
  const period = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  if (hours === 0) hours = 12;
  return `${hours}:${minutes} ${period}`;
}

function formatMinutesHrs(mins) {
  if (mins === null || mins === undefined) return "—";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

// ============================================================================
// Dashboard tab
// ============================================================================

function DashboardTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");
      try {
        const { dashboard } = await api.get("/biometric/dashboard");
        setData(dashboard);
      } catch (err) {
        setError(err.message || "Could not load dashboard.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <Loading label="Loading dashboard..." />;

  return (
    <div className="space-y-4">
      <Banner error={error} />
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card label="Devices" value={`${data.activeDevices}/${data.totalDevices}`} sub="active / total" />
          <Card label="Mapped Users" value={data.mappedUsers} />
          <Card label="Mapped Employees" value={data.mappedEmployees} />
          <Card label="Today's Punches" value={data.todaysPunches} />
          <Card
            label="Present Today"
            value={data.presentToday}
            sub={`${data.fullDayToday ?? data.presentToday} full · ${data.halfDayToday ?? 0} half`}
          />
          <Card label="Absent Today" value={data.absentToday} sub="estimated" />
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Devices tab
// ============================================================================

const emptyDeviceForm = { name: "", deviceCode: "", serialNumber: "", location: "" };

function DevicesTab() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [search, setSearch] = useState("");

  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState(emptyDeviceForm);
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(null);

  const fetchDevices = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { devices: data } = await api.get(
        `/biometric/devices${search ? `?search=${encodeURIComponent(search)}` : ""}`,
      );
      setDevices(data);
    } catch (err) {
      setError(err.message || "Could not load devices.");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");
    if (!createForm.name || !createForm.deviceCode || !createForm.serialNumber) {
      return setError("Name, device code, and serial number are required.");
    }
    setSaving(true);
    try {
      await api.post("/biometric/devices", createForm);
      setInfo(`${createForm.name} added.`);
      setCreateForm(emptyDeviceForm);
      setShowCreate(false);
      fetchDevices();
    } catch (err) {
      setError(err.message || "Could not create device.");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (d) => {
    setEditingId(d.id);
    setEditForm({
      name: d.name,
      deviceCode: d.deviceCode,
      serialNumber: d.serialNumber,
      location: d.location || "",
    });
  };

  const saveEdit = async (id) => {
    setError("");
    setInfo("");
    setSaving(true);
    try {
      await api.put(`/biometric/devices/${id}`, editForm);
      setInfo("Device updated.");
      setEditingId(null);
      fetchDevices();
    } catch (err) {
      setError(err.message || "Could not update device.");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (d) => {
    setError("");
    setInfo("");
    try {
      await api.patch(`/biometric/devices/${d.id}/toggle`);
      setInfo(`${d.name} ${d.isActive ? "disabled" : "enabled"}.`);
      fetchDevices();
    } catch (err) {
      setError(err.message || "Could not update device status.");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <SearchBar value={search} onChange={setSearch} placeholder="Search devices..." />
        <button
          onClick={() => setShowCreate((s) => !s)}
          className="flex items-center gap-2 bg-[#0f4a29] hover:bg-[#165a34] text-white text-xs font-extrabold px-5 py-2.5 rounded-full shadow-xs"
        >
          <Plus className="w-4 h-4" /> Add Device
        </button>
      </div>

      <Banner error={error} info={info} />

      {showCreate && (
        <SectionCard title="Add Biometric Device" icon={MonitorSmartphone}>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field
                label="Device Name"
                value={createForm.name}
                onChange={(v) => setCreateForm((f) => ({ ...f, name: v }))}
                placeholder="Main Gate ZKTeco"
                required
              />
              <Field
                label="Device Code"
                value={createForm.deviceCode}
                onChange={(v) => setCreateForm((f) => ({ ...f, deviceCode: v }))}
                placeholder="DEV-001"
                required
              />
              <Field
                label="Serial Number"
                value={createForm.serialNumber}
                onChange={(v) => setCreateForm((f) => ({ ...f, serialNumber: v }))}
                placeholder="ZK123456789"
                required
              />
              <Field
                label="Location"
                value={createForm.location}
                onChange={(v) => setCreateForm((f) => ({ ...f, location: v }))}
                placeholder="Main Entrance"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="text-xs font-bold text-slate-500 px-4 py-2"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="bg-[#0f4a29] hover:bg-[#165a34] text-white text-xs font-extrabold px-5 py-2 rounded-full disabled:opacity-50"
              >
                {saving ? "Creating..." : "Create Device"}
              </button>
            </div>
          </form>
        </SectionCard>
      )}

      {loading ? (
        <Loading label="Loading devices..." />
      ) : (
        <TableCard>
          <thead>
            <tr>
              {["Name", "Device Code", "Serial No.", "Location", "Status", "Actions"].map((h) => (
                <Th key={h}>{h}</Th>
              ))}
            </tr>
          </thead>
          <tbody>
            {devices.map((d) => (
              <tr key={d.id} className="border-t border-slate-100 dark:border-slate-800/60">
                {editingId === d.id ? (
                  <td colSpan={6} className="p-5 bg-slate-50/50 dark:bg-slate-950/40">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                      <Field label="Name" value={editForm.name} onChange={(v) => setEditForm((f) => ({ ...f, name: v }))} />
                      <Field
                        label="Device Code"
                        value={editForm.deviceCode}
                        onChange={(v) => setEditForm((f) => ({ ...f, deviceCode: v }))}
                      />
                      <Field
                        label="Serial Number"
                        value={editForm.serialNumber}
                        onChange={(v) => setEditForm((f) => ({ ...f, serialNumber: v }))}
                      />
                      <Field
                        label="Location"
                        value={editForm.location}
                        onChange={(v) => setEditForm((f) => ({ ...f, location: v }))}
                      />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => setEditingId(null)} className="text-xs font-bold text-slate-500 px-3 py-1.5">
                        Cancel
                      </button>
                      <button
                        onClick={() => saveEdit(d.id)}
                        disabled={saving}
                        className="bg-[#0f4a29] hover:bg-[#165a34] text-white text-xs font-extrabold px-4 py-1.5 rounded-full shadow-xs"
                      >
                        Save
                      </button>
                    </div>
                  </td>
                ) : (
                  <>
                    <Td className="font-extrabold text-slate-900 dark:text-white">{d.name}</Td>
                    <Td className="font-mono text-xs">{d.deviceCode}</Td>
                    <Td className="font-mono text-xs">{d.serialNumber}</Td>
                    <Td>{d.location || "—"}</Td>
                    <Td>
                      <StatusBadge active={d.isActive} inactiveLabel="Disabled" />
                    </Td>
                    <Td>
                      <div className="flex gap-1 items-center">
                        <IconBtn title="Edit" onClick={() => startEdit(d)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </IconBtn>
                        <IconBtn title={d.isActive ? "Disable" : "Enable"} onClick={() => toggleActive(d)}>
                          <Power className="w-3.5 h-3.5" />
                        </IconBtn>
                      </div>
                    </Td>
                  </>
                )}
              </tr>
            ))}
            {devices.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-xs text-slate-400 font-medium">
                  No devices registered.
                </td>
              </tr>
            )}
          </tbody>
        </TableCard>
      )}
    </div>
  );
}

// ============================================================================
// Shifts tab
// ============================================================================

const SHIFT_TYPE_META = {
  DAY: { label: "Day Shift", icon: Sun, className: "bg-amber-50 text-amber-700 border-amber-200" },
  NIGHT: { label: "Night Shift", icon: Moon, className: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  GENERAL: { label: "General Shift", icon: CalendarClock, className: "bg-slate-100 text-slate-600 border-slate-200" },
};

const emptyShiftForm = {
  name: "",
  code: "",
  type: "GENERAL",
  startTime: "09:00",
  endTime: "17:00",
  graceBeforeMinutes: 0,
  graceAfterMinutes: 0,
  breakMinutes: 0,
  overtimeAfterMinutes: 0,
  isActive: true,
  description: "",
};

function previewWorkingMinutes({ startTime, endTime, breakMinutes }) {
  const [sh, sm] = (startTime || "").split(":").map(Number);
  const [eh, em] = (endTime || "").split(":").map(Number);
  if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) return null;
  const start = sh * 60 + sm;
  const end = eh * 60 + em;
  if (start === end) return null;
  const span = end <= start ? 1440 - start + end : end - start;
  return Math.max(0, span - (Number(breakMinutes) || 0));
}

function ShiftTypeBadge({ type }) {
  const meta = SHIFT_TYPE_META[type] || SHIFT_TYPE_META.GENERAL;
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${meta.className}`}>
      <Icon className="w-3 h-3" /> {meta.label}
    </span>
  );
}

function StatusBadge({ active, activeLabel = "Active", inactiveLabel = "Inactive" }) {
  return (
    <span
      className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
        active
          ? "bg-[#0f4a29]/10 text-[#0f4a29] dark:text-[#52b788] border-[#0f4a29]/20"
          : "bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700"
      }`}
    >
      {active ? activeLabel : inactiveLabel}
    </span>
  );
}

function ShiftForm({ form, setForm }) {
  const preview = previewWorkingMinutes(form);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Shift Name" value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} placeholder="Day Shift" />
        <Field label="Shift Code" value={form.code} onChange={(v) => setForm((f) => ({ ...f, code: v }))} placeholder="DAY-01" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Shift Start Time" type="time" value={form.startTime} onChange={(v) => setForm((f) => ({ ...f, startTime: v }))} />
        <Field label="Shift End Time" type="time" value={form.endTime} onChange={(v) => setForm((f) => ({ ...f, endTime: v }))} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field
          label="Grace Time Before (mins)"
          type="number"
          value={form.graceBeforeMinutes}
          onChange={(v) => setForm((f) => ({ ...f, graceBeforeMinutes: v }))}
        />
        <Field
          label="Grace Time After (mins)"
          type="number"
          value={form.graceAfterMinutes}
          onChange={(v) => setForm((f) => ({ ...f, graceAfterMinutes: v }))}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field
          label="Break Duration (mins)"
          type="number"
          value={form.breakMinutes}
          onChange={(v) => setForm((f) => ({ ...f, breakMinutes: v }))}
        />
        <Field
          label="Overtime After (mins)"
          type="number"
          value={form.overtimeAfterMinutes}
          onChange={(v) => setForm((f) => ({ ...f, overtimeAfterMinutes: v }))}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">Shift Type</label>
          <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} className={`w-full ${selectCls}`}>
            <option value="DAY">Day Shift</option>
            <option value="NIGHT">Night Shift</option>
            <option value="GENERAL">General Shift</option>
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">Status</label>
          <select
            value={form.isActive ? "active" : "inactive"}
            onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.value === "active" }))}
            className={`w-full ${selectCls}`}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">Total Working Hours</label>
        <div className="w-full bg-[#0f4a29]/10 border border-[#0f4a29]/20 rounded-xl px-3 py-2 text-xs font-extrabold text-[#0f4a29] dark:text-[#52b788]">
          {preview === null ? "Set valid start & end time" : formatMinutesHrs(preview)}
        </div>
        <p className="text-[10px] text-slate-400 mt-1 font-medium">
          A day counts as a full day only when the employee works at least this long (minus the grace-after minutes). Less is marked Half Day.
        </p>
      </div>
    </div>
  );
}

function ShiftsTab() {
  const [shifts, setShifts] = useState([]);
  const [summary, setSummary] = useState(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const [search, setSearch] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyShiftForm);
  const [saving, setSaving] = useState(false);

  const fetchShifts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(page), limit: "10" });
      if (search) params.set("search", search);
      const data = await api.get(`/biometric/shifts?${params.toString()}`);
      setShifts(data.shifts);
      setTotal(data.total);
      setSummary(data.summary);
    } catch (err) {
      setError(err.message || "Could not load shifts.");
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchShifts();
  }, [fetchShifts]);

  const totalPages = Math.max(1, Math.ceil(total / 10));

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyShiftForm);
    setShowForm(true);
  };

  const openEdit = (s) => {
    setEditingId(s.id);
    setForm({
      name: s.name,
      code: s.code,
      type: s.type,
      startTime: s.startTime,
      endTime: s.endTime,
      graceBeforeMinutes: s.graceBeforeMinutes,
      graceAfterMinutes: s.graceAfterMinutes,
      breakMinutes: s.breakMinutes,
      overtimeAfterMinutes: s.overtimeAfterMinutes,
      isActive: s.isActive,
      description: s.description || "",
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
  };

  const submitForm = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");
    if (!form.name.trim() || !form.code.trim() || !form.startTime || !form.endTime) {
      return setError("Shift name, code, start time, and end time are required.");
    }
    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/biometric/shifts/${editingId}`, form);
        setInfo(`${form.name} updated.`);
      } else {
        await api.post("/biometric/shifts", form);
        setInfo(`${form.name} created.`);
      }
      closeForm();
      fetchShifts();
    } catch (err) {
      setError(err.message || "Could not save shift.");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (s) => {
    setError("");
    setInfo("");
    try {
      await api.patch(`/biometric/shifts/${s.id}/toggle`);
      setInfo(`${s.name} ${s.isActive ? "deactivated" : "activated"}.`);
      fetchShifts();
    } catch (err) {
      setError(err.message || "Could not update shift status.");
    }
  };

  return (
    <div className="space-y-4">
      <Banner error={error} info={info} />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card label="Total Shifts" value={summary?.totalShifts ?? "—"} />
        <Card label="Active Shifts" value={summary?.activeShifts ?? "—"} />
        <Card label="Assigned Staff" value={summary?.employeesAssigned ?? "—"} />
        <Card label="Avg. Hours" value={summary ? `${summary.avgWorkingHours}h` : "—"} />
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <SearchBar
          value={search}
          onChange={(v) => {
            setPage(1);
            setSearch(v);
          }}
          placeholder="Search shifts..."
        />
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-[#0f4a29] hover:bg-[#165a34] text-white text-xs font-extrabold px-5 py-2.5 rounded-full shadow-xs"
        >
          <Plus className="w-4 h-4" /> Add Shift
        </button>
      </div>

      {loading ? (
        <Loading label="Loading shifts..." />
      ) : (
        <TableCard>
          <thead>
            <tr>
              {["Shift Name", "Code", "Start", "End", "Total Hours", "Status", "Actions"].map((h) => (
                <Th key={h}>{h}</Th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shifts.map((s) => (
              <tr key={s.id} className="border-t border-slate-100 dark:border-slate-800/60">
                <Td className="font-extrabold text-slate-900 dark:text-white">
                  <div>{s.name}</div>
                  <div className="mt-0.5">
                    <ShiftTypeBadge type={s.type} />
                  </div>
                </Td>
                <Td className="font-mono text-xs">{s.code}</Td>
                <Td>{formatTime12h(s.startTime)}</Td>
                <Td>{formatTime12h(s.endTime)}</Td>
                <Td className="font-bold">{formatMinutesHrs(s.totalWorkingMinutes)}</Td>
                <Td>
                  <StatusBadge active={s.isActive} />
                </Td>
                <Td>
                  <div className="flex gap-1 items-center">
                    <IconBtn title="Edit" onClick={() => openEdit(s)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </IconBtn>
                    <IconBtn title={s.isActive ? "Deactivate" : "Activate"} onClick={() => toggleActive(s)}>
                      <Power className="w-3.5 h-3.5" />
                    </IconBtn>
                  </div>
                </Td>
              </tr>
            ))}
            {shifts.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-8 text-center text-xs text-slate-400 font-medium">
                  No shifts yet.
                </td>
              </tr>
            )}
          </tbody>
        </TableCard>
      )}

      <Pager page={page} totalPages={totalPages} setPage={setPage} />

      {showForm && (
        <Modal onClose={closeForm} wide>
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
            <h4 className="font-extrabold text-slate-900 dark:text-white text-sm">{editingId ? "Edit Shift" : "Add Shift"}</h4>
            <button onClick={closeForm} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          <form onSubmit={submitForm}>
            <ShiftForm form={form} setForm={setForm} />
            <div className="flex gap-2 justify-end pt-4">
              <button type="button" onClick={closeForm} className="text-xs font-bold text-slate-500 px-4 py-2">
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="bg-[#0f4a29] hover:bg-[#165a34] text-white text-xs font-extrabold px-5 py-2 rounded-full shadow-xs"
              >
                {saving ? "Saving..." : editingId ? "Save Changes" : "Create Shift"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function Pager({ page, totalPages, setPage }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between px-2 text-xs font-bold text-slate-500">
      <span>
        Page {page} of {totalPages}
      </span>
      <div className="flex gap-2">
        <button
          disabled={page <= 1}
          onClick={() => setPage((p) => p - 1)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 disabled:opacity-40"
        >
          <ChevronLeft className="w-3.5 h-3.5" /> Prev
        </button>
        <button
          disabled={page >= totalPages}
          onClick={() => setPage((p) => p + 1)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 disabled:opacity-40"
        >
          Next <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Mapping Tab (Users & Employees)
// ============================================================================

function MappingTab({ kind }) {
  const isUser = kind === "user";

  const [mappings, setMappings] = useState([]);
  const [devices, setDevices] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const [personSearch, setPersonSearch] = useState("");
  const [personResults, setPersonResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const [showAssign, setShowAssign] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [assignForm, setAssignForm] = useState({ biometricId: "", deviceId: "", shiftId: "" });
  const [saving, setSaving] = useState(false);
  const [shiftSavingId, setShiftSavingId] = useState(null);

  const fetchMappings = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { mappings: data } = await api.get("/biometric/mappings");
      setMappings(data.filter((m) => (isUser ? m.userId : m.employeeId)));
    } catch (err) {
      setError(err.message || "Could not load mappings.");
    } finally {
      setLoading(false);
    }
  }, [isUser]);

  useEffect(() => {
    fetchMappings();
  }, [fetchMappings]);

  useEffect(() => {
    (async () => {
      try {
        const { devices: data } = await api.get("/biometric/devices");
        setDevices(data.filter((d) => d.isActive));
      } catch {
        // dropdown convenience only
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const data = await api.get("/biometric/shifts?status=active&limit=100");
        setShifts(data.shifts);
      } catch {
        // dropdown convenience only
      }
    })();
  }, []);

  const runSearch = async () => {
    setSearching(true);
    setError("");
    try {
      const endpoint = isUser ? "/biometric/users" : "/biometric/employees";
      const { users, employees } = await api.get(`${endpoint}?search=${encodeURIComponent(personSearch)}`);
      setPersonResults(isUser ? users : employees);
    } catch (err) {
      setError(err.message || "Search failed.");
    } finally {
      setSearching(false);
    }
  };

  const openAssign = (person) => {
    setSelectedPerson(person);
    setAssignForm({ biometricId: "", deviceId: devices[0]?.id || "", shiftId: "" });
    setShowAssign(true);
  };

  const submitAssign = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");
    if (!assignForm.biometricId || !assignForm.deviceId) {
      return setError("Biometric ID and device are both required.");
    }
    setSaving(true);
    try {
      await api.post("/biometric/mappings", {
        biometricId: assignForm.biometricId,
        deviceId: assignForm.deviceId,
        ...(isUser && assignForm.shiftId ? { shiftId: assignForm.shiftId } : {}),
        ...(isUser ? { userId: selectedPerson.id } : { employeeId: selectedPerson.id }),
      });
      setInfo(`${selectedPerson.fullName} mapped successfully.`);
      setShowAssign(false);
      setSelectedPerson(null);
      fetchMappings();
    } catch (err) {
      setError(err.message || "Could not create mapping.");
    } finally {
      setSaving(false);
    }
  };

  const changeMappingShift = async (m, shiftId) => {
    setError("");
    setInfo("");
    setShiftSavingId(m.id);
    try {
      await api.patch(`/biometric/mappings/${m.id}/shift`, { shiftId: shiftId || null });
      setInfo("Shift updated. Use Attendance → Recalculate if past days should use the new timing.");
      fetchMappings();
    } catch (err) {
      setError(err.message || "Could not update shift.");
    } finally {
      setShiftSavingId(null);
    }
  };

  const deactivate = async (m) => {
    setError("");
    setInfo("");
    try {
      await api.patch(`/biometric/mappings/${m.id}/deactivate`);
      setInfo("Mapping deactivated.");
      fetchMappings();
    } catch (err) {
      setError(err.message || "Could not deactivate mapping.");
    }
  };

  return (
    <div className="space-y-4">
      <Banner error={error} info={info} />

      <SectionCard title={`Search ${isUser ? "Staff" : "Employees"} to Map`} icon={UserPlus}>
        <div className="flex gap-2 flex-wrap mb-3">
          <SearchBar value={personSearch} onChange={setPersonSearch} placeholder={`Search ${isUser ? "staff" : "employee"}...`} />
          <button
            onClick={runSearch}
            disabled={searching}
            className="bg-[#0f4a29] hover:bg-[#165a34] text-white text-xs font-extrabold px-5 py-2 rounded-full shadow-xs"
          >
            {searching ? "Searching..." : "Search"}
          </button>
        </div>

        {personResults.length > 0 && (
          <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden">
            {personResults.map((p) => (
              <div key={p.id} className="flex items-center justify-between px-4 py-2.5">
                <div>
                  <p className="text-xs font-extrabold text-slate-800 dark:text-white">{p.fullName}</p>
                  <p className="text-[10px] text-slate-400 font-medium">{isUser ? `${p.role} · ${p.email}` : p.designation}</p>
                </div>
                <button
                  onClick={() => openAssign(p)}
                  className="text-xs font-extrabold text-[#0f4a29] dark:text-[#52b788] hover:underline"
                >
                  + Map Biometric ID
                </button>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {showAssign && selectedPerson && (
        <SectionCard title={`Assign Biometric ID for ${selectedPerson.fullName}`} icon={Link2}>
          <form onSubmit={submitAssign} className="space-y-4">
            <div className={`grid grid-cols-1 ${isUser ? "sm:grid-cols-3" : "sm:grid-cols-2"} gap-3`}>
              <Field
                label="Biometric ID"
                value={assignForm.biometricId}
                onChange={(v) => setAssignForm((f) => ({ ...f, biometricId: v }))}
                placeholder="Enrollment / card number"
                required
              />
              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">Device</label>
                <select
                  value={assignForm.deviceId}
                  onChange={(e) => setAssignForm((f) => ({ ...f, deviceId: e.target.value }))}
                  className={`w-full ${selectCls}`}
                >
                  <option value="">Select device</option>
                  {devices.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.deviceCode})
                    </option>
                  ))}
                </select>
              </div>
              {isUser && (
                <div>
                  <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">Shift</label>
                  <select
                    value={assignForm.shiftId}
                    onChange={(e) => setAssignForm((f) => ({ ...f, shiftId: e.target.value }))}
                    className={`w-full ${selectCls}`}
                  >
                    <option value="">Default (9:00 AM – 5:00 PM)</option>
                    {shifts.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({formatTime12h(s.startTime)} – {formatTime12h(s.endTime)})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            {!isUser && (
              <p className="text-[11px] text-slate-400 font-medium">
                Working hours for employees come from their Shift Assignment.
              </p>
            )}
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowAssign(false);
                  setSelectedPerson(null);
                }}
                className="text-xs font-bold text-slate-500 px-4 py-2"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="bg-[#0f4a29] hover:bg-[#165a34] text-white text-xs font-extrabold px-5 py-2 rounded-full shadow-xs"
              >
                {saving ? "Assigning..." : "Assign ID"}
              </button>
            </div>
          </form>
        </SectionCard>
      )}

      {loading ? (
        <Loading label="Loading mappings..." />
      ) : (
        <TableCard>
          <thead>
            <tr>
              {["Name", "Biometric ID", "Device", "Shift", "Status", "Actions"].map((h) => (
                <Th key={h}>{h}</Th>
              ))}
            </tr>
          </thead>
          <tbody>
            {mappings.map((m) => (
              <tr key={m.id} className="border-t border-slate-100 dark:border-slate-800/60">
                <Td className="font-extrabold text-slate-900 dark:text-white">
                  {isUser ? m.user?.fullName : m.employee?.fullName}
                </Td>
                <Td className="font-mono text-xs">{m.biometricId}</Td>
                <Td>{m.device?.name || "—"}</Td>
                <Td>
                  {isUser ? (
                    <div className="flex items-center gap-1.5">
                      <select
                        value={m.shiftId || ""}
                        disabled={shiftSavingId === m.id}
                        onChange={(e) => changeMappingShift(m, e.target.value)}
                        className={`${selectCls} py-1.5 max-w-[200px]`}
                      >
                        <option value="">Default (9 AM – 5 PM)</option>
                        {m.shift && !shifts.some((s) => s.id === m.shift.id) && (
                          <option value={m.shift.id}>{m.shift.name} (inactive)</option>
                        )}
                        {shifts.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                      {shiftSavingId === m.id && <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0f4a29]" />}
                    </div>
                  ) : (
                    <div>
                      <div className="text-xs font-bold text-slate-700 dark:text-slate-200">
                        {m.employee?.shift?.name || "Default (9 AM – 5 PM)"}
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium">
                        {m.employee?.shift
                          ? `${formatTime12h(m.employee.shift.startTime)} – ${formatTime12h(m.employee.shift.endTime)} · via Shift Assignment`
                          : "Set it in Shift Assignment"}
                      </div>
                    </div>
                  )}
                </Td>
                <Td>
                  <StatusBadge active={m.isActive} inactiveLabel="Deactivated" />
                </Td>
                <Td>
                  {m.isActive && (
                    <IconBtn title="Deactivate" onClick={() => deactivate(m)}>
                      <Power className="w-3.5 h-3.5 text-rose-500" />
                    </IconBtn>
                  )}
                </Td>
              </tr>
            ))}
            {mappings.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-xs text-slate-400 font-medium">
                  No mappings yet.
                </td>
              </tr>
            )}
          </tbody>
        </TableCard>
      )}
    </div>
  );
}

// ============================================================================
// Attendance tab
// ============================================================================

const IST_TZ = "Asia/Kolkata";

const ATT_STATUS_META = {
  PRESENT: {
    label: "Present",
    short: "P",
    cls: "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20",
    cell: "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20",
  },
  HALF_DAY: {
    label: "Half Day",
    short: "HD",
    cls: "bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20",
    cell: "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20",
  },
  ABSENT: {
    label: "Absent",
    short: "A",
    cls: "bg-rose-50 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-500/20",
    cell: "bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20",
  },
  ON_LEAVE: {
    label: "On Leave",
    short: "L",
    cls: "bg-sky-50 dark:bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-500/20",
    cell: "bg-sky-50 dark:bg-sky-500/10 border-sky-200 dark:border-sky-500/20",
  },
  NOT_YET: {
    label: "No punch yet",
    short: "—",
    cls: "bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700",
    cell: "bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 border-dashed",
  },
  WEEK_OFF: {
    label: "Week Off",
    short: "WO",
    cls: "bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700",
    cell: "bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700",
  },
  HOLIDAY: {
    label: "Holiday",
    short: "H",
    cls: "bg-violet-50 dark:bg-violet-500/15 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-500/20",
    cell: "bg-violet-50 dark:bg-violet-500/10 border-violet-200 dark:border-violet-500/20",
  },
  FUTURE: {
    label: "Upcoming",
    short: "",
    cls: "bg-white dark:bg-slate-900 text-slate-400 border-slate-200 dark:border-slate-700",
    cell: "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 opacity-60",
  },
  BEFORE_JOINING: {
    label: "Not joined",
    short: "",
    cls: "bg-white dark:bg-slate-900 text-slate-400 border-slate-200 dark:border-slate-700",
    cell: "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 opacity-50",
  },
};

const RANGE_PRESETS = [
  { id: "today", label: "Today", mode: "day", offset: 0 },
  { id: "yesterday", label: "Yesterday", mode: "day", offset: -1 },
  { id: "thisWeek", label: "This Week", mode: "week", offset: 0 },
  { id: "lastWeek", label: "Last Week", mode: "week", offset: -1 },
  { id: "thisMonth", label: "This Month", mode: "month", offset: 0 },
  { id: "lastMonth", label: "Last Month", mode: "month", offset: -1 },
  { id: "custom", label: "Custom", mode: "custom", offset: 0 },
];

const STATUS_FILTERS = [
  { v: "ALL", label: "All statuses" },
  { v: "PRESENT", label: "Present" },
  { v: "HALF_DAY", label: "Half Day" },
  { v: "ABSENT", label: "Absent" },
  { v: "MISSING_OUT", label: "No punch-out" },
  { v: "LATE", label: "Late arrivals" },
  { v: "ON_LEAVE", label: "On Leave" },
  { v: "NOT_YET", label: "No punch yet" },
];

const pad2 = (n) => String(n).padStart(2, "0");
const localKey = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const keyToLocalDate = (k) => {
  const [y, m, d] = k.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const addLocalDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

function rangeFor(mode, offset, custom) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (mode === "day") {
    const d = addLocalDays(today, offset);
    return { from: localKey(d), to: localKey(d) };
  }
  if (mode === "week") {
    const monday = addLocalDays(today, -((today.getDay() + 6) % 7) + offset * 7);
    return { from: localKey(monday), to: localKey(addLocalDays(monday, 6)) };
  }
  if (mode === "month") {
    const first = new Date(today.getFullYear(), today.getMonth() + offset, 1);
    const last = new Date(today.getFullYear(), today.getMonth() + offset + 1, 0);
    return { from: localKey(first), to: localKey(last) };
  }
  return { from: custom.from, to: custom.to };
}

function rangeLabel(mode, range) {
  if (!range.from || !range.to) return "";
  const f = keyToLocalDate(range.from);
  const t = keyToLocalDate(range.to);
  if (mode === "day") return f.toLocaleDateString("en-IN", { weekday: "long", day: "2-digit", month: "short", year: "numeric" });
  if (mode === "month") return f.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  return `${f.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })} – ${t.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })}`;
}

function fmtHM(mins) {
  const v = Math.round(Number(mins) || 0);
  const h = Math.floor(v / 60);
  const m = v % 60;
  if (!h) return `${m}m`;
  return m ? `${h}h ${m}m` : `${h}h`;
}

// Always Indian Standard Time, 12-hour clock: "12:15 PM" — regardless of the
// viewer's computer time zone.
function fmtPunch(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d
    .toLocaleTimeString("en-US", {
      timeZone: IST_TZ,
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
    .toUpperCase();
}

function fmtDayKey(key, opts = { weekday: "short", day: "2-digit", month: "short" }) {
  return keyToLocalDate(key).toLocaleDateString("en-IN", opts);
}

function DiffText({ mins }) {
  const v = Math.round(Number(mins) || 0);
  if (!v) return <span className="font-extrabold text-slate-400">0h</span>;
  const positive = v > 0;
  return (
    <span className={`font-extrabold ${positive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500"}`}>
      {positive ? "+" : "−"}
      {fmtHM(Math.abs(v))}
    </span>
  );
}

function HoursBar({ worked, expected }) {
  const pct = expected > 0 ? Math.min(100, Math.round((worked / expected) * 100)) : worked > 0 ? 100 : 0;
  const color = pct >= 100 ? "bg-emerald-500" : pct >= 75 ? "bg-amber-400" : "bg-rose-400";
  return (
    <div className="w-24">
      <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="text-[10px] text-slate-400 font-bold mt-0.5">{expected > 0 ? `${pct}%` : "—"}</div>
    </div>
  );
}

function ShiftCell({ shift }) {
  if (!shift) return <span className="text-slate-400">—</span>;
  return (
    <div>
      <div className="text-xs font-bold text-slate-700 dark:text-slate-200 whitespace-nowrap">
        {shift.source === "DEFAULT" ? "Default" : shift.name}
      </div>
      <div className="text-[10px] text-slate-400 font-medium whitespace-nowrap">
        {formatTime12h(shift.startTime)} – {formatTime12h(shift.endTime)} · {fmtHM(shift.totalWorkingMinutes)}
      </div>
    </div>
  );
}

function TypeChip({ personType }) {
  return (
    <span className="text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500">
      {personType === "USER" ? "Staff" : "Employee"}
    </span>
  );
}

function DayStatusBadge({ day, todayKey }) {
  const meta = ATT_STATUS_META[day.status] || ATT_STATUS_META.ABSENT;
  const inProgress = day.missingPunchOut && day.date === todayKey;
  return (
    <div className="flex flex-wrap gap-1 items-center">
      <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border whitespace-nowrap ${meta.cls}`}>
        {inProgress ? "Working" : meta.label}
      </span>
      {day.missingPunchOut && !inProgress && (
        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full border whitespace-nowrap bg-orange-50 dark:bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-500/20">
          No punch-out
        </span>
      )}
    </div>
  );
}

function AttendanceTab() {
  const [mode, setMode] = useState("day");
  const [offset, setOffset] = useState(0);
  const [custom, setCustom] = useState(() => {
    const t = localKey(new Date());
    return { from: t, to: t };
  });
  const [view, setView] = useState("daily"); // "summary" | "daily"
  const [search, setSearch] = useState("");
  const [personType, setPersonType] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [rebuilding, setRebuilding] = useState(false);
  const [viewPerson, setViewPerson] = useState(null);

  const range = useMemo(() => rangeFor(mode, offset, custom), [mode, offset, custom]);
  const todayKey = data?.today || localKey(new Date());
  const PAGE_SIZE = 25;

  const fetchData = useCallback(async () => {
    if (!range.from || !range.to) return;
    if (range.to < range.from) {
      setError('"To" date can\'t be before the "From" date.');
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await api.get(`/biometric/attendance/overview?from=${range.from}&to=${range.to}`);
      setData(res);
    } catch (err) {
      setError(err.message || "Could not load attendance.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [range.from, range.to]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    setPage(1);
  }, [range.from, range.to, view, search, personType, statusFilter]);

  const pickPreset = (p) => {
    setMode(p.mode);
    setOffset(p.offset);
    setView(p.mode === "day" ? "daily" : "summary");
    if (p.mode === "custom") setCustom({ from: range.from, to: range.to });
  };

  const people = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data?.people || []).filter(({ person }) => {
      if (personType !== "ALL" && person.personType !== personType) return false;
      if (q && !`${person.fullName} ${person.subtitle || ""} ${person.department || ""}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [data, search, personType]);

  const peopleByKey = useMemo(() => new Map((data?.people || []).map((p) => [p.person.key, p.person])), [data]);

  const totals = useMemo(
    () =>
      people.reduce(
        (acc, { summary: s }) => {
          acc.expected += s.expectedMinutes;
          acc.worked += s.workedMinutes;
          acc.overtime += s.overtimeMinutes;
          acc.present += s.presentDays;
          acc.half += s.halfDays;
          acc.absent += s.absentDays;
          acc.leave += s.leaveDays;
          acc.missing += s.missingPunchOuts;
          acc.lateDays += s.lateDays;
          return acc;
        },
        { expected: 0, worked: 0, overtime: 0, present: 0, half: 0, absent: 0, leave: 0, missing: 0, lateDays: 0 },
      ),
    [people],
  );

  const dailyRows = useMemo(() => {
    const keys = new Set(people.map((p) => p.person.key));
    return (data?.days || [])
      .filter((d) => keys.has(d.personKey))
      .filter((d) => {
        if (statusFilter === "ALL") return true;
        if (statusFilter === "MISSING_OUT") return d.missingPunchOut;
        if (statusFilter === "LATE") return d.lateMinutes > 0;
        return d.status === statusFilter;
      })
      .sort(
        (a, b) =>
          b.date.localeCompare(a.date) ||
          (peopleByKey.get(a.personKey)?.fullName || "").localeCompare(peopleByKey.get(b.personKey)?.fullName || ""),
      );
  }, [data, people, statusFilter, peopleByKey]);

  const rows = view === "daily" ? dailyRows : people;
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const rebuild = async () => {
    const label = rangeLabel(mode, range);
    if (
      !window.confirm(
        `Recalculate attendance for ${label} from the raw punch logs?\n\nThis fixes old records where punch-in and punch-out showed the same time, and applies the current Shift Assignments. Leave entries are kept.`,
      )
    )
      return;
    setRebuilding(true);
    setError("");
    setInfo("");
    try {
      const res = await api.post("/biometric/attendance/rebuild", { from: range.from, to: range.to });
      setInfo(res.message);
      fetchData();
    } catch (err) {
      setError(err.message || "Could not recalculate attendance.");
    } finally {
      setRebuilding(false);
    }
  };

  const activePreset = RANGE_PRESETS.find((p) => p.mode === mode && (p.mode === "custom" || p.offset === offset));

  return (
    <div className="space-y-4">
      <Banner error={error} info={info} />

      {/* ---- Range & filters ---- */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-[28px] p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex gap-1.5 flex-wrap">
          {RANGE_PRESETS.map((p) => {
            const active = activePreset?.id === p.id;
            return (
              <button
                key={p.id}
                onClick={() => pickPreset(p)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold border transition-all ${
                  active
                    ? "bg-[#0f4a29] text-white border-[#0f4a29]"
                    : "bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-[#0f4a29]"
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          {mode === "custom" ? (
            <div className="flex items-end gap-2 flex-wrap">
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">From</label>
                <input
                  type="date"
                  value={custom.from}
                  onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))}
                  className={selectCls}
                />
              </div>
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">To</label>
                <input
                  type="date"
                  value={custom.to}
                  min={custom.from}
                  onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))}
                  className={selectCls}
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-1 rounded-full">
              <button
                onClick={() => setOffset((o) => o - 1)}
                className="p-1.5 rounded-full hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
                title="Previous"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-extrabold text-slate-900 dark:text-white px-2 min-w-[150px] text-center">
                {rangeLabel(mode, range)}
              </span>
              <button
                onClick={() => setOffset((o) => o + 1)}
                disabled={offset >= 0}
                className="p-1.5 rounded-full hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-30"
                title="Next"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex p-1 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-full">
              {[
                { v: "summary", label: "Per Person", icon: Users2 },
                { v: "daily", label: "Day-wise", icon: LayoutList },
              ].map((o) => {
                const Icon = o.icon;
                return (
                  <button
                    key={o.v}
                    onClick={() => setView(o.v)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-extrabold transition-all ${
                      view === o.v ? "bg-[#0f4a29] text-white" : "text-slate-500 dark:text-slate-300"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" /> {o.label}
                  </button>
                );
              })}
            </div>
            <button
              onClick={fetchData}
              title="Refresh"
              className="p-2 rounded-full border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-[#0f4a29]"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={rebuild}
              disabled={rebuilding}
              title="Recalculate this range from the raw punch logs"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-slate-200 dark:border-slate-700 text-xs font-extrabold text-slate-600 dark:text-slate-300 hover:border-[#0f4a29] disabled:opacity-50"
            >
              {rebuilding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wrench className="w-3.5 h-3.5" />}
              {rebuilding ? "Recalculating..." : "Recalculate"}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <SearchBar value={search} onChange={setSearch} placeholder="Search name, designation..." />
          <select value={personType} onChange={(e) => setPersonType(e.target.value)} className={selectCls}>
            <option value="ALL">Everyone</option>
            <option value="EMPLOYEE">Employees</option>
            <option value="USER">Staff users</option>
          </select>
          {view === "daily" && (
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={selectCls}>
              {STATUS_FILTERS.map((s) => (
                <option key={s.v} value={s.v}>
                  {s.label}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* ---- Totals ---- */}
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          <Card label="People" value={people.length} />
          <Card label="Expected Hrs" value={fmtHM(totals.expected)} sub="as per shift" />
          <Card label="Worked Hrs" value={fmtHM(totals.worked)} />
          <Card
            label="Difference"
            value={`${totals.worked - totals.expected >= 0 ? "+" : "−"}${fmtHM(Math.abs(totals.worked - totals.expected))}`}
            tone={totals.worked - totals.expected >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500"}
            sub={totals.worked - totals.expected >= 0 ? "extra" : "short"}
          />
          <Card label="Present" value={totals.present} sub="full days" tone="text-emerald-600 dark:text-emerald-400" />
          <Card label="Half Days" value={totals.half} tone="text-amber-600 dark:text-amber-400" />
          <Card label="Absent" value={totals.absent} sub={totals.leave ? `${totals.leave} on leave` : undefined} tone="text-rose-500" />
          <Card
            label="Overtime"
            value={fmtHM(totals.overtime)}
            sub={`${totals.missing} no punch-out · ${totals.lateDays} late`}
          />
        </div>
      )}

      <div className="flex items-start gap-2 text-[11px] text-slate-500 dark:text-slate-400 font-medium px-1">
        <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
        <span>
          Working hours come from each person's Shift Assignment. A day is <b>Present</b> only if the hours worked reach the
          shift's working hours (grace minutes allowed); anything less is <b>Half Day</b>. Sundays and holidays are not
          counted as expected hours.
        </span>
      </div>

      {/* ---- Table ---- */}
      {loading && !data ? (
        <Loading label="Loading attendance..." />
      ) : !data ? null : view === "summary" ? (
        <TableCard>
          <thead>
            <tr>
              {["Person", "Shift", "P / HD / A", "Expected", "Worked", "Difference", "Overtime", "Late", ""].map((h) => (
                <Th key={h}>{h}</Th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map(({ person, summary: s }) => (
              <tr key={person.key} className="border-t border-slate-100 dark:border-slate-800/60">
                <Td>
                  <button
                    onClick={() => setViewPerson(person)}
                    className="text-left font-extrabold text-slate-900 dark:text-white hover:text-[#0f4a29] hover:underline"
                  >
                    {person.fullName}
                  </button>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <TypeChip personType={person.personType} />
                    <span className="text-[10px] text-slate-400 font-medium">{person.subtitle}</span>
                  </div>
                </Td>
                <Td>
                  <ShiftCell shift={person.currentShift} />
                </Td>
                <Td>
                  <div className="flex gap-1 text-[11px] font-extrabold whitespace-nowrap">
                    <span className="text-emerald-600 dark:text-emerald-400">{s.presentDays}</span>
                    <span className="text-slate-300">/</span>
                    <span className="text-amber-600 dark:text-amber-400">{s.halfDays}</span>
                    <span className="text-slate-300">/</span>
                    <span className="text-rose-500">{s.absentDays}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium">
                    of {s.workingDays} working day{s.workingDays === 1 ? "" : "s"}
                    {s.missingPunchOuts ? ` · ${s.missingPunchOuts} no-out` : ""}
                  </div>
                </Td>
                <Td className="font-bold">{fmtHM(s.expectedMinutes)}</Td>
                <Td>
                  <div className="font-extrabold text-slate-900 dark:text-white">{fmtHM(s.workedMinutes)}</div>
                  <HoursBar worked={s.workedMinutes} expected={s.expectedMinutes} />
                </Td>
                <Td>
                  <DiffText mins={s.differenceMinutes} />
                </Td>
                <Td>{s.overtimeMinutes ? fmtHM(s.overtimeMinutes) : "—"}</Td>
                <Td>
                  {s.lateDays ? (
                    <span className="text-xs">
                      {s.lateDays}× <span className="text-slate-400">({fmtHM(s.lateMinutes)})</span>
                    </span>
                  ) : (
                    "—"
                  )}
                </Td>
                <Td>
                  <button
                    onClick={() => setViewPerson(person)}
                    className="flex items-center gap-1 text-xs font-extrabold text-[#0f4a29] dark:text-[#52b788] hover:underline whitespace-nowrap"
                  >
                    <Eye className="w-3.5 h-3.5" /> View
                  </button>
                </Td>
              </tr>
            ))}
            {pageRows.length === 0 && (
              <tr>
                <td colSpan={9} className="px-5 py-8 text-center text-xs text-slate-400 font-medium">
                  No one matches these filters. Map biometric IDs in the mapping tabs to start tracking attendance.
                </td>
              </tr>
            )}
          </tbody>
        </TableCard>
      ) : (
        <TableCard>
          <thead>
            <tr>
              {["Date", "Person", "Shift", "Punch In", "Punch Out", "Worked", "Expected", "Late", "OT", "Status", ""].map((h) => (
                <Th key={h}>{h}</Th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((d) => {
              const person = peopleByKey.get(d.personKey);
              return (
                <tr key={`${d.personKey}-${d.date}`} className="border-t border-slate-100 dark:border-slate-800/60">
                  <Td className="font-bold whitespace-nowrap">
                    {fmtDayKey(d.date)}
                    {d.dayType !== "WORKING" && (
                      <div className="text-[10px] text-slate-400 font-medium">
                        {d.dayType === "HOLIDAY" ? d.holidayName || "Holiday" : "Week off"}
                      </div>
                    )}
                  </Td>
                  <Td>
                    <button
                      onClick={() => person && setViewPerson(person)}
                      className="text-left font-extrabold text-slate-900 dark:text-white hover:text-[#0f4a29] hover:underline"
                    >
                      {person?.fullName || "—"}
                    </button>
                    <div className="text-[10px] text-slate-400 font-medium">{person?.subtitle}</div>
                  </Td>
                  <Td>
                    <ShiftCell shift={d.shift} />
                  </Td>
                  <Td className="whitespace-nowrap font-bold">{fmtPunch(d.firstPunch)}</Td>
                  <Td className="whitespace-nowrap font-bold">
                    {d.lastPunch ? fmtPunch(d.lastPunch) : <span className="text-slate-300 dark:text-slate-600">—</span>}
                  </Td>
                  <Td className="font-extrabold">{d.workingMinutes ? fmtHM(d.workingMinutes) : "—"}</Td>
                  <Td className="text-slate-500">{d.expectedMinutes ? fmtHM(d.expectedMinutes) : "—"}</Td>
                  <Td className={d.lateMinutes ? "text-rose-500 font-bold" : ""}>{d.lateMinutes ? fmtHM(d.lateMinutes) : "—"}</Td>
                  <Td>{d.overtimeMinutes ? fmtHM(d.overtimeMinutes) : "—"}</Td>
                  <Td>
                    <DayStatusBadge day={d} todayKey={todayKey} />
                  </Td>
                  <Td>
                    <IconBtn title="View month" onClick={() => person && setViewPerson(person)}>
                      <Eye className="w-3.5 h-3.5" />
                    </IconBtn>
                  </Td>
                </tr>
              );
            })}
            {pageRows.length === 0 && (
              <tr>
                <td colSpan={11} className="px-5 py-8 text-center text-xs text-slate-400 font-medium">
                  No attendance rows match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </TableCard>
      )}

      <Pager page={page} totalPages={totalPages} setPage={setPage} />

      {viewPerson && (
        <PersonAttendanceModal person={viewPerson} initialDateKey={range.from} onClose={() => setViewPerson(null)} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Per-person monthly attendance
// ---------------------------------------------------------------------------
function PersonAttendanceModal({ person, initialDateKey, onClose }) {
  const [month, setMonth] = useState(() => {
    const d = keyToLocalDate(initialDateKey || localKey(new Date()));
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [layout, setLayout] = useState("calendar"); // calendar | table

  const from = localKey(new Date(month.y, month.m, 1));
  const to = localKey(new Date(month.y, month.m + 1, 0));
  const now = new Date();
  const isCurrentMonth = month.y === now.getFullYear() && month.m === now.getMonth();

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");
      try {
        const res = await api.get(
          `/biometric/attendance/person?personType=${person.personType}&personId=${encodeURIComponent(person.id)}&from=${from}&to=${to}`,
        );
        setData(res);
      } catch (err) {
        setError(err.message || "Could not load attendance.");
        setData(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [person.personType, person.id, from, to]);

  const moveMonth = (delta) => {
    setMonth(({ y, m }) => {
      const d = new Date(y, m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  };

  const s = data?.summary;
  const p = data?.person || person;
  const todayKey = data?.today || localKey(new Date());
  const lead = (new Date(month.y, month.m, 1).getDay() + 6) % 7;
  const monthLabel = new Date(month.y, month.m, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" });

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-2 sm:p-4" onClick={onClose}>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #attendance-person-printable, #attendance-person-printable * { visibility: visible; }
          #attendance-person-printable { position: absolute; top: 0; left: 0; width: 100%; padding: 16px; }
          .attendance-no-print { display: none !important; }
        }
      `}</style>
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[28px] shadow-2xl w-full max-w-6xl max-h-[94vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="attendance-no-print flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="font-extrabold text-slate-900 dark:text-white text-base truncate">{p.fullName}</h4>
              <TypeChip personType={p.personType} />
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              {[p.subtitle, p.department].filter(Boolean).join(" · ")}
              {p.currentShift &&
                ` · ${p.currentShift.source === "DEFAULT" ? "Default shift" : p.currentShift.name} (${formatTime12h(
                  p.currentShift.startTime,
                )} – ${formatTime12h(p.currentShift.endTime)}, ${fmtHM(p.currentShift.totalWorkingMinutes)}/day)`}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-1 rounded-full">
              <button onClick={() => moveMonth(-1)} className="p-1.5 rounded-full hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-extrabold text-slate-900 dark:text-white px-2 min-w-[110px] text-center">{monthLabel}</span>
              <button
                onClick={() => moveMonth(1)}
                disabled={isCurrentMonth}
                className="p-1.5 rounded-full hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 disabled:opacity-30"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <div className="flex p-1 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-full">
              {[
                { v: "calendar", icon: CalendarDays, label: "Calendar" },
                { v: "table", icon: LayoutList, label: "Table" },
              ].map((o) => {
                const Icon = o.icon;
                return (
                  <button
                    key={o.v}
                    onClick={() => setLayout(o.v)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-extrabold ${
                      layout === o.v ? "bg-[#0f4a29] text-white" : "text-slate-500 dark:text-slate-300"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" /> {o.label}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => window.print()}
              disabled={!data}
              title="Print / Save as PDF"
              className="p-2 rounded-full border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-[#0f4a29] disabled:opacity-40"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button onClick={onClose} className="p-2 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {error && <Banner error={error} />}
          {loading && !data ? (
            <Loading label="Loading month..." />
          ) : data ? (
            <div id="attendance-person-printable" className="space-y-4">
              <div className="hidden print:block">
                <p className="font-extrabold text-lg">{p.fullName} — Attendance, {monthLabel}</p>
                <p className="text-xs text-slate-500">{[p.subtitle, p.department].filter(Boolean).join(" · ")}</p>
              </div>

              {/* Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
                <MiniStat label="Expected" value={fmtHM(s.expectedMinutes)} sub={`${s.workingDays} working days`} />
                <MiniStat label="Worked" value={fmtHM(s.workedMinutes)} />
                <MiniStat
                  label={s.differenceMinutes >= 0 ? "Extra" : "Short"}
                  value={<DiffText mins={s.differenceMinutes} />}
                />
                <MiniStat label="Present" value={s.presentDays} tone="text-emerald-600 dark:text-emerald-400" />
                <MiniStat label="Half Day" value={s.halfDays} tone="text-amber-600 dark:text-amber-400" />
                <MiniStat label="Absent" value={s.absentDays} tone="text-rose-500" sub={s.leaveDays ? `${s.leaveDays} leave` : undefined} />
                <MiniStat label="Overtime" value={fmtHM(s.overtimeMinutes)} sub={s.lateDays ? `late ${s.lateDays}×` : "never late"} />
                <MiniStat
                  label="Attendance"
                  value={s.attendancePercent === null ? "—" : `${s.attendancePercent}%`}
                  sub={s.missingPunchOuts ? `${s.missingPunchOuts} no punch-out` : undefined}
                />
              </div>

              {layout === "calendar" ? (
                <div className="bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800 rounded-2xl p-3">
                  <div className="grid grid-cols-7 gap-1.5">
                    {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((h) => (
                      <div key={h} className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 text-center pb-1">
                        {h}
                      </div>
                    ))}
                    {Array.from({ length: lead }).map((_, i) => (
                      <div key={`blank-${i}`} />
                    ))}
                    {data.days.map((d) => {
                      const meta = ATT_STATUS_META[d.status] || ATT_STATUS_META.ABSENT;
                      const isToday = d.date === todayKey;
                      return (
                        <div
                          key={d.date}
                          title={[
                            fmtDayKey(d.date, { weekday: "long", day: "2-digit", month: "short" }),
                            meta.label,
                            d.holidayName,
                            d.firstPunch ? `In ${fmtPunch(d.firstPunch)}` : null,
                            d.lastPunch ? `Out ${fmtPunch(d.lastPunch)}` : d.firstPunch ? "No punch-out" : null,
                            d.workingMinutes ? `Worked ${fmtHM(d.workingMinutes)} of ${fmtHM(d.expectedMinutes)}` : null,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                          className={`rounded-xl border p-1.5 sm:p-2 min-h-[70px] ${meta.cell} ${isToday ? "ring-2 ring-[#0f4a29]" : ""}`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-extrabold text-slate-700 dark:text-slate-200">{Number(d.date.slice(8))}</span>
                            {meta.short && (
                              <span className={`text-[9px] font-extrabold px-1.5 rounded-full border ${meta.cls}`}>{meta.short}</span>
                            )}
                          </div>
                          {d.firstPunch ? (
                            <div className="mt-1 space-y-0.5">
                              <div className="text-[9px] sm:text-[10px] font-bold text-slate-600 dark:text-slate-300 leading-tight">
                                {fmtPunch(d.firstPunch)}
                              </div>
                              <div
                                className={`text-[9px] sm:text-[10px] font-bold leading-tight ${
                                  d.lastPunch ? "text-slate-600 dark:text-slate-300" : "text-orange-500"
                                }`}
                              >
                                {d.lastPunch ? fmtPunch(d.lastPunch) : isToday ? "working…" : "no out"}
                              </div>
                              {d.workingMinutes > 0 && (
                                <div className="text-[10px] font-extrabold text-slate-900 dark:text-white">{fmtHM(d.workingMinutes)}</div>
                              )}
                            </div>
                          ) : (
                            d.holidayName && (
                              <div className="text-[9px] font-bold text-violet-600 dark:text-violet-400 mt-1 leading-tight line-clamp-2">
                                {d.holidayName}
                              </div>
                            )
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              <div className={layout === "calendar" ? "hidden print:block" : ""}>
                <TableCard>
                  <thead>
                    <tr>
                      {["Date", "Shift", "In", "Out", "All Punches", "Worked", "Expected", "Diff", "Late", "Early", "OT", "Status"].map((h) => (
                        <Th key={h}>{h}</Th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.days.map((d) => {
                      const off = d.dayType !== "WORKING";
                      return (
                        <tr
                          key={d.date}
                          className={`border-t border-slate-100 dark:border-slate-800/60 ${off ? "bg-slate-50/60 dark:bg-slate-950/30" : ""}`}
                        >
                          <Td className="font-bold whitespace-nowrap">
                            {fmtDayKey(d.date)}
                            {d.holidayName && <div className="text-[10px] text-violet-500 font-medium">{d.holidayName}</div>}
                          </Td>
                          <Td>{off && !d.firstPunch ? <span className="text-slate-300">—</span> : <ShiftCell shift={d.shift} />}</Td>
                          <Td className="whitespace-nowrap font-bold">{fmtPunch(d.firstPunch)}</Td>
                          <Td className="whitespace-nowrap font-bold">{d.lastPunch ? fmtPunch(d.lastPunch) : "—"}</Td>
                          <Td>
                            {d.punches?.length ? (
                              <div className="flex flex-wrap gap-1 max-w-[220px]">
                                {d.punches.map((pu, i) => (
                                  <span
                                    key={i}
                                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 whitespace-nowrap"
                                  >
                                    {fmtPunch(pu.time)}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              "—"
                            )}
                          </Td>
                          <Td className="font-extrabold">{d.workingMinutes ? fmtHM(d.workingMinutes) : "—"}</Td>
                          <Td className="text-slate-500">{d.expectedMinutes ? fmtHM(d.expectedMinutes) : "—"}</Td>
                          <Td>
                            {d.expectedMinutes || d.workingMinutes ? (
                              <DiffText mins={(d.workingMinutes || 0) - (d.expectedMinutes || 0)} />
                            ) : (
                              "—"
                            )}
                          </Td>
                          <Td className={d.lateMinutes ? "text-rose-500 font-bold" : ""}>{d.lateMinutes ? fmtHM(d.lateMinutes) : "—"}</Td>
                          <Td>{d.earlyExitMinutes ? fmtHM(d.earlyExitMinutes) : "—"}</Td>
                          <Td>{d.overtimeMinutes ? fmtHM(d.overtimeMinutes) : "—"}</Td>
                          <Td>
                            <DayStatusBadge day={d} todayKey={todayKey} />
                          </Td>
                        </tr>
                      );
                    })}
                  </tbody>
                </TableCard>
              </div>

              {/* Legend */}
              <div className="attendance-no-print flex flex-wrap gap-2 text-[10px] font-bold text-slate-500">
                {["PRESENT", "HALF_DAY", "ABSENT", "ON_LEAVE", "WEEK_OFF", "HOLIDAY"].map((k) => (
                  <span key={k} className={`px-2 py-0.5 rounded-full border ${ATT_STATUS_META[k].cls}`}>
                    {ATT_STATUS_META[k].short} = {ATT_STATUS_META[k].label}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value, sub, tone }) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3">
      <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">{label}</p>
      <p className={`text-lg font-extrabold mt-0.5 ${tone || "text-slate-900 dark:text-white"}`}>{value}</p>
      {sub && <p className="text-[10px] font-medium text-slate-400">{sub}</p>}
    </div>
  );
}