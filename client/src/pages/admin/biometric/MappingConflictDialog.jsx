// client/src/pages/admin/biometric/MappingConflictDialog.jsx
//
// Shared "same biometric ID is already active" check, used by the mapping
// tabs and the Add/Edit mapping page.
//
//   const { checkConflicts, conflictDialog } = useMappingConflictCheck();
//   const { proceed, deactivateConflicts } = await checkConflicts(bioId, excludeMappingId);
//   if (!proceed) return;
//   ...send deactivateConflicts with the save request
//   ...and render {conflictDialog} somewhere in the component.
import { useCallback, useRef, useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { api } from "../../../lib/api";

export function useMappingConflictCheck() {
  const [pending, setPending] = useState(null);
  const pendingRef = useRef(null);

  const checkConflicts = useCallback(async (biometricId, excludeId = null) => {
    const bio = String(biometricId ?? "").trim();
    if (!bio) return { proceed: true, deactivateConflicts: false };

    const params = new URLSearchParams({ biometricId: bio });
    if (excludeId) params.set("excludeId", excludeId);
    const { conflicts = [] } = await api.get(
      `/biometric/mappings/conflicts?${params.toString()}`,
    );
    if (!conflicts.length) return { proceed: true, deactivateConflicts: false };

    return new Promise((resolve) => {
      const next = { biometricId: bio, conflicts, resolve };
      pendingRef.current = next;
      setPending(next);
    });
  }, []);

  const answer = useCallback((proceed) => {
    const p = pendingRef.current;
    pendingRef.current = null;
    setPending(null);
    p?.resolve({ proceed, deactivateConflicts: proceed });
  }, []);

  const conflictDialog = pending ? (
    <ConflictDialog
      biometricId={pending.biometricId}
      conflicts={pending.conflicts}
      onCancel={() => answer(false)}
      onConfirm={() => answer(true)}
    />
  ) : null;

  return { checkConflicts, conflictDialog };
}

function ConflictDialog({ biometricId, conflicts, onCancel, onConfirm }) {
  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-[60] p-4"
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[28px] p-5 sm:p-6 w-full max-w-md shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-full bg-amber-50 dark:bg-amber-500/15 text-amber-600">
              <AlertTriangle className="w-4 h-4" />
            </span>
            <h4 className="font-extrabold text-slate-900 dark:text-white text-sm">
              Biometric ID already in use
            </h4>
          </div>
          <button
            onClick={onCancel}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
          Biometric ID{" "}
          <span className="font-mono font-extrabold">{biometricId}</span> is
          currently <b>Active</b> for:
        </p>

        <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-2xl">
          {conflicts.map((c) => (
            <div key={c.id} className="px-4 py-2.5">
              <p className="text-xs font-extrabold text-slate-900 dark:text-white">
                {c.personName}
              </p>
              <p className="text-[10px] text-slate-400 font-medium">
                {c.personType === "USER" ? "Staff user" : "Employee"}
                {c.deviceName ? ` · ${c.deviceName}` : ""}
              </p>
            </div>
          ))}
        </div>

        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-3">
          One biometric ID can be active for only one person. Make{" "}
          {conflicts.length === 1 ? "them" : "these mappings"} <b>Inactive</b>{" "}
          so this mapping can be active?
        </p>

        <div className="flex flex-col-reverse sm:flex-row gap-2 justify-end pt-4">
          <button
            onClick={onCancel}
            className="text-xs font-bold text-slate-500 px-4 py-2"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="bg-[#0f4a29] hover:bg-[#165a34] text-white text-xs font-extrabold px-5 py-2 rounded-full shadow-xs"
          >
            Make them Inactive &amp; continue
          </button>
        </div>
      </div>
    </div>
  );
}
