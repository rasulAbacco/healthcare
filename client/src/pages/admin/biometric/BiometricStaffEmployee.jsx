// client/src/pages/admin/biometric/BiometricStaffEmployee.jsx
// Single page for all four flows: Add Staff, Edit Staff, Add Employee, Edit
// Employee — driven entirely by ?type=user|employee & ?mode=add|edit query
// params (plus ?id= for edit and ?personId= for a pre-selected person coming
// from the Quick Find search on BiometricManagement.jsx). No separate pages
// per the requirement — this is the only Add/Edit surface for mappings.
import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../../../lib/api";
import { Fingerprint, Search, Check, X, Loader2 } from "lucide-react";

function Field({ label, value, onChange, type = "text", placeholder, disabled }) {
  return (
    <div>
      <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-teal-500 disabled:opacity-60"
      />
    </div>
  );
}

export default function BiometricStaffEmployee() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const mode = searchParams.get("mode") === "edit" ? "edit" : "add";
  const mappingId = searchParams.get("id");
  const prefillPersonId = searchParams.get("personId");
  const isEdit = mode === "edit";

  // Type is locked once editing (can't repoint an existing mapping to a
  // different person type) but selectable while adding.
  const [type, setType] = useState(searchParams.get("type") === "employee" ? "employee" : "user");
  const isUser = type === "user";

  const [devices, setDevices] = useState([]);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [personSearch, setPersonSearch] = useState("");
  const [personResults, setPersonResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const [deviceId, setDeviceId] = useState("");
  const [biometricId, setBiometricId] = useState("");
  const [isActive, setIsActive] = useState(true);

  const [loading, setLoading] = useState(isEdit || Boolean(prefillPersonId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Devices — needed regardless of mode.
  useEffect(() => {
    (async () => {
      try {
        const { devices: data } = await api.get("/biometric/devices");
        setDevices(data);
      } catch (err) {
        setError(err.message || "Could not load devices.");
      }
    })();
  }, []);

  // Edit mode — preload the existing mapping.
  useEffect(() => {
    if (!isEdit || !mappingId) return;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const { mapping } = await api.get(`/biometric/mappings/${mappingId}`);
        setType(mapping.userId ? "user" : "employee");
        setSelectedPerson(mapping.userId ? mapping.user : mapping.employee);
        setDeviceId(mapping.deviceId);
        setBiometricId(mapping.biometricId);
        setIsActive(mapping.isActive);
      } catch (err) {
        setError(err.message || "Could not load this mapping.");
      } finally {
        setLoading(false);
      }
    })();
  }, [isEdit, mappingId]);

  // Add mode with a person already chosen via Quick Find on the previous page.
  useEffect(() => {
    if (isEdit || !prefillPersonId) return;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const endpoint = isUser ? "/biometric/users" : "/biometric/employees";
        const { users, employees } = await api.get(`${endpoint}?id=${encodeURIComponent(prefillPersonId)}`);
        const list = isUser ? users : employees;
        setSelectedPerson(list?.[0] || null);
      } catch (err) {
        setError(err.message || "Could not load the selected person.");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, prefillPersonId, isUser]);

  const runSearch = useCallback(async () => {
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
  }, [isUser, personSearch]);

  const backToList = () => {
    navigate(`/admin/biometric?tab=${isUser ? "userMapping" : "employeeMapping"}`);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError("");
    if (!selectedPerson) return setError(`Please select a ${isUser ? "staff member" : "employee"} to map.`);
    if (!deviceId) return setError("Please select a device.");
    if (!biometricId) return setError("Biometric ID is required.");

    setSaving(true);
    try {
      if (isEdit) {
        await api.put(`/biometric/mappings/${mappingId}`, { deviceId, biometricId, isActive });
      } else {
        await api.post("/biometric/mappings", {
          biometricId,
          deviceId,
          ...(isUser ? { userId: selectedPerson.id } : { employeeId: selectedPerson.id }),
        });
      }
      backToList();
    } catch (err) {
      setError(err.message || "Could not save this mapping.");
    } finally {
      setSaving(false);
    }
  };

  const title = `${isEdit ? "Edit" : "Add"} ${isUser ? "Staff" : "Employee"}`;

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center gap-2">
        <Fingerprint className="w-5 h-5 text-teal-500" />
        <h2 className="text-lg font-bold text-slate-800 dark:text-white">{title}</h2>
      </div>

      {error && (
        <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-xl px-4 py-3 text-rose-600 dark:text-rose-400 text-sm font-medium">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-3 text-slate-400 dark:text-slate-500 text-sm font-medium">
            <Loader2 className="w-5 h-5 animate-spin" /> Loading...
          </div>
        </div>
      ) : (
        <form onSubmit={handleSave} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-5">
          {/* Type */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">Type</label>
            <div className="flex gap-2">
              {["user", "employee"].map((t) => (
                <button
                  key={t}
                  type="button"
                  disabled={isEdit}
                  onClick={() => { setType(t); setSelectedPerson(null); setPersonResults([]); }}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
                    type === t
                      ? "bg-teal-50 dark:bg-teal-500/15 text-teal-700 dark:text-teal-400 border-teal-200 dark:border-teal-500/20"
                      : "text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                  }`}
                >
                  {t === "user" ? "Staff" : "Employee"}
                </button>
              ))}
            </div>
            {isEdit && (
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5">Type can't be changed once a mapping exists.</p>
            )}
          </div>

          {/* Select Staff / Employee */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
              Select {isUser ? "Staff" : "Employee"}
            </label>

            {selectedPerson ? (
              <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5">
                <div>
                  <p className="text-sm font-medium text-slate-800 dark:text-white">{selectedPerson.fullName}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    {isUser ? `${selectedPerson.role || ""} ${selectedPerson.email ? "· " + selectedPerson.email : ""}` : selectedPerson.designation}
                  </p>
                </div>
                {!isEdit && (
                  <button type="button" onClick={() => setSelectedPerson(null)} className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:underline">
                    Change
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex gap-2 flex-wrap">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      value={personSearch}
                      onChange={(e) => setPersonSearch(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), runSearch())}
                      placeholder={`Search by name, ${isUser ? "email/phone" : "designation/phone"}...`}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-teal-500"
                    />
                  </div>
                  <button type="button" onClick={runSearch} disabled={searching} className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-950 text-sm font-semibold px-4 py-2 rounded-xl disabled:opacity-50">
                    {searching ? "Searching..." : "Search"}
                  </button>
                </div>
                {personResults.length > 0 && (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                    {personResults.map((p) => (
                      <button
                        type="button"
                        key={p.id}
                        onClick={() => { setSelectedPerson(p); setPersonResults([]); }}
                        className="w-full text-left px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                      >
                        <p className="text-sm font-medium text-slate-800 dark:text-white">{p.fullName}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500">{isUser ? `${p.role} · ${p.email}` : p.designation}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Device */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">Select Device</label>
            <select
              value={deviceId}
              onChange={(e) => setDeviceId(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-teal-500"
            >
              <option value="">Select device</option>
              {devices.map((d) => (
                <option key={d.id} value={d.id}>{d.name} ({d.deviceCode}){!d.isActive ? " — disabled" : ""}</option>
              ))}
            </select>
          </div>

          {/* Biometric ID */}
          <Field label="Biometric ID" value={biometricId} onChange={setBiometricId} placeholder="Enrollment / card number" />

          {/* Status */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">Status</label>
            <div className="flex gap-2">
              {[{ v: true, label: "Active" }, { v: false, label: "Inactive" }].map((opt) => (
                <button
                  key={String(opt.v)}
                  type="button"
                  onClick={() => setIsActive(opt.v)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-colors ${
                    isActive === opt.v
                      ? "bg-teal-50 dark:bg-teal-500/15 text-teal-700 dark:text-teal-400 border-teal-200 dark:border-teal-500/20"
                      : "text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button type="submit" disabled={saving} className="flex items-center gap-1.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-950 text-sm font-semibold px-4 py-2.5 rounded-xl disabled:opacity-50">
              <Check className="w-4 h-4" /> {saving ? "Saving..." : "Save"}
            </button>
            <button type="button" onClick={backToList} className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 px-4 py-2.5">
              <X className="w-4 h-4" /> Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
