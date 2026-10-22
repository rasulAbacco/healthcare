// client/src/pages/admin/biometric/BiometricManagement.jsx
import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
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
  Check,
  CalendarOff,
  Trash2,
  Save,
} from "lucide-react";
import { useMappingConflictCheck } from "./MappingConflictDialog";

// `short` is shown on phones / tablets, `label` on wide screens.
const TABS = [
  {
    key: "dashboard",
    label: "Dashboard",
    short: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    key: "devices",
    label: "Devices",
    short: "Devices",
    icon: MonitorSmartphone,
  },
  { key: "shifts", label: "Shifts", short: "Shifts", icon: Clock },
  {
    key: "userMapping",
    label: "Staff Mapping",
    short: "Staff Map",
    icon: Link2,
  },
  {
    key: "employeeMapping",
    label: "Employee Mapping",
    short: "Emp. Map",
    icon: Users2,
  },
  {
    key: "report",
    label: "Attendance",
    short: "Attendance",
    icon: FileBarChart,
  },
  {
    key: "weekOffs",
    label: "Week-off Rules",
    short: "Week-offs",
    icon: CalendarOff,
  },
];
const isTabKey = (k) => TABS.some((t) => t.key === k);

export default function BiometricManagement() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlTab = searchParams.get("tab");
  const [tab, setTabState] = useState(isTabKey(urlTab) ? urlTab : "dashboard");

  // Coming back from the Add/Edit mapping page lands on ?tab=...
  useEffect(() => {
    if (isTabKey(urlTab) && urlTab !== tab) setTabState(urlTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlTab]);

  const setTab = (key) => {
    setTabState(key);
    const next = new URLSearchParams(searchParams);
    next.set("tab", key);
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="space-y-4 sm:space-y-6 font-sans text-slate-900 bg-[#f4f5f7] dark:bg-slate-950 p-2 sm:p-4 rounded-3xl min-w-0">
      <PageHeader
        title="Biometric Attendance"
        subtitle="Manage hardware devices, shift schedules, mappings, and attendance"
      />

      {/* Responsive tab bar: 4+3 grid on phones, one row from sm, full labels from lg */}
      <nav
        aria-label="Biometric sections"
        className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl sm:rounded-full p-1.5 shadow-2xs"
      >
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-1">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                aria-current={active ? "page" : undefined}
                title={t.label}
                className={`min-w-0 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 px-1.5 sm:px-3 py-2 sm:py-1.5 rounded-xl sm:rounded-full text-[11px] sm:text-xs font-extrabold transition-all ${
                  active
                    ? "bg-[#0f4a29] text-white shadow-xs"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                <Icon className="w-4 h-4 sm:w-3.5 sm:h-3.5 shrink-0" />
                <span className="truncate max-w-full">
                  <span className="lg:hidden">{t.short}</span>
                  <span className="hidden lg:inline">{t.label}</span>
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {tab === "dashboard" && <DashboardTab />}
      {tab === "devices" && <DevicesTab />}
      {tab === "shifts" && <ShiftsTab />}
      {tab === "userMapping" && <MappingTab key="user" kind="user" />}
      {tab === "employeeMapping" && (
        <MappingTab key="employee" kind="employee" />
      )}
      {tab === "report" && <AttendanceTab />}
      {tab === "weekOffs" && <WeekOffSettingsTab />}
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

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required,
}) {
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

function IconBtn({ children, onClick, title, disabled }) {
  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-40"
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
      <p
        className={`text-2xl font-extrabold mt-1 ${tone || "text-slate-900 dark:text-white"}`}
      >
        {value}
      </p>
      {sub && (
        <p className="text-[11px] font-medium text-slate-400 mt-0.5">{sub}</p>
      )}
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
          <Card
            label="Devices"
            value={`${data.activeDevices}/${data.totalDevices}`}
            sub="active / total"
          />
          <Card label="Mapped Staff" value={data.mappedUsers} />
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

const emptyDeviceForm = {
  name: "",
  deviceCode: "",
  serialNumber: "",
  location: "",
};

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
    if (
      !createForm.name ||
      !createForm.deviceCode ||
      !createForm.serialNumber
    ) {
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
      await api.put(`/biometric/devices/${d.id}/toggle`, {});
      setInfo(`${d.name} ${d.isActive ? "disabled" : "enabled"}.`);
      fetchDevices();
    } catch (err) {
      setError(err.message || "Could not update device status.");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search devices..."
        />
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
                onChange={(v) =>
                  setCreateForm((f) => ({ ...f, deviceCode: v }))
                }
                placeholder="DEV-001"
                required
              />
              <Field
                label="Serial Number"
                value={createForm.serialNumber}
                onChange={(v) =>
                  setCreateForm((f) => ({ ...f, serialNumber: v }))
                }
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
              {[
                "Name",
                "Device Code",
                "Serial No.",
                "Location",
                "Status",
                "Actions",
              ].map((h) => (
                <Th key={h}>{h}</Th>
              ))}
            </tr>
          </thead>
          <tbody>
            {devices.map((d) => (
              <tr
                key={d.id}
                className="border-t border-slate-100 dark:border-slate-800/60"
              >
                {editingId === d.id ? (
                  <td
                    colSpan={6}
                    className="p-5 bg-slate-50/50 dark:bg-slate-950/40"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                      <Field
                        label="Name"
                        value={editForm.name}
                        onChange={(v) =>
                          setEditForm((f) => ({ ...f, name: v }))
                        }
                      />
                      <Field
                        label="Device Code"
                        value={editForm.deviceCode}
                        onChange={(v) =>
                          setEditForm((f) => ({ ...f, deviceCode: v }))
                        }
                      />
                      <Field
                        label="Serial Number"
                        value={editForm.serialNumber}
                        onChange={(v) =>
                          setEditForm((f) => ({ ...f, serialNumber: v }))
                        }
                      />
                      <Field
                        label="Location"
                        value={editForm.location}
                        onChange={(v) =>
                          setEditForm((f) => ({ ...f, location: v }))
                        }
                      />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => setEditingId(null)}
                        className="text-xs font-bold text-slate-500 px-3 py-1.5"
                      >
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
                    <Td className="font-extrabold text-slate-900 dark:text-white">
                      {d.name}
                    </Td>
                    <Td className="font-mono text-xs">{d.deviceCode}</Td>
                    <Td className="font-mono text-xs">{d.serialNumber}</Td>
                    <Td>{d.location || "—"}</Td>
                    <Td>
                      <StatusBadge
                        active={d.isActive}
                        inactiveLabel="Disabled"
                      />
                    </Td>
                    <Td>
                      <div className="flex gap-1 items-center">
                        <IconBtn title="Edit" onClick={() => startEdit(d)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </IconBtn>
                        <IconBtn
                          title={d.isActive ? "Disable" : "Enable"}
                          onClick={() => toggleActive(d)}
                        >
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
                <td
                  colSpan={6}
                  className="px-5 py-8 text-center text-xs text-slate-400 font-medium"
                >
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
  DAY: {
    label: "Day Shift",
    icon: Sun,
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  NIGHT: {
    label: "Night Shift",
    icon: Moon,
    className: "bg-indigo-50 text-indigo-700 border-indigo-200",
  },
  GENERAL: {
    label: "General Shift",
    icon: CalendarClock,
    className: "bg-slate-100 text-slate-600 border-slate-200",
  },
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
  lateExcuseMinutes: 60,
  dayWindowMinutes: 20,
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
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${meta.className}`}
    >
      <Icon className="w-3 h-3" /> {meta.label}
    </span>
  );
}

function StatusBadge({
  active,
  activeLabel = "Active",
  inactiveLabel = "Inactive",
}) {
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
        <Field
          label="Shift Name"
          value={form.name}
          onChange={(v) => setForm((f) => ({ ...f, name: v }))}
          placeholder="Day Shift"
        />
        <Field
          label="Shift Code"
          value={form.code}
          onChange={(v) => setForm((f) => ({ ...f, code: v }))}
          placeholder="DAY-01"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field
          label="Shift Start Time"
          type="time"
          value={form.startTime}
          onChange={(v) => setForm((f) => ({ ...f, startTime: v }))}
        />
        <Field
          label="Shift End Time"
          type="time"
          value={form.endTime}
          onChange={(v) => setForm((f) => ({ ...f, endTime: v }))}
        />
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
          label="Late login + early logout excuse (mins)"
          type="number"
          value={form.lateExcuseMinutes}
          onChange={(v) => setForm((f) => ({ ...f, lateExcuseMinutes: v }))}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field
          label="Half-day / OT window (mins)"
          type="number"
          value={form.dayWindowMinutes}
          onChange={(v) => setForm((f) => ({ ...f, dayWindowMinutes: v }))}
        />
        <p className="text-[10px] text-slate-400 font-medium sm:pt-5">
          The excuse is the total late login + early logout still counted as a
          full day. The window is how much less than half-day / full-day OT is
          still accepted.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
            Shift Type
          </label>
          <select
            value={form.type}
            onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
            className={`w-full ${selectCls}`}
          >
            <option value="DAY">Day Shift</option>
            <option value="NIGHT">Night Shift</option>
            <option value="GENERAL">General Shift</option>
          </select>
        </div>
        <div>
          <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
            Status
          </label>
          <select
            value={form.isActive ? "active" : "inactive"}
            onChange={(e) =>
              setForm((f) => ({ ...f, isActive: e.target.value === "active" }))
            }
            className={`w-full ${selectCls}`}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
          Total Working Hours
        </label>
        <div className="w-full bg-[#0f4a29]/10 border border-[#0f4a29]/20 rounded-xl px-3 py-2 text-xs font-extrabold text-[#0f4a29] dark:text-[#52b788]">
          {preview === null
            ? "Set valid start & end time"
            : formatMinutesHrs(preview)}
        </div>
        <ShiftRulesPreview form={form} working={preview} />
      </div>
    </div>
  );
}

// Live "what does this mean" box under the shift form.
function ShiftRulesPreview({ form, working }) {
  if (working === null || !working) return null;
  const excuse = Math.max(0, Number(form.lateExcuseMinutes) || 0);
  const win = Math.max(0, Number(form.dayWindowMinutes) || 0);
  const half = Math.round(working / 2);
  const rows = [
    [
      "Full day (Present)",
      `worked ≥ ${formatMinutesHrs(Math.max(0, working - excuse))}`,
    ],
    [
      "Half day",
      `punched in & out, less than ${formatMinutesHrs(Math.max(0, working - excuse))}`,
    ],
    [
      "Half-day OT",
      `extra ≥ ${formatMinutesHrs(Math.max(0, half - win))} beyond ${formatMinutesHrs(working)}`,
    ],
    [
      "Full-day OT",
      `extra ≥ ${formatMinutesHrs(Math.max(0, working - win))} beyond ${formatMinutesHrs(working)}`,
    ],
    [
      "Smaller extra time",
      "not OT — covers late login / short hours in the month",
    ],
  ];
  return (
    <div className="mt-2 rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-800">
      {rows.map(([k, v]) => (
        <div
          key={k}
          className="flex flex-wrap justify-between gap-2 px-3 py-1.5 text-[11px]"
        >
          <span className="font-extrabold text-slate-700 dark:text-slate-200">
            {k}
          </span>
          <span className="font-medium text-slate-500 dark:text-slate-400">
            {v}
          </span>
        </div>
      ))}
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
      lateExcuseMinutes: s.lateExcuseMinutes ?? 60,
      dayWindowMinutes: s.dayWindowMinutes ?? 20,
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
    if (
      !form.name.trim() ||
      !form.code.trim() ||
      !form.startTime ||
      !form.endTime
    ) {
      return setError(
        "Shift name, code, start time, and end time are required.",
      );
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
      await api.put(`/biometric/shifts/${s.id}/toggle`, {});
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
        <Card
          label="Assigned Staff"
          value={summary?.employeesAssigned ?? "—"}
        />
        <Card
          label="Avg. Hours"
          value={summary ? `${summary.avgWorkingHours}h` : "—"}
        />
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
              {[
                "Shift Name",
                "Code",
                "Start",
                "End",
                "Total Hours",
                "Status",
                "Actions",
              ].map((h) => (
                <Th key={h}>{h}</Th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shifts.map((s) => (
              <tr
                key={s.id}
                className="border-t border-slate-100 dark:border-slate-800/60"
              >
                <Td className="font-extrabold text-slate-900 dark:text-white">
                  <div>{s.name}</div>
                  <div className="mt-0.5">
                    <ShiftTypeBadge type={s.type} />
                  </div>
                </Td>
                <Td className="font-mono text-xs">{s.code}</Td>
                <Td>{formatTime12h(s.startTime)}</Td>
                <Td>{formatTime12h(s.endTime)}</Td>
                <Td className="font-bold">
                  {formatMinutesHrs(s.totalWorkingMinutes)}
                </Td>
                <Td>
                  <StatusBadge active={s.isActive} />
                </Td>
                <Td>
                  <div className="flex gap-1 items-center">
                    <IconBtn title="Edit" onClick={() => openEdit(s)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </IconBtn>
                    <IconBtn
                      title={s.isActive ? "Deactivate" : "Activate"}
                      onClick={() => toggleActive(s)}
                    >
                      <Power className="w-3.5 h-3.5" />
                    </IconBtn>
                  </div>
                </Td>
              </tr>
            ))}
            {shifts.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-5 py-8 text-center text-xs text-slate-400 font-medium"
                >
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
            <h4 className="font-extrabold text-slate-900 dark:text-white text-sm">
              {editingId ? "Edit Shift" : "Add Shift"}
            </h4>
            <button
              onClick={closeForm}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <form onSubmit={submitForm}>
            <ShiftForm form={form} setForm={setForm} />
            <div className="flex gap-2 justify-end pt-4">
              <button
                type="button"
                onClick={closeForm}
                className="text-xs font-bold text-slate-500 px-4 py-2"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="bg-[#0f4a29] hover:bg-[#165a34] text-white text-xs font-extrabold px-5 py-2 rounded-full shadow-xs"
              >
                {saving
                  ? "Saving..."
                  : editingId
                    ? "Save Changes"
                    : "Create Shift"}
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
// Mapping Tab (Staff users & Employees)
//
// Staff Mapping    → login accounts (User: Admin, Doctor, Receptionist,
//                    Pharmacy, Manager). Shift is chosen on the mapping.
// Employee Mapping → workforce directory (Employee: nurses, ward boys,
//                    housekeeping…). Shift comes from Shift Assignment.
//
// Status: making a mapping Inactive is immediate. Making it Active checks
// whether the same biometric ID is already active for someone else and asks
// to make that one Inactive first.
// ============================================================================

function StatusToggle({ active, busy, onChange }) {
  return (
    <div className="inline-flex items-center gap-1">
      <div className="inline-flex p-0.5 rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60">
        {[
          { v: true, label: "Active" },
          { v: false, label: "Inactive" },
        ].map((o) => {
          const selected = active === o.v;
          return (
            <button
              key={o.label}
              type="button"
              disabled={busy}
              onClick={() => !selected && onChange(o.v)}
              className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold transition-all disabled:cursor-wait ${
                selected
                  ? o.v
                    ? "bg-[#0f4a29] text-white shadow-xs"
                    : "bg-rose-500 text-white shadow-xs"
                  : "text-slate-500 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
      {busy && <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0f4a29]" />}
    </div>
  );
}

const deactivatedNote = (list) =>
  list?.length
    ? ` ${list.map((c) => c.personName).join(", ")} set to Inactive.`
    : "";

function MappingTab({ kind }) {
  const isUser = kind === "user";
  const personLabel = isUser ? "Staff" : "Employee";
  const { checkConflicts, conflictDialog } = useMappingConflictCheck();

  const [mappings, setMappings] = useState([]);
  const [devices, setDevices] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const [listSearch, setListSearch] = useState("");
  const [statusView, setStatusView] = useState("ALL"); // ALL | ACTIVE | INACTIVE

  const [personSearch, setPersonSearch] = useState("");
  const [personResults, setPersonResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  const [showAssign, setShowAssign] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [assignForm, setAssignForm] = useState({
    biometricId: "",
    deviceId: "",
    shiftId: "",
  });
  const [saving, setSaving] = useState(false);

  const [shiftSavingId, setShiftSavingId] = useState(null);
  const [statusSavingId, setStatusSavingId] = useState(null);

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ biometricId: "", deviceId: "" });
  const [editSaving, setEditSaving] = useState(false);

  const fetchMappings = useCallback(async () => {
    setLoading(true);
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
        setDevices(data);
      } catch {
        // dropdown convenience only
      }
    })();
  }, []);

  useEffect(() => {
    if (!isUser) return;
    (async () => {
      try {
        const data = await api.get("/biometric/shifts?status=active&limit=100");
        setShifts(data.shifts);
      } catch {
        // dropdown convenience only
      }
    })();
  }, [isUser]);

  const activeDevices = useMemo(
    () => devices.filter((d) => d.isActive),
    [devices],
  );

  const mappingsByPerson = useMemo(() => {
    const map = new Map();
    for (const m of mappings) {
      const pid = isUser ? m.userId : m.employeeId;
      if (!map.has(pid)) map.set(pid, []);
      map.get(pid).push(m);
    }
    return map;
  }, [mappings, isUser]);

  const counts = useMemo(
    () => ({
      ALL: mappings.length,
      ACTIVE: mappings.filter((m) => m.isActive).length,
      INACTIVE: mappings.filter((m) => !m.isActive).length,
    }),
    [mappings],
  );

  const visible = useMemo(() => {
    const q = listSearch.trim().toLowerCase();
    return mappings.filter((m) => {
      if (statusView === "ACTIVE" && !m.isActive) return false;
      if (statusView === "INACTIVE" && m.isActive) return false;
      if (!q) return true;
      const name = (isUser ? m.user?.fullName : m.employee?.fullName) || "";
      return `${name} ${m.biometricId} ${m.device?.name || ""}`
        .toLowerCase()
        .includes(q);
    });
  }, [mappings, statusView, listSearch, isUser]);

  const clearMessages = () => {
    setError("");
    setInfo("");
  };

  const runSearch = async () => {
    setSearching(true);
    clearMessages();
    try {
      const endpoint = isUser ? "/biometric/users" : "/biometric/employees";
      const { users, employees } = await api.get(
        `${endpoint}?search=${encodeURIComponent(personSearch)}`,
      );
      setPersonResults(isUser ? users : employees);
      setSearched(true);
    } catch (err) {
      setError(err.message || "Search failed.");
    } finally {
      setSearching(false);
    }
  };

  const openAssign = (person) => {
    setSelectedPerson(person);
    setAssignForm({
      biometricId: "",
      deviceId: activeDevices[0]?.id || "",
      shiftId: "",
    });
    setShowAssign(true);
  };

  const closeAssign = () => {
    setShowAssign(false);
    setSelectedPerson(null);
  };

  const submitAssign = async (e) => {
    e.preventDefault();
    clearMessages();
    const biometricId = assignForm.biometricId.trim();
    if (!biometricId || !assignForm.deviceId) {
      return setError("Biometric ID and device are both required.");
    }
    setSaving(true);
    try {
      const { proceed, deactivateConflicts } =
        await checkConflicts(biometricId);
      if (!proceed) return;
      const res = await api.post("/biometric/mappings", {
        biometricId,
        deviceId: assignForm.deviceId,
        deactivateConflicts,
        ...(isUser && assignForm.shiftId
          ? { shiftId: assignForm.shiftId }
          : {}),
        ...(isUser
          ? { userId: selectedPerson.id }
          : { employeeId: selectedPerson.id }),
      });
      setInfo(
        `${selectedPerson.fullName} mapped successfully.${deactivatedNote(res?.deactivated)}`,
      );
      closeAssign();
      setPersonResults([]);
      setSearched(false);
      fetchMappings();
    } catch (err) {
      setError(err.message || "Could not create mapping.");
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (m, active) => {
    if (m.isActive === active) return;
    clearMessages();
    setStatusSavingId(m.id);
    const name =
      (isUser ? m.user?.fullName : m.employee?.fullName) || "Mapping";
    try {
      let deactivateConflicts = false;
      if (active) {
        const r = await checkConflicts(m.biometricId, m.id);
        if (!r.proceed) return;
        deactivateConflicts = r.deactivateConflicts;
      }
      const res = await api.put(`/biometric/mappings/${m.id}/status`, {
        isActive: active,
        deactivateConflicts,
      });
      setInfo(
        `${name} is now ${active ? "Active" : "Inactive"}.${deactivatedNote(res?.deactivated)}`,
      );
      fetchMappings();
    } catch (err) {
      setError(err.message || "Could not update status.");
    } finally {
      setStatusSavingId(null);
    }
  };

  const startEdit = (m) => {
    clearMessages();
    setEditingId(m.id);
    setEditForm({ biometricId: m.biometricId, deviceId: m.deviceId });
  };

  const saveEdit = async (m) => {
    clearMessages();
    const biometricId = editForm.biometricId.trim();
    if (!biometricId) return setError("Biometric ID can't be empty.");
    if (!editForm.deviceId) return setError("Please select a device.");
    setEditSaving(true);
    try {
      let deactivateConflicts = false;
      if (m.isActive && biometricId !== m.biometricId) {
        const r = await checkConflicts(biometricId, m.id);
        if (!r.proceed) return;
        deactivateConflicts = r.deactivateConflicts;
      }
      const res = await api.put(`/biometric/mappings/${m.id}`, {
        biometricId,
        deviceId: editForm.deviceId,
        deactivateConflicts,
      });
      setInfo(`Mapping updated.${deactivatedNote(res?.deactivated)}`);
      setEditingId(null);
      fetchMappings();
    } catch (err) {
      setError(err.message || "Could not update mapping.");
    } finally {
      setEditSaving(false);
    }
  };

  const changeMappingShift = async (m, shiftId) => {
    clearMessages();
    setShiftSavingId(m.id);
    try {
      await api.put(`/biometric/mappings/${m.id}/shift`, {
        shiftId: shiftId || null,
      });
      setInfo(
        "Shift updated. Use Attendance → Recalculate if past days should use the new timing.",
      );
      fetchMappings();
    } catch (err) {
      setError(err.message || "Could not update shift.");
    } finally {
      setShiftSavingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 text-[11px] text-slate-500 dark:text-slate-400 font-medium px-1">
        <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
        <span>
          {isUser ? (
            <>
              <b>Staff Mapping</b> links a biometric ID to a{" "}
              <b>login account</b> (Admin, Doctor, Receptionist, Pharmacy,
              Manager). Their shift is picked here. Workforce staff without a
              login (nurses, ward boys, housekeeping) go in{" "}
              <b>Employee Mapping</b>.
            </>
          ) : (
            <>
              <b>Employee Mapping</b> links a biometric ID to a{" "}
              <b>workforce directory</b> record (nurses, ward boys,
              housekeeping). Working hours come from their Shift Assignment.
              Login accounts go in <b>Staff Mapping</b>.
            </>
          )}{" "}
          One biometric ID can be <b>Active</b> for only one person at a time.
        </span>
      </div>

      <Banner error={error} info={info} />

      <SectionCard
        title={`Search ${isUser ? "Staff" : "Employees"} to Map`}
        icon={UserPlus}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            runSearch();
          }}
          className="flex gap-2 flex-wrap mb-3"
        >
          <div className="flex-1 min-w-[180px]">
            <SearchBar
              value={personSearch}
              onChange={setPersonSearch}
              placeholder={
                isUser
                  ? "Search staff by name, email, phone..."
                  : "Search employee by name, designation, phone..."
              }
            />
          </div>
          <button
            type="submit"
            disabled={searching}
            className="bg-[#0f4a29] hover:bg-[#165a34] text-white text-xs font-extrabold px-5 py-2 rounded-full shadow-xs disabled:opacity-60"
          >
            {searching ? "Searching..." : "Search"}
          </button>
        </form>

        {personResults.length > 0 && (
          <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden max-h-72 overflow-y-auto">
            {personResults.map((p) => {
              const existing = mappingsByPerson.get(p.id) || [];
              return (
                <div
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-extrabold text-slate-800 dark:text-white truncate">
                      {p.fullName}
                    </p>
                    <p className="text-[10px] text-slate-400 font-medium truncate">
                      {isUser ? `${p.role} · ${p.email}` : p.designation}
                    </p>
                    {existing.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {existing.map((m) => (
                          <span
                            key={m.id}
                            className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-md border ${
                              m.isActive
                                ? "bg-[#0f4a29]/10 text-[#0f4a29] dark:text-[#52b788] border-[#0f4a29]/20"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700"
                            }`}
                          >
                            ID {m.biometricId} ·{" "}
                            {m.isActive ? "Active" : "Inactive"}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => openAssign(p)}
                    className="text-xs font-extrabold text-[#0f4a29] dark:text-[#52b788] hover:underline whitespace-nowrap"
                  >
                    + Map Biometric ID
                  </button>
                </div>
              );
            })}
          </div>
        )}
        {searched && !searching && personResults.length === 0 && (
          <p className="text-xs text-slate-400 font-medium">
            No {isUser ? "staff" : "employees"} found.
          </p>
        )}
      </SectionCard>

      {showAssign && selectedPerson && (
        <SectionCard
          title={`Assign Biometric ID for ${selectedPerson.fullName}`}
          icon={Link2}
        >
          <form onSubmit={submitAssign} className="space-y-4">
            <div
              className={`grid grid-cols-1 ${isUser ? "sm:grid-cols-3" : "sm:grid-cols-2"} gap-3`}
            >
              <Field
                label="Biometric ID"
                value={assignForm.biometricId}
                onChange={(v) =>
                  setAssignForm((f) => ({ ...f, biometricId: v }))
                }
                placeholder="Enrollment / card number"
                required
              />
              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
                  Device<span className="text-rose-500 ml-0.5">*</span>
                </label>
                <select
                  value={assignForm.deviceId}
                  onChange={(e) =>
                    setAssignForm((f) => ({ ...f, deviceId: e.target.value }))
                  }
                  className={`w-full ${selectCls}`}
                >
                  <option value="">Select device</option>
                  {activeDevices.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.deviceCode})
                    </option>
                  ))}
                </select>
              </div>
              {isUser && (
                <div>
                  <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
                    Shift
                  </label>
                  <select
                    value={assignForm.shiftId}
                    onChange={(e) =>
                      setAssignForm((f) => ({ ...f, shiftId: e.target.value }))
                    }
                    className={`w-full ${selectCls}`}
                  >
                    <option value="">Default (9:00 AM – 5:00 PM)</option>
                    {shifts.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({formatTime12h(s.startTime)} –{" "}
                        {formatTime12h(s.endTime)})
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
                onClick={closeAssign}
                className="text-xs font-bold text-slate-500 px-4 py-2"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="bg-[#0f4a29] hover:bg-[#165a34] text-white text-xs font-extrabold px-5 py-2 rounded-full shadow-xs disabled:opacity-60"
              >
                {saving ? "Assigning..." : "Assign ID"}
              </button>
            </div>
          </form>
        </SectionCard>
      )}

      {/* List filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-full">
          {[
            { v: "ALL", label: "All" },
            { v: "ACTIVE", label: "Active" },
            { v: "INACTIVE", label: "Inactive" },
          ].map((o) => (
            <button
              key={o.v}
              onClick={() => setStatusView(o.v)}
              className={`px-3 py-1.5 rounded-full text-xs font-extrabold transition-all ${
                statusView === o.v
                  ? "bg-[#0f4a29] text-white"
                  : "text-slate-500 dark:text-slate-300"
              }`}
            >
              {o.label} <span className="opacity-70">({counts[o.v]})</span>
            </button>
          ))}
        </div>
        <SearchBar
          value={listSearch}
          onChange={setListSearch}
          placeholder="Filter by name, ID, device..."
        />
      </div>

      {loading && !mappings.length ? (
        <Loading label="Loading mappings..." />
      ) : (
        <TableCard>
          <thead>
            <tr>
              {[
                personLabel,
                "Biometric ID",
                "Device",
                "Shift",
                "Status",
                "Actions",
              ].map((h) => (
                <Th key={h}>{h}</Th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((m) => {
              const editing = editingId === m.id;
              const person = isUser ? m.user : m.employee;
              const deviceOptions = activeDevices.some(
                (d) => d.id === m.deviceId,
              )
                ? activeDevices
                : [
                    ...activeDevices,
                    ...(m.device
                      ? [{ ...m.device, name: `${m.device.name} (disabled)` }]
                      : []),
                  ];
              return (
                <tr
                  key={m.id}
                  className={`border-t border-slate-100 dark:border-slate-800/60 ${m.isActive ? "" : "bg-slate-50/60 dark:bg-slate-950/30"}`}
                >
                  <Td className="font-extrabold text-slate-900 dark:text-white">
                    <div className={m.isActive ? "" : "text-slate-500"}>
                      {person?.fullName || "Unknown"}
                    </div>
                    <div className="text-[10px] text-slate-400 font-medium">
                      {isUser ? person?.role || "" : person?.designation || ""}
                    </div>
                  </Td>
                  <Td className="font-mono text-xs">
                    {editing ? (
                      <input
                        value={editForm.biometricId}
                        onChange={(e) =>
                          setEditForm((f) => ({
                            ...f,
                            biometricId: e.target.value,
                          }))
                        }
                        className={`${selectCls} w-28 py-1.5 font-mono`}
                      />
                    ) : (
                      m.biometricId
                    )}
                  </Td>
                  <Td>
                    {editing ? (
                      <select
                        value={editForm.deviceId}
                        onChange={(e) =>
                          setEditForm((f) => ({
                            ...f,
                            deviceId: e.target.value,
                          }))
                        }
                        className={`${selectCls} py-1.5 max-w-[180px]`}
                      >
                        <option value="">Select device</option>
                        {deviceOptions.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      m.device?.name || "—"
                    )}
                  </Td>
                  <Td>
                    {isUser ? (
                      <div className="flex items-center gap-1.5">
                        <select
                          value={m.shiftId || ""}
                          disabled={shiftSavingId === m.id}
                          onChange={(e) =>
                            changeMappingShift(m, e.target.value)
                          }
                          className={`${selectCls} py-1.5 max-w-[200px]`}
                        >
                          <option value="">Default (9 AM – 5 PM)</option>
                          {m.shift &&
                            !shifts.some((s) => s.id === m.shift.id) && (
                              <option value={m.shift.id}>
                                {m.shift.name} (inactive)
                              </option>
                            )}
                          {shifts.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                        {shiftSavingId === m.id && (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0f4a29]" />
                        )}
                      </div>
                    ) : (
                      <div>
                        <div className="text-xs font-bold text-slate-700 dark:text-slate-200 whitespace-nowrap">
                          {m.employee?.shift?.name || "Default (9 AM – 5 PM)"}
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium whitespace-nowrap">
                          {m.employee?.shift
                            ? `${formatTime12h(m.employee.shift.startTime)} – ${formatTime12h(m.employee.shift.endTime)} · via Shift Assignment`
                            : "Set it in Shift Assignment"}
                        </div>
                      </div>
                    )}
                  </Td>
                  <Td>
                    <StatusToggle
                      active={m.isActive}
                      busy={statusSavingId === m.id}
                      onChange={(v) => changeStatus(m, v)}
                    />
                  </Td>
                  <Td>
                    {editing ? (
                      <div className="flex gap-1 items-center">
                        <IconBtn
                          title="Save"
                          onClick={() => saveEdit(m)}
                          disabled={editSaving}
                        >
                          {editSaving ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0f4a29]" />
                          ) : (
                            <Check className="w-3.5 h-3.5 text-[#0f4a29]" />
                          )}
                        </IconBtn>
                        <IconBtn
                          title="Cancel"
                          onClick={() => setEditingId(null)}
                          disabled={editSaving}
                        >
                          <X className="w-3.5 h-3.5" />
                        </IconBtn>
                      </div>
                    ) : (
                      <IconBtn
                        title="Edit biometric ID / device"
                        onClick={() => startEdit(m)}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </IconBtn>
                    )}
                  </Td>
                </tr>
              );
            })}
            {visible.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-5 py-8 text-center text-xs text-slate-400 font-medium"
                >
                  {mappings.length
                    ? "No mappings match these filters."
                    : "No mappings yet. Search above to map a biometric ID."}
                </td>
              </tr>
            )}
          </tbody>
        </TableCard>
      )}

      {conflictDialog}
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
    cls: "bg-sky-50 dark:bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-500/20",
    cell: "bg-sky-50 dark:bg-sky-500/10 border-sky-200 dark:border-sky-500/20",
  },
  // Day off beyond the monthly week-off allowance.
  LEAVE: {
    label: "Leave",
    short: "L",
    cls: "bg-rose-50 dark:bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-500/20",
    cell: "bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20",
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
  { v: "WEEK_OFF", label: "Week Off" },
  { v: "LEAVE", label: "Leave (over week-offs)" },
  { v: "MISSING_OUT", label: "No punch-out" },
  { v: "LATE", label: "Late arrivals" },
  { v: "NOT_YET", label: "No punch yet" },
];

const pad2 = (n) => String(n).padStart(2, "0");
const localKey = (d) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
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
    const monday = addLocalDays(
      today,
      -((today.getDay() + 6) % 7) + offset * 7,
    );
    return { from: localKey(monday), to: localKey(addLocalDays(monday, 6)) };
  }
  if (mode === "month") {
    const first = new Date(today.getFullYear(), today.getMonth() + offset, 1);
    const last = new Date(
      today.getFullYear(),
      today.getMonth() + offset + 1,
      0,
    );
    return { from: localKey(first), to: localKey(last) };
  }
  return { from: custom.from, to: custom.to };
}

function rangeLabel(mode, range) {
  if (!range.from || !range.to) return "";
  const f = keyToLocalDate(range.from);
  const t = keyToLocalDate(range.to);
  if (mode === "day")
    return f.toLocaleDateString("en-IN", {
      weekday: "long",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  if (mode === "month")
    return f.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  return `${f.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })} – ${t.toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    },
  )}`;
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

function fmtDayKey(
  key,
  opts = { weekday: "short", day: "2-digit", month: "short" },
) {
  return keyToLocalDate(key).toLocaleDateString("en-IN", opts);
}

function DiffText({ mins }) {
  const v = Math.round(Number(mins) || 0);
  if (!v) return <span className="font-extrabold text-slate-400">0h</span>;
  const positive = v > 0;
  return (
    <span
      className={`font-extrabold ${positive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500"}`}
    >
      {positive ? "+" : "−"}
      {fmtHM(Math.abs(v))}
    </span>
  );
}

function HoursBar({ worked, expected }) {
  const pct =
    expected > 0
      ? Math.min(100, Math.round((worked / expected) * 100))
      : worked > 0
        ? 100
        : 0;
  const color =
    pct >= 100 ? "bg-emerald-500" : pct >= 75 ? "bg-amber-400" : "bg-rose-400";
  return (
    <div className="w-24">
      <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="text-[10px] text-slate-400 font-bold mt-0.5">
        {expected > 0 ? `${pct}%` : "—"}
      </div>
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
        {formatTime12h(shift.startTime)} – {formatTime12h(shift.endTime)} ·{" "}
        {fmtHM(shift.totalWorkingMinutes)}
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

function OtBadge({ otDays }) {
  if (!otDays) return null;
  return (
    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full border whitespace-nowrap bg-violet-50 dark:bg-violet-500/15 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-500/20">
      {otDays === 1 ? "Full-day OT" : "Half-day OT"}
    </span>
  );
}

function DayStatusBadge({ day, todayKey }) {
  const meta = ATT_STATUS_META[day.status] || ATT_STATUS_META.ABSENT;
  const inProgress = day.missingPunchOut && day.date === todayKey;
  return (
    <div className="flex flex-wrap gap-1 items-center">
      <span
        className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border whitespace-nowrap ${meta.cls}`}
      >
        {inProgress
          ? "Working"
          : day.status === "WEEK_OFF" && day.weekOffNumber
            ? `Week Off ${day.weekOffNumber}/${day.weekOffAllowance}`
            : meta.label}
      </span>
      {day.missingPunchOut && !inProgress && (
        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full border whitespace-nowrap bg-orange-50 dark:bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-500/20">
          No punch-out
        </span>
      )}
      <OtBadge otDays={day.otDays} />
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

  const range = useMemo(
    () => rangeFor(mode, offset, custom),
    [mode, offset, custom],
  );
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
      const res = await api.get(
        `/biometric/attendance/overview?from=${range.from}&to=${range.to}`,
      );
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
      if (personType !== "ALL" && person.personType !== personType)
        return false;
      if (
        q &&
        !`${person.fullName} ${person.subtitle || ""} ${person.department || ""}`
          .toLowerCase()
          .includes(q)
      )
        return false;
      return true;
    });
  }, [data, search, personType]);

  const peopleByKey = useMemo(
    () => new Map((data?.people || []).map((p) => [p.person.key, p.person])),
    [data],
  );

  const totals = useMemo(
    () =>
      people.reduce(
        (acc, { summary: s }) => {
          acc.expected += s.expectedMinutes;
          acc.worked += s.workedMinutes;
          acc.overtime += s.overtimeMinutes;
          acc.otDays += s.otDays || 0;
          acc.extra += s.extraMinutes || 0;
          acc.short += s.shortMinutes || 0;
          acc.present += s.presentDays;
          acc.half += s.halfDays;
          acc.weekOff += s.weekOffDays || 0;
          acc.leave += s.leaveDays || 0;
          acc.missing += s.missingPunchOuts;
          acc.lateDays += s.lateDays;
          return acc;
        },
        {
          expected: 0,
          worked: 0,
          overtime: 0,
          otDays: 0,
          extra: 0,
          short: 0,
          present: 0,
          half: 0,
          weekOff: 0,
          leave: 0,
          missing: 0,
          lateDays: 0,
        },
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
          (peopleByKey.get(a.personKey)?.fullName || "").localeCompare(
            peopleByKey.get(b.personKey)?.fullName || "",
          ),
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
      const res = await api.post("/biometric/attendance/rebuild", {
        from: range.from,
        to: range.to,
      });
      setInfo(res.message);
      fetchData();
    } catch (err) {
      setError(err.message || "Could not recalculate attendance.");
    } finally {
      setRebuilding(false);
    }
  };

  const activePreset = RANGE_PRESETS.find(
    (p) => p.mode === mode && (p.mode === "custom" || p.offset === offset),
  );

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
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
                  From
                </label>
                <input
                  type="date"
                  value={custom.from}
                  onChange={(e) =>
                    setCustom((c) => ({ ...c, from: e.target.value }))
                  }
                  className={selectCls}
                />
              </div>
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
                  To
                </label>
                <input
                  type="date"
                  value={custom.to}
                  min={custom.from}
                  onChange={(e) =>
                    setCustom((c) => ({ ...c, to: e.target.value }))
                  }
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
                      view === o.v
                        ? "bg-[#0f4a29] text-white"
                        : "text-slate-500 dark:text-slate-300"
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
              <RefreshCw
                className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
              />
            </button>
            <button
              onClick={rebuild}
              disabled={rebuilding}
              title="Recalculate this range from the raw punch logs"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-slate-200 dark:border-slate-700 text-xs font-extrabold text-slate-600 dark:text-slate-300 hover:border-[#0f4a29] disabled:opacity-50"
            >
              {rebuilding ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Wrench className="w-3.5 h-3.5" />
              )}
              {rebuilding ? "Recalculating..." : "Recalculate"}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search name, designation..."
          />
          <select
            value={personType}
            onChange={(e) => setPersonType(e.target.value)}
            className={selectCls}
          >
            <option value="ALL">Everyone</option>
            <option value="EMPLOYEE">Employees</option>
            <option value="USER">Staff users</option>
          </select>
          {view === "daily" && (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={selectCls}
            >
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
          <Card
            label="Expected Hrs"
            value={fmtHM(totals.expected)}
            sub={`as per shift · ${people.length} people`}
          />
          <Card label="Worked Hrs" value={fmtHM(totals.worked)} />
          <Card
            label="Difference"
            value={`${totals.worked - totals.expected >= 0 ? "+" : "−"}${fmtHM(Math.abs(totals.worked - totals.expected))}`}
            tone={
              totals.worked - totals.expected >= 0
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-rose-500"
            }
            sub={totals.worked - totals.expected >= 0 ? "extra" : "short"}
          />
          <Card
            label="Present"
            value={totals.present}
            sub="full days"
            tone="text-emerald-600 dark:text-emerald-400"
          />
          <Card
            label="Half Days"
            value={totals.half}
            tone="text-amber-600 dark:text-amber-400"
          />
          <Card
            label="Week Offs"
            value={totals.weekOff}
            sub="within monthly limit"
            tone="text-sky-600 dark:text-sky-400"
          />
          <Card
            label="Leave"
            value={totals.leave}
            sub="beyond week-offs"
            tone="text-rose-500"
          />
          <Card
            label="OT Days"
            value={totals.otDays}
            sub={`${fmtHM(totals.overtime)} extra · ${totals.missing} no punch-out`}
            tone="text-violet-600 dark:text-violet-400"
          />
        </div>
      )}

      <div className="flex items-start gap-2 text-[11px] text-slate-500 dark:text-slate-400 font-medium px-1">
        <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
        <span>
          Working hours come from each person's Shift Assignment. A day is{" "}
          <b>Present</b> when hours worked reach the shift hours minus the
          late/early excuse (12h shift → 11h); anything less is <b>Half Day</b>.
          Extra hours of at least half a shift minus the window (5h 40m) are{" "}
          <b>Half-day OT</b>, and a full shift minus the window (11h 40m) is{" "}
          <b>Full-day OT</b>. Smaller extra time isn't OT; it covers late login
          / short hours in the month. There is no fixed weekly holiday: each
          month, the first days without a punch count as <b>Week Off</b> (up to
          each person's limit — see <b>Week-off Rules</b>), and only days beyond
          that count as <b>Leave</b>.
        </span>
      </div>

      {/* ---- Table ---- */}
      {loading && !data ? (
        <Loading label="Loading attendance..." />
      ) : !data ? null : view === "summary" ? (
        <TableCard>
          <thead>
            <tr>
              {[
                "Person",
                "Shift",
                "P / HD / WO / L",
                "Expected",
                "Worked",
                "Difference",
                "OT",
                "Late",
                "",
              ].map((h) => (
                <Th key={h}>{h}</Th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map(({ person, summary: s }) => (
              <tr
                key={person.key}
                className="border-t border-slate-100 dark:border-slate-800/60"
              >
                <Td>
                  <button
                    onClick={() => setViewPerson(person)}
                    className="text-left font-extrabold text-slate-900 dark:text-white hover:text-[#0f4a29] hover:underline"
                  >
                    {person.fullName}
                  </button>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <TypeChip personType={person.personType} />
                    <span className="text-[10px] text-slate-400 font-medium">
                      {person.subtitle}
                    </span>
                  </div>
                </Td>
                <Td>
                  <ShiftCell shift={person.currentShift} />
                </Td>
                <Td>
                  <div className="flex gap-1 text-[11px] font-extrabold whitespace-nowrap">
                    <span className="text-emerald-600 dark:text-emerald-400">
                      {s.presentDays}
                    </span>
                    <span className="text-slate-300">/</span>
                    <span className="text-amber-600 dark:text-amber-400">
                      {s.halfDays}
                    </span>
                    <span className="text-slate-300">/</span>
                    <span className="text-sky-600 dark:text-sky-400">
                      {s.weekOffDays}
                    </span>
                    <span className="text-slate-300">/</span>
                    <span className="text-rose-500">{s.leaveDays}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium">
                    {s.weekOffsLeft} of {s.weekOffsPerMonth} week-offs left
                    {s.missingPunchOuts
                      ? ` · ${s.missingPunchOuts} no-out`
                      : ""}
                  </div>
                </Td>
                <Td className="font-bold">{fmtHM(s.expectedMinutes)}</Td>
                <Td>
                  <div className="font-extrabold text-slate-900 dark:text-white">
                    {fmtHM(s.workedMinutes)}
                  </div>
                  <HoursBar
                    worked={s.workedMinutes}
                    expected={s.expectedMinutes}
                  />
                </Td>
                <Td>
                  <DiffText mins={s.differenceMinutes} />
                </Td>
                <Td>
                  {s.otDays ? (
                    <div className="font-extrabold text-violet-600 dark:text-violet-400 whitespace-nowrap">
                      {s.otDays} day{s.otDays === 1 ? "" : "s"}
                    </div>
                  ) : (
                    <div className="text-slate-400">—</div>
                  )}
                  {s.extraMinutes > 0 && (
                    <div className="text-[10px] text-slate-400 font-medium whitespace-nowrap">
                      +{fmtHM(s.extraMinutes)} extra (not OT)
                    </div>
                  )}
                </Td>
                <Td>
                  {s.lateDays ? (
                    <span className="text-xs">
                      {s.lateDays}×{" "}
                      <span className="text-slate-400">
                        ({fmtHM(s.lateMinutes)})
                      </span>
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
                <td
                  colSpan={9}
                  className="px-5 py-8 text-center text-xs text-slate-400 font-medium"
                >
                  No one matches these filters. Map biometric IDs in the mapping
                  tabs to start tracking attendance.
                </td>
              </tr>
            )}
          </tbody>
        </TableCard>
      ) : (
        <TableCard>
          <thead>
            <tr>
              {[
                "Date",
                "Person",
                "Shift",
                "Punch In",
                "Punch Out",
                "Worked",
                "Expected",
                "Late",
                "Extra",
                "Status",
                "",
              ].map((h) => (
                <Th key={h}>{h}</Th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((d) => {
              const person = peopleByKey.get(d.personKey);
              return (
                <tr
                  key={`${d.personKey}-${d.date}`}
                  className="border-t border-slate-100 dark:border-slate-800/60"
                >
                  <Td className="font-bold whitespace-nowrap">
                    {fmtDayKey(d.date)}
                  </Td>
                  <Td>
                    <button
                      onClick={() => person && setViewPerson(person)}
                      className="text-left font-extrabold text-slate-900 dark:text-white hover:text-[#0f4a29] hover:underline"
                    >
                      {person?.fullName || "—"}
                    </button>
                    <div className="text-[10px] text-slate-400 font-medium">
                      {person?.subtitle}
                    </div>
                  </Td>
                  <Td>
                    <ShiftCell shift={d.shift} />
                  </Td>
                  <Td className="whitespace-nowrap font-bold">
                    {fmtPunch(d.firstPunch)}
                  </Td>
                  <Td className="whitespace-nowrap font-bold">
                    {d.lastPunch ? (
                      fmtPunch(d.lastPunch)
                    ) : (
                      <span className="text-slate-300 dark:text-slate-600">
                        —
                      </span>
                    )}
                  </Td>
                  <Td className="font-extrabold">
                    {d.workingMinutes ? fmtHM(d.workingMinutes) : "—"}
                  </Td>
                  <Td className="text-slate-500">
                    {d.expectedMinutes ? fmtHM(d.expectedMinutes) : "—"}
                  </Td>
                  <Td
                    className={d.lateMinutes ? "text-rose-500 font-bold" : ""}
                  >
                    {d.lateMinutes ? fmtHM(d.lateMinutes) : "—"}
                  </Td>
                  <Td>
                    {d.overtimeMinutes ? (
                      <div className="whitespace-nowrap">
                        <span className="font-bold">
                          {fmtHM(d.overtimeMinutes)}
                        </span>
                        {!d.otDays && (
                          <div className="text-[10px] text-slate-400 font-medium">
                            not OT
                          </div>
                        )}
                      </div>
                    ) : (
                      "—"
                    )}
                  </Td>
                  <Td>
                    <DayStatusBadge day={d} todayKey={todayKey} />
                  </Td>
                  <Td>
                    <IconBtn
                      title="View month"
                      onClick={() => person && setViewPerson(person)}
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </IconBtn>
                  </Td>
                </tr>
              );
            })}
            {pageRows.length === 0 && (
              <tr>
                <td
                  colSpan={11}
                  className="px-5 py-8 text-center text-xs text-slate-400 font-medium"
                >
                  No attendance rows match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </TableCard>
      )}

      <Pager page={page} totalPages={totalPages} setPage={setPage} />

      {viewPerson && (
        <PersonAttendanceModal
          person={viewPerson}
          initialDateKey={range.from}
          onClose={() => setViewPerson(null)}
        />
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
  const isCurrentMonth =
    month.y === now.getFullYear() && month.m === now.getMonth();

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
  const monthLabel = new Date(month.y, month.m, 1).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-2 sm:p-4"
      onClick={onClose}
    >
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
              <h4 className="font-extrabold text-slate-900 dark:text-white text-base truncate">
                {p.fullName}
              </h4>
              <TypeChip personType={p.personType} />
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              {[p.subtitle, p.department].filter(Boolean).join(" · ")}
              {p.weekOffRule &&
                ` · ${p.weekOffRule.perMonth} week-offs/month (${p.weekOffRule.name})`}
              {p.currentShift &&
                ` · ${p.currentShift.source === "DEFAULT" ? "Default shift" : p.currentShift.name} (${formatTime12h(
                  p.currentShift.startTime,
                )} – ${formatTime12h(p.currentShift.endTime)}, ${fmtHM(p.currentShift.totalWorkingMinutes)}/day)`}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 p-1 rounded-full">
              <button
                onClick={() => moveMonth(-1)}
                className="p-1.5 rounded-full hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-extrabold text-slate-900 dark:text-white px-2 min-w-[110px] text-center">
                {monthLabel}
              </span>
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
                      layout === o.v
                        ? "bg-[#0f4a29] text-white"
                        : "text-slate-500 dark:text-slate-300"
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
            <button
              onClick={onClose}
              className="p-2 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
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
                <p className="font-extrabold text-lg">
                  {p.fullName} — Attendance, {monthLabel}
                </p>
                <p className="text-xs text-slate-500">
                  {[p.subtitle, p.department].filter(Boolean).join(" · ")}
                </p>
              </div>

              {/* Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-9 gap-3">
                <MiniStat
                  label="Expected"
                  value={fmtHM(s.expectedMinutes)}
                  sub={`${s.workingDays - s.weekOffDays} working days`}
                />
                <MiniStat label="Worked" value={fmtHM(s.workedMinutes)} />
                <MiniStat
                  label={s.differenceMinutes >= 0 ? "Extra" : "Short"}
                  value={<DiffText mins={s.differenceMinutes} />}
                />
                <MiniStat
                  label="Present"
                  value={s.presentDays}
                  tone="text-emerald-600 dark:text-emerald-400"
                />
                <MiniStat
                  label="Half Day"
                  value={s.halfDays}
                  tone="text-amber-600 dark:text-amber-400"
                />
                <MiniStat
                  label="Week Off"
                  value={`${s.weekOffDays} / ${s.weekOffsPerMonth}`}
                  tone="text-sky-600 dark:text-sky-400"
                  sub={`${s.weekOffsLeft} left this month`}
                />
                <MiniStat
                  label="Leave"
                  value={s.leaveDays}
                  tone="text-rose-500"
                  sub="beyond week-offs"
                />
                <MiniStat
                  label="OT Days"
                  value={s.otDays}
                  tone="text-violet-600 dark:text-violet-400"
                  sub={`${fmtHM(s.overtimeMinutes)} extra in total`}
                />
                <MiniStat
                  label="Attendance"
                  value={
                    s.attendancePercent === null
                      ? "—"
                      : `${s.attendancePercent}%`
                  }
                  sub={
                    s.missingPunchOuts
                      ? `${s.missingPunchOuts} no punch-out`
                      : undefined
                  }
                />
              </div>

              <HoursBalance s={s} />

              {layout === "calendar" ? (
                <div className="bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800 rounded-2xl p-3">
                  <div className="grid grid-cols-7 gap-1.5">
                    {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(
                      (h) => (
                        <div
                          key={h}
                          className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 text-center pb-1"
                        >
                          {h}
                        </div>
                      ),
                    )}
                    {Array.from({ length: lead }).map((_, i) => (
                      <div key={`blank-${i}`} />
                    ))}
                    {data.days.map((d) => {
                      const meta =
                        ATT_STATUS_META[d.status] || ATT_STATUS_META.ABSENT;
                      const isToday = d.date === todayKey;
                      return (
                        <div
                          key={d.date}
                          title={[
                            fmtDayKey(d.date, {
                              weekday: "long",
                              day: "2-digit",
                              month: "short",
                            }),
                            d.status === "WEEK_OFF" && d.weekOffNumber
                              ? `Week Off ${d.weekOffNumber} of ${d.weekOffAllowance}`
                              : meta.label,
                            d.firstPunch
                              ? `In ${fmtPunch(d.firstPunch)}`
                              : null,
                            d.lastPunch
                              ? `Out ${fmtPunch(d.lastPunch)}`
                              : d.firstPunch
                                ? "No punch-out"
                                : null,
                            d.workingMinutes
                              ? `Worked ${fmtHM(d.workingMinutes)} of ${fmtHM(d.expectedMinutes)}`
                              : null,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                          className={`rounded-xl border p-1.5 sm:p-2 min-h-[70px] ${meta.cell} ${isToday ? "ring-2 ring-[#0f4a29]" : ""}`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-extrabold text-slate-700 dark:text-slate-200">
                              {Number(d.date.slice(8))}
                            </span>
                            {meta.short && (
                              <span
                                className={`text-[9px] font-extrabold px-1.5 rounded-full border ${meta.cls}`}
                              >
                                {meta.short}
                              </span>
                            )}
                          </div>
                          {d.firstPunch ? (
                            <div className="mt-1 space-y-0.5">
                              <div className="text-[9px] sm:text-[10px] font-bold text-slate-600 dark:text-slate-300 leading-tight">
                                {fmtPunch(d.firstPunch)}
                              </div>
                              <div
                                className={`text-[9px] sm:text-[10px] font-bold leading-tight ${
                                  d.lastPunch
                                    ? "text-slate-600 dark:text-slate-300"
                                    : "text-orange-500"
                                }`}
                              >
                                {d.lastPunch
                                  ? fmtPunch(d.lastPunch)
                                  : isToday
                                    ? "working…"
                                    : "no out"}
                              </div>
                              {d.workingMinutes > 0 && (
                                <div className="text-[10px] font-extrabold text-slate-900 dark:text-white">
                                  {fmtHM(d.workingMinutes)}
                                </div>
                              )}
                              {d.otDays > 0 && (
                                <div className="text-[9px] font-extrabold text-violet-600 dark:text-violet-400">
                                  {d.otDays === 1 ? "Full OT" : "½ OT"}
                                </div>
                              )}
                            </div>
                          ) : (
                            d.status === "WEEK_OFF" &&
                            d.weekOffNumber && (
                              <div className="text-[9px] font-bold text-sky-600 dark:text-sky-400 mt-1 leading-tight">
                                {d.weekOffNumber} of {d.weekOffAllowance}
                              </div>
                            )
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              <div
                className={layout === "calendar" ? "hidden print:block" : ""}
              >
                <TableCard>
                  <thead>
                    <tr>
                      {[
                        "Date",
                        "Shift",
                        "In",
                        "Out",
                        "All Punches",
                        "Worked",
                        "Expected",
                        "Diff",
                        "Late",
                        "Early",
                        "Extra",
                        "Status",
                      ].map((h) => (
                        <Th key={h}>{h}</Th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.days.map((d) => {
                      const off =
                        d.dayType !== "WORKING" || d.status === "WEEK_OFF";
                      return (
                        <tr
                          key={d.date}
                          className={`border-t border-slate-100 dark:border-slate-800/60 ${off ? "bg-slate-50/60 dark:bg-slate-950/30" : ""}`}
                        >
                          <Td className="font-bold whitespace-nowrap">
                            {fmtDayKey(d.date)}
                          </Td>
                          <Td>
                            {off && !d.firstPunch ? (
                              <span className="text-slate-300">—</span>
                            ) : (
                              <ShiftCell shift={d.shift} />
                            )}
                          </Td>
                          <Td className="whitespace-nowrap font-bold">
                            {fmtPunch(d.firstPunch)}
                          </Td>
                          <Td className="whitespace-nowrap font-bold">
                            {d.lastPunch ? fmtPunch(d.lastPunch) : "—"}
                          </Td>
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
                          <Td className="font-extrabold">
                            {d.workingMinutes ? fmtHM(d.workingMinutes) : "—"}
                          </Td>
                          <Td className="text-slate-500">
                            {d.expectedMinutes ? fmtHM(d.expectedMinutes) : "—"}
                          </Td>
                          <Td>
                            {d.expectedMinutes || d.workingMinutes ? (
                              <DiffText
                                mins={
                                  (d.workingMinutes || 0) -
                                  (d.expectedMinutes || 0)
                                }
                              />
                            ) : (
                              "—"
                            )}
                          </Td>
                          <Td
                            className={
                              d.lateMinutes ? "text-rose-500 font-bold" : ""
                            }
                          >
                            {d.lateMinutes ? fmtHM(d.lateMinutes) : "—"}
                          </Td>
                          <Td>
                            {d.earlyExitMinutes
                              ? fmtHM(d.earlyExitMinutes)
                              : "—"}
                          </Td>
                          <Td>
                            {d.overtimeMinutes ? (
                              <span className="whitespace-nowrap">
                                {fmtHM(d.overtimeMinutes)}
                                {!d.otDays && (
                                  <span className="text-[10px] text-slate-400">
                                    {" "}
                                    (not OT)
                                  </span>
                                )}
                              </span>
                            ) : (
                              "—"
                            )}
                          </Td>
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
                {["PRESENT", "HALF_DAY", "WEEK_OFF", "LEAVE"].map((k) => (
                  <span
                    key={k}
                    className={`px-2 py-0.5 rounded-full border ${ATT_STATUS_META[k].cls}`}
                  >
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

// Monthly hours picture: expected vs worked, OT, and how the small extra
// hours (not enough for OT) cover late login / short days.
function HoursBalance({ s }) {
  if (!s) return null;
  const Row = ({ label, value, tone, strong }) => (
    <div className="flex justify-between gap-3 py-1">
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      <span
        className={`${strong ? "font-extrabold" : "font-bold"} ${tone || "text-slate-900 dark:text-white"}`}
      >
        {value}
      </span>
    </div>
  );
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3">
        <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-1">
          Working hours this period
        </p>
        <Row label="Expected (as per shift)" value={fmtHM(s.expectedMinutes)} />
        <Row label="Employee worked" value={fmtHM(s.workedMinutes)} />
        <Row
          label="Difference"
          value={<DiffText mins={s.differenceMinutes} />}
          strong
        />
      </div>
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3">
        <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-1">
          Overtime &amp; extra hours
        </p>
        <Row
          label="OT days (half = 0.5)"
          value={s.otDays}
          tone="text-violet-600 dark:text-violet-400"
        />
        <Row
          label="Extra hours (below OT)"
          value={`+${fmtHM(s.extraMinutes)}`}
        />
        <Row
          label="Short hours (late login / early out)"
          value={`−${fmtHM(s.shortMinutes)}`}
          tone="text-rose-500"
        />
        <Row
          label={
            s.balanceMinutes >= 0
              ? "Balance after covering short hours"
              : "Still short after extra hours"
          }
          value={<DiffText mins={s.balanceMinutes} />}
          strong
        />
      </div>
    </div>
  );
}

function MiniStat({ label, value, sub, tone }) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3">
      <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
        {label}
      </p>
      <p
        className={`text-lg font-extrabold mt-0.5 ${tone || "text-slate-900 dark:text-white"}`}
      >
        {value}
      </p>
      {sub && <p className="text-[10px] font-medium text-slate-400">{sub}</p>}
    </div>
  );
}

// ============================================================================
// Week-off Rules tab
//
// No fixed Sunday off / holidays: each person gets N week-offs per month.
// Groups are matched against the employee's designation or department (or a
// staff login's role). Case, spaces and punctuation don't matter, so the
// keyword "Ward Boy" matches "WARD BOY", "Ward boy" and "Wardboy".
// ============================================================================

const normalizeMatch = (v) =>
  String(v ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const splitKeywords = (text) =>
  String(text || "")
    .split(",")
    .map((k) => k.trim())
    .filter((k) => normalizeMatch(k));

function ruleForPerson(form, person) {
  const hay = [person.designation, person.department, person.role]
    .map(normalizeMatch)
    .filter(Boolean);
  for (const g of form.groups) {
    const hit = splitKeywords(g.keywordsText).some((k) => {
      const key = normalizeMatch(k);
      return hay.some((h) => h.includes(key));
    });
    if (hit)
      return {
        id: g.id,
        name: g.name || "Unnamed group",
        perMonth: Number(g.weekOffs) || 0,
      };
  }
  return {
    id: null,
    name: "Everyone else",
    perMonth: Number(form.defaultWeekOffs) || 0,
  };
}

const toForm = (policy) => ({
  defaultWeekOffs: policy?.defaultWeekOffs ?? 4,
  groups: (policy?.groups || []).map((g) => ({
    id: g.id,
    name: g.name,
    keywordsText: (g.keywords || []).join(", "),
    weekOffs: g.weekOffs,
  })),
});

function NumberStepper({ value, onChange, min = 0, max = 15 }) {
  const n = Number(value) || 0;
  const set = (v) => onChange(Math.min(max, Math.max(min, v)));
  return (
    <div className="inline-flex items-center rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
      <button
        type="button"
        onClick={() => set(n - 1)}
        disabled={n <= min}
        className="w-8 h-8 text-sm font-extrabold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-30"
        aria-label="Decrease"
      >
        −
      </button>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) =>
          onChange(e.target.value === "" ? "" : Number(e.target.value))
        }
        onBlur={() => set(n)}
        className="w-10 h-8 text-center text-sm font-extrabold text-slate-900 dark:text-white bg-transparent focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
      />
      <button
        type="button"
        onClick={() => set(n + 1)}
        disabled={n >= max}
        className="w-8 h-8 text-sm font-extrabold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-30"
        aria-label="Increase"
      >
        +
      </button>
    </div>
  );
}

function WeekOffSettingsTab() {
  const [form, setForm] = useState(null);
  const [saved, setSaved] = useState(null);
  const [people, setPeople] = useState([]);
  const [meta, setMeta] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [search, setSearch] = useState("");
  const [ruleFilter, setRuleFilter] = useState("ALL");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/biometric/settings/week-offs");
      const f = toForm(res.policy);
      setForm(f);
      setSaved(JSON.stringify(f));
      setPeople(res.people || []);
      setMeta({
        needsMigration: res.policy?.needsMigration,
        isDefault: res.policy?.isDefault,
        updatedAt: res.policy?.updatedAt,
      });
    } catch (err) {
      setError(err.message || "Could not load week-off settings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const dirty = form && saved !== JSON.stringify(form);

  const withRules = useMemo(
    () =>
      form ? people.map((p) => ({ ...p, rule: ruleForPerson(form, p) })) : [],
    [form, people],
  );

  const counts = useMemo(() => {
    const c = new Map();
    for (const p of withRules) {
      const k = p.rule.id || "__default";
      c.set(k, (c.get(k) || 0) + 1);
    }
    return c;
  }, [withRules]);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return withRules.filter((p) => {
      if (ruleFilter !== "ALL" && (p.rule.id || "__default") !== ruleFilter)
        return false;
      if (
        q &&
        !`${p.fullName} ${p.designation} ${p.department} ${p.role}`
          .toLowerCase()
          .includes(q)
      )
        return false;
      return true;
    });
  }, [withRules, search, ruleFilter]);

  const updateGroup = (id, patch) =>
    setForm((f) => ({
      ...f,
      groups: f.groups.map((g) => (g.id === id ? { ...g, ...patch } : g)),
    }));

  const addGroup = () =>
    setForm((f) => ({
      ...f,
      groups: [
        ...f.groups,
        {
          id: `group-${Date.now()}`,
          name: "",
          keywordsText: "",
          weekOffs: 2,
        },
      ],
    }));

  const removeGroup = (id) =>
    setForm((f) => ({ ...f, groups: f.groups.filter((g) => g.id !== id) }));

  const save = async () => {
    setError("");
    setInfo("");
    const bad = form.groups.find((g) => !splitKeywords(g.keywordsText).length);
    if (bad) {
      setError(
        `Add at least one designation keyword for "${bad.name || "the new group"}", or remove that group.`,
      );
      return;
    }
    setSaving(true);
    try {
      const res = await api.put("/biometric/settings/week-offs", {
        defaultWeekOffs: Number(form.defaultWeekOffs) || 0,
        groups: form.groups.map((g) => ({
          id: g.id,
          name: g.name,
          keywords: splitKeywords(g.keywordsText),
          weekOffs: Number(g.weekOffs) || 0,
        })),
      });
      const f = toForm(res.policy);
      setForm(f);
      setSaved(JSON.stringify(f));
      setMeta({
        needsMigration: false,
        isDefault: false,
        updatedAt: res.policy?.updatedAt,
      });
      setInfo(
        "Saved. Attendance reports now use these week-off limits (past months too).",
      );
    } catch (err) {
      setError(err.message || "Could not save week-off settings.");
    } finally {
      setSaving(false);
    }
  };

  if (loading && !form) return <Loading label="Loading week-off rules..." />;
  if (!form) return <Banner error={error} />;

  return (
    <div className="space-y-4">
      <Banner error={error} info={info} />

      {meta.needsMigration && (
        <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-2xl px-4 py-3 text-amber-700 dark:text-amber-400 text-xs font-bold">
          Using the built-in defaults (ward boy &amp; housekeeping 2, others 4).
          To save changes, run{" "}
          <code className="font-mono">
            npx prisma migrate dev --name attendance_policy
          </code>{" "}
          on the server once.
        </div>
      )}

      <SectionCard title="How week-offs work" icon={Info}>
        <ul className="text-xs text-slate-600 dark:text-slate-300 font-medium space-y-1.5 list-disc pl-4">
          <li>
            The hospital works every day —{" "}
            <b>no Saturday/Sunday off and no holidays</b>.
          </li>
          <li>
            Each person gets a fixed number of <b>week-offs per month</b>. The
            first days in a month without a punch are shown as <b>Week Off</b>.
          </li>
          <li>
            Only the days beyond that limit are shown as <b>Leave</b>.
          </li>
          <li>
            Keywords are matched against the designation / department (or role
            for staff logins). Spelling style doesn't matter — "Ward Boy", "WARD
            BOY" and "wardboy" are the same.
          </li>
        </ul>
      </SectionCard>

      <SectionCard title="Week-offs per month" icon={CalendarOff}>
        <div className="space-y-3">
          {form.groups.map((g) => (
            <div
              key={g.id}
              className="grid grid-cols-1 md:grid-cols-[1fr_1.6fr_auto_auto] gap-3 items-end bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 rounded-2xl p-3"
            >
              <Field
                label="Group name"
                value={g.name}
                onChange={(v) => updateGroup(g.id, { name: v })}
                placeholder="Ward Boy & Housekeeping"
              />
              <div>
                <Field
                  label="Designation keywords (comma separated)"
                  value={g.keywordsText}
                  onChange={(v) => updateGroup(g.id, { keywordsText: v })}
                  placeholder="Ward Boy, Housekeeping"
                />
              </div>
              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
                  Week-offs / month
                </label>
                <NumberStepper
                  value={g.weekOffs}
                  onChange={(v) => updateGroup(g.id, { weekOffs: v })}
                />
              </div>
              <div className="flex items-center gap-2 md:pb-1">
                <span className="text-[11px] font-bold text-slate-500 whitespace-nowrap">
                  {counts.get(g.id) || 0} people
                </span>
                <IconBtn title="Remove group" onClick={() => removeGroup(g.id)}>
                  <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                </IconBtn>
              </div>
            </div>
          ))}

          <div className="grid grid-cols-1 md:grid-cols-[1fr_1.6fr_auto_auto] gap-3 items-end border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-3">
            <div>
              <p className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
                Group
              </p>
              <p className="text-xs font-extrabold text-slate-900 dark:text-white py-2">
                Everyone else
              </p>
            </div>
            <p className="text-[11px] text-slate-400 font-medium pb-2">
              Nurses, doctors, front desk, physiotherapy and everyone not in a
              group above.
            </p>
            <div>
              <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-1">
                Week-offs / month
              </label>
              <NumberStepper
                value={form.defaultWeekOffs}
                onChange={(v) => setForm((f) => ({ ...f, defaultWeekOffs: v }))}
              />
            </div>
            <span className="text-[11px] font-bold text-slate-500 whitespace-nowrap md:pb-2">
              {counts.get("__default") || 0} people
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <button
              type="button"
              onClick={addGroup}
              className="flex items-center gap-1.5 text-xs font-extrabold text-[#0f4a29] dark:text-[#52b788] hover:underline"
            >
              <Plus className="w-3.5 h-3.5" /> Add another group
            </button>
            <div className="flex items-center gap-2">
              {dirty && (
                <button
                  type="button"
                  onClick={() => setForm(JSON.parse(saved))}
                  className="text-xs font-bold text-slate-500 px-3 py-2"
                >
                  Undo changes
                </button>
              )}
              <button
                type="button"
                onClick={save}
                disabled={saving || !dirty}
                className="flex items-center gap-1.5 bg-[#0f4a29] hover:bg-[#165a34] text-white text-xs font-extrabold px-5 py-2.5 rounded-full shadow-xs disabled:opacity-40"
              >
                {saving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                {saving ? "Saving..." : "Save rules"}
              </button>
            </div>
          </div>
          {meta.updatedAt && !dirty && (
            <p className="text-[10px] text-slate-400 font-medium text-right">
              Last saved{" "}
              {new Date(meta.updatedAt).toLocaleString("en-IN", {
                timeZone: IST_TZ,
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </p>
          )}
        </div>
      </SectionCard>

      <SectionCard title="Who gets how many week-offs" icon={Users2}>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mb-3">
          Live preview of the rules above — check every ward boy and
          housekeeping person lands in the right group before saving.
        </p>
        <div className="flex flex-wrap gap-2 mb-3">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search name or designation..."
          />
          <select
            value={ruleFilter}
            onChange={(e) => setRuleFilter(e.target.value)}
            className={selectCls}
          >
            <option value="ALL">All groups ({withRules.length})</option>
            {form.groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name || "Unnamed group"} ({counts.get(g.id) || 0})
              </option>
            ))}
            <option value="__default">
              Everyone else ({counts.get("__default") || 0})
            </option>
          </select>
        </div>
        <TableCard>
          <thead>
            <tr>
              {[
                "Name",
                "Designation / Role",
                "Department",
                "Group",
                "Week-offs / month",
              ].map((h) => (
                <Th key={h}>{h}</Th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((p) => (
              <tr
                key={p.key}
                className="border-t border-slate-100 dark:border-slate-800/60"
              >
                <Td className="font-extrabold text-slate-900 dark:text-white">
                  <div>{p.fullName}</div>
                  <TypeChip personType={p.personType} />
                </Td>
                <Td>{p.designation || p.role || "—"}</Td>
                <Td>{p.department || "—"}</Td>
                <Td>
                  <span
                    className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border whitespace-nowrap ${
                      p.rule.id
                        ? "bg-sky-50 dark:bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-500/20"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    {p.rule.name}
                  </span>
                </Td>
                <Td className="font-extrabold">{p.rule.perMonth}</Td>
              </tr>
            ))}
            {shown.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-5 py-8 text-center text-xs text-slate-400 font-medium"
                >
                  No one matches.
                </td>
              </tr>
            )}
          </tbody>
        </TableCard>
      </SectionCard>
    </div>
  );
}
