// client/src/pages/admin/biometric/BiometricManagement.jsx
// Single page, internally tabbed — Dashboard / Devices / User Mapping /
// Employee Mapping / Attendance Logs / Attendance Report. Mirrors the visual
// language of AdminStaffAccounts.jsx and AdminEmployeeDirectory.jsx (same
// api lib, same Tailwind palette/rounded-2xl cards/table patterns), no new
// design system introduced.
//
// NOTE: this assumes `api` exposes a `.patch()` method (used for the
// device-toggle and mapping-deactivate endpoints), the same way it exposes
// .get/.post/.put elsewhere in this codebase. If your lib/api.js doesn't
// have one yet, it's a small addition mirroring the existing put/post
// implementations.
import { useState, useEffect, useCallback, Fragment } from "react";
import { api } from "../../../lib/api";
import {
  Fingerprint, LayoutDashboard, MonitorSmartphone, Link2, Users2, ScrollText,
  FileBarChart, Plus, Loader2, Pencil, Power, X, Check, Search, UserPlus,
} from "lucide-react";

const TABS = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "devices", label: "Devices", icon: MonitorSmartphone },
  { key: "userMapping", label: "User Mapping", icon: Link2 },
  { key: "employeeMapping", label: "Employee Mapping", icon: Users2 },
  { key: "logs", label: "Attendance Logs", icon: ScrollText },
  { key: "report", label: "Attendance Report", icon: FileBarChart },
];

export default function BiometricManagement() {
  const [tab, setTab] = useState("dashboard");

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Fingerprint className="w-5 h-5 text-teal-500" />
        <h2 className="text-lg font-bold text-slate-800 dark:text-white">Biometric Attendance</h2>
      </div>

      <div className="flex gap-1.5 flex-wrap border-b border-slate-200 dark:border-slate-800 pb-2">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors ${
                active
                  ? "bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-400 border border-teal-200/80 dark:border-teal-500/20"
                  : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 border border-transparent"
              }`}
            >
              <Icon className="w-4 h-4" /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === "dashboard" && <DashboardTab />}
      {tab === "devices" && <DevicesTab />}
      {tab === "userMapping" && <MappingTab kind="user" />}
      {tab === "employeeMapping" && <MappingTab kind="employee" />}
      {tab === "logs" && <LogsTab />}
      {tab === "report" && <ReportTab />}
    </div>
  );
}

// ============================================================================
// Shared bits
// ============================================================================

function Banner({ error, info }) {
  return (
    <>
      {error && (
        <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-xl px-4 py-3 text-rose-600 dark:text-rose-400 text-sm font-medium">
          {error}
        </div>
      )}
      {info && !error && (
        <div className="bg-teal-50 dark:bg-teal-950/20 border border-teal-100 dark:border-teal-900/30 rounded-xl px-4 py-3 text-teal-700 dark:text-teal-400 text-sm font-medium">
          {info}
        </div>
      )}
    </>
  );
}

function Loading({ label }) {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="flex items-center gap-3 text-slate-400 dark:text-slate-500 text-sm font-medium">
        <Loader2 className="w-5 h-5 animate-spin" /> {label}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", placeholder }) {
  return (
    <div>
      <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-teal-500"
      />
    </div>
  );
}

function IconBtn({ children, onClick, title }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
    >
      {children}
    </button>
  );
}

function Card({ label, value, sub }) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">{label}</p>
      <p className="text-2xl font-bold text-slate-800 dark:text-white mt-1">{value}</p>
      {sub && <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{sub}</p>}
    </div>
  );
}

function minutesToHrs(mins) {
  if (!mins) return "0h 0m";
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Card label="Devices" value={`${data.activeDevices}/${data.totalDevices}`} sub="active / total" />
          <Card label="Mapped Users" value={data.mappedUsers} />
          <Card label="Mapped Employees" value={data.mappedEmployees} />
          <Card label="Today's Punches" value={data.todaysPunches} />
          <Card label="Present Today" value={data.presentToday} />
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
      const { devices: data } = await api.get(`/biometric/devices${search ? `?search=${encodeURIComponent(search)}` : ""}`);
      setDevices(data);
    } catch (err) {
      setError(err.message || "Could not load devices.");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { fetchDevices(); }, [fetchDevices]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError(""); setInfo("");
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
    setEditForm({ name: d.name, deviceCode: d.deviceCode, serialNumber: d.serialNumber, location: d.location || "" });
  };

  const saveEdit = async (id) => {
    setError(""); setInfo("");
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
    setError(""); setInfo("");
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
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search devices..."
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-teal-500"
          />
        </div>
        <button
          onClick={() => setShowCreate((s) => !s)}
          className="flex items-center gap-2 bg-gradient-to-r from-teal-500 to-cyan-400 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:scale-[1.02] transition-transform shadow-lg shadow-teal-500/20"
        >
          <Plus className="w-4 h-4" /> Add Device
        </button>
      </div>

      <Banner error={error} info={info} />

      {showCreate && (
        <form onSubmit={handleCreate} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Device Name" value={createForm.name} onChange={(v) => setCreateForm(f => ({ ...f, name: v }))} placeholder="Main Gate ZKTeco" />
            <Field label="Device Code" value={createForm.deviceCode} onChange={(v) => setCreateForm(f => ({ ...f, deviceCode: v }))} placeholder="DEV-001" />
            <Field label="Serial Number" value={createForm.serialNumber} onChange={(v) => setCreateForm(f => ({ ...f, serialNumber: v }))} placeholder="ZK123456789" />
            <Field label="Location" value={createForm.location} onChange={(v) => setCreateForm(f => ({ ...f, location: v }))} placeholder="Main Entrance" />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-950 text-sm font-semibold px-4 py-2.5 rounded-xl disabled:opacity-50">
              {saving ? "Creating..." : "Create Device"}
            </button>
            <button type="button" onClick={() => setShowCreate(false)} className="text-sm text-slate-500 dark:text-slate-400 px-4 py-2.5">Cancel</button>
          </div>
        </form>
      )}

      {loading ? (
        <Loading label="Loading devices..." />
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[720px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/50">
                  {["Name", "Device Code", "Serial No.", "Location", "Status", "Actions"].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {devices.map((d) => (
                  <tr key={d.id} className="border-t border-slate-100 dark:border-slate-800/50">
                    {editingId === d.id ? (
                      <td colSpan={6} className="px-5 py-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                          <Field label="Name" value={editForm.name} onChange={(v) => setEditForm(f => ({ ...f, name: v }))} />
                          <Field label="Device Code" value={editForm.deviceCode} onChange={(v) => setEditForm(f => ({ ...f, deviceCode: v }))} />
                          <Field label="Serial Number" value={editForm.serialNumber} onChange={(v) => setEditForm(f => ({ ...f, serialNumber: v }))} />
                          <Field label="Location" value={editForm.location} onChange={(v) => setEditForm(f => ({ ...f, location: v }))} />
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => saveEdit(d.id)} disabled={saving} className="flex items-center gap-1.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-950 text-xs font-semibold px-3 py-2 rounded-lg disabled:opacity-50">
                            <Check className="w-3.5 h-3.5" /> Save
                          </button>
                          <button onClick={() => setEditingId(null)} className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 px-3 py-2">
                            <X className="w-3.5 h-3.5" /> Cancel
                          </button>
                        </div>
                      </td>
                    ) : (
                      <>
                        <td className="px-5 py-3.5 font-medium text-slate-800 dark:text-white">{d.name}</td>
                        <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400">{d.deviceCode}</td>
                        <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400">{d.serialNumber}</td>
                        <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400">{d.location || "—"}</td>
                        <td className="px-5 py-3.5">
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                            d.isActive
                              ? "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                          }`}>
                            {d.isActive ? "Active" : "Disabled"}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex gap-1">
                            <IconBtn title="Edit" onClick={() => startEdit(d)}><Pencil className="w-3.5 h-3.5" /></IconBtn>
                            <IconBtn title={d.isActive ? "Disable" : "Enable"} onClick={() => toggleActive(d)}><Power className="w-3.5 h-3.5" /></IconBtn>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
                {devices.length === 0 && (
                  <tr><td colSpan={6} className="px-5 py-8 text-center text-sm text-slate-400 dark:text-slate-500">No devices yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// User Mapping / Employee Mapping tab (shared component, kind="user"|"employee")
// ============================================================================

function MappingTab({ kind }) {
  const isUser = kind === "user";
  const [mappings, setMappings] = useState([]);
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const [personSearch, setPersonSearch] = useState("");
  const [personResults, setPersonResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const [showAssign, setShowAssign] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [assignForm, setAssignForm] = useState({ biometricId: "", deviceId: "" });
  const [saving, setSaving] = useState(false);

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

  useEffect(() => { fetchMappings(); }, [fetchMappings]);

  useEffect(() => {
    (async () => {
      try {
        const { devices: data } = await api.get("/biometric/devices");
        setDevices(data.filter((d) => d.isActive));
      } catch {
        // devices list is a convenience for the assign form only; a failure
        // here shouldn't block viewing existing mappings.
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
    setAssignForm({ biometricId: "", deviceId: devices[0]?.id || "" });
    setShowAssign(true);
  };

  const submitAssign = async (e) => {
    e.preventDefault();
    setError(""); setInfo("");
    if (!assignForm.biometricId || !assignForm.deviceId) {
      return setError("Biometric ID and device are both required.");
    }
    setSaving(true);
    try {
      await api.post("/biometric/mappings", {
        biometricId: assignForm.biometricId,
        deviceId: assignForm.deviceId,
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

  const deactivate = async (m) => {
    setError(""); setInfo("");
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

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Search {isUser ? "Users" : "Employees"} to Map
        </p>
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={personSearch}
              onChange={(e) => setPersonSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runSearch()}
              placeholder={`Search by name, ${isUser ? "email/phone" : "designation/phone"}...`}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-teal-500"
            />
          </div>
          <button onClick={runSearch} disabled={searching} className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-950 text-sm font-semibold px-4 py-2 rounded-xl disabled:opacity-50">
            {searching ? "Searching..." : "Search"}
          </button>
        </div>

        {personResults.length > 0 && (
          <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden">
            {personResults.map((p) => (
              <div key={p.id} className="flex items-center justify-between px-4 py-2.5">
                <div>
                  <p className="text-sm font-medium text-slate-800 dark:text-white">{p.fullName}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">{isUser ? `${p.role} · ${p.email}` : p.designation}</p>
                </div>
                <button onClick={() => openAssign(p)} className="flex items-center gap-1.5 text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline">
                  <UserPlus className="w-3.5 h-3.5" /> Assign biometric ID
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {showAssign && selectedPerson && (
        <form onSubmit={submitAssign} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
          <p className="text-sm font-semibold text-slate-800 dark:text-white">
            Assigning biometric ID for <span className="text-teal-600 dark:text-teal-400">{selectedPerson.fullName}</span>
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Biometric ID" value={assignForm.biometricId} onChange={(v) => setAssignForm(f => ({ ...f, biometricId: v }))} placeholder="Enrollment / card number" />
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">Device</label>
              <select
                value={assignForm.deviceId}
                onChange={(e) => setAssignForm(f => ({ ...f, deviceId: e.target.value }))}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-teal-500"
              >
                <option value="">Select device</option>
                {devices.map((d) => <option key={d.id} value={d.id}>{d.name} ({d.deviceCode})</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-950 text-sm font-semibold px-4 py-2.5 rounded-xl disabled:opacity-50">
              {saving ? "Assigning..." : "Assign"}
            </button>
            <button type="button" onClick={() => { setShowAssign(false); setSelectedPerson(null); }} className="text-sm text-slate-500 dark:text-slate-400 px-4 py-2.5">Cancel</button>
          </div>
        </form>
      )}

      {loading ? (
        <Loading label="Loading mappings..." />
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/50">
                  {["Name", "Biometric ID", "Device", "Status", "Actions"].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {mappings.map((m) => (
                  <tr key={m.id} className="border-t border-slate-100 dark:border-slate-800/50">
                    <td className="px-5 py-3.5 font-medium text-slate-800 dark:text-white">
                      {isUser ? m.user?.fullName : m.employee?.fullName}
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400">{m.biometricId}</td>
                    <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400">{m.device?.name || "—"}</td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                        m.isActive
                          ? "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                      }`}>
                        {m.isActive ? "Active" : "Deactivated"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      {m.isActive && (
                        <IconBtn title="Deactivate" onClick={() => deactivate(m)}><Power className="w-3.5 h-3.5" /></IconBtn>
                      )}
                    </td>
                  </tr>
                ))}
                {mappings.length === 0 && (
                  <tr><td colSpan={5} className="px-5 py-8 text-center text-sm text-slate-400 dark:text-slate-500">No mappings yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Attendance Logs tab
// ============================================================================

function LogsTab() {
  const [logs, setLogs] = useState([]);
  const [devices, setDevices] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState(null);

  const [filters, setFilters] = useState({ date: "", deviceId: "", mapped: "" });

  useEffect(() => {
    (async () => {
      try {
        const { devices: data } = await api.get("/biometric/devices");
        setDevices(data);
      } catch {
        // non-critical for viewing logs
      }
    })();
  }, []);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(page), limit: "25" });
      if (filters.date) params.set("date", filters.date);
      if (filters.deviceId) params.set("deviceId", filters.deviceId);
      if (filters.mapped) params.set("mapped", filters.mapped);
      const data = await api.get(`/biometric/logs?${params.toString()}`);
      setLogs(data.logs);
      setTotal(data.total);
    } catch (err) {
      setError(err.message || "Could not load punch logs.");
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const totalPages = Math.max(1, Math.ceil(total / 25));

  return (
    <div className="space-y-4">
      <Banner error={error} />

      <div className="flex gap-2 flex-wrap bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
        <input
          type="date"
          value={filters.date}
          onChange={(e) => { setPage(1); setFilters(f => ({ ...f, date: e.target.value })); }}
          className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-teal-500"
        />
        <select
          value={filters.deviceId}
          onChange={(e) => { setPage(1); setFilters(f => ({ ...f, deviceId: e.target.value })); }}
          className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-teal-500"
        >
          <option value="">All devices</option>
          {devices.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <select
          value={filters.mapped}
          onChange={(e) => { setPage(1); setFilters(f => ({ ...f, mapped: e.target.value })); }}
          className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-teal-500"
        >
          <option value="">Mapped + Unmapped</option>
          <option value="true">Mapped only</option>
          <option value="false">Unmapped only</option>
        </select>
      </div>

      {loading ? (
        <Loading label="Loading punch logs..." />
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[720px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/50">
                  {["Time", "Enrollment ID", "Device", "Mode", "Mapped", ""].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <Fragment key={l.id}>
                    <tr className="border-t border-slate-100 dark:border-slate-800/50">
                      <td className="px-5 py-3.5 text-slate-800 dark:text-white">{new Date(l.punchTime).toLocaleString()}</td>
                      <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400">{l.enrollmentId}</td>
                      <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400">{l.device?.name || l.deviceSerial}</td>
                      <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400">{l.punchMode}</td>
                      <td className="px-5 py-3.5">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                          l.isProcessed
                            ? "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20"
                            : "bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20"
                        }`}>
                          {l.isProcessed ? "Mapped" : "Unmapped"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <button
                          onClick={() => setExpandedId(expandedId === l.id ? null : l.id)}
                          className="text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline"
                        >
                          {expandedId === l.id ? "Hide raw" : "View raw"}
                        </button>
                      </td>
                    </tr>
                    {expandedId === l.id && (
                      <tr className="border-t border-slate-100 dark:border-slate-800/50 bg-slate-50 dark:bg-slate-900/50">
                        <td colSpan={6} className="px-5 py-3">
                          <pre className="text-xs text-slate-500 dark:text-slate-400 whitespace-pre-wrap break-all">
                            {JSON.stringify(l.rawData, null, 2)}
                          </pre>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
                {logs.length === 0 && (
                  <tr><td colSpan={6} className="px-5 py-8 text-center text-sm text-slate-400 dark:text-slate-500">No punch logs for these filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 dark:border-slate-800/50 text-xs text-slate-500 dark:text-slate-400">
              <span>Page {page} of {totalPages}</span>
              <div className="flex gap-2">
                <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40">Prev</button>
                <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40">Next</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Attendance Report tab
// ============================================================================

function ReportTab() {
  const today = new Date().toISOString().slice(0, 10);
  const [range, setRange] = useState({ from: today, to: today });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (range.from) params.set("from", range.from);
      if (range.to) params.set("to", range.to);
      const result = await api.get(`/biometric/attendance/report?${params.toString()}`);
      setData(result);
    } catch (err) {
      setError(err.message || "Could not load attendance report.");
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  return (
    <div className="space-y-4">
      <Banner error={error} />

      <div className="flex gap-2 flex-wrap items-end bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">From</label>
          <input type="date" value={range.from} onChange={(e) => setRange(r => ({ ...r, from: e.target.value }))}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-teal-500" />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">To</label>
          <input type="date" value={range.to} onChange={(e) => setRange(r => ({ ...r, to: e.target.value }))}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-teal-500" />
        </div>
      </div>

      {loading ? (
        <Loading label="Loading report..." />
      ) : data ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card label="Present Days" value={data.summary.presentDays} />
            <Card label="Absent Days" value={data.summary.absentDays} />
            <Card label="Half Days" value={data.summary.halfDays} />
            <Card label="Total Overtime" value={minutesToHrs(data.summary.totalOvertimeMinutes)} />
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[760px]">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/50">
                    {["Date", "Person", "First Punch", "Last Punch", "Working Hrs", "Late", "Overtime", "Status"].map((h) => (
                      <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 dark:text-slate-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.records.map((r) => (
                    <tr key={r.id} className="border-t border-slate-100 dark:border-slate-800/50">
                      <td className="px-5 py-3.5 text-slate-800 dark:text-white">{new Date(r.date).toLocaleDateString()}</td>
                      <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400">{r.person?.fullName || "—"}</td>
                      <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400">{r.firstPunch ? new Date(r.firstPunch).toLocaleTimeString() : "—"}</td>
                      <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400">{r.lastPunch ? new Date(r.lastPunch).toLocaleTimeString() : "—"}</td>
                      <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400">{minutesToHrs(r.workingMinutes)}</td>
                      <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400">{r.lateMinutes} min</td>
                      <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400">{minutesToHrs(r.overtimeMinutes)}</td>
                      <td className="px-5 py-3.5">
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full border bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700">
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {data.records.length === 0 && (
                    <tr><td colSpan={8} className="px-5 py-8 text-center text-sm text-slate-400 dark:text-slate-500">No attendance records in this range.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
