// client/src/pages/ipd/IPDPatientList.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  PageHeader, SearchBar, TableCard, Th, Td, ActionBtn,
  DeleteModal, EmptyState, Pagination, StatusBadge,
} from "../../components/UI";
import { fetchPatients, deletePatient as apiDeletePatient } from "./api/ipd.api";
import IPDPatientForm from "./IPDPatientForm";
import IPDPatientDetails from "./IPDPatientDetails";
import { UserPlus, Search, Calendar, Clock, CreditCard } from "lucide-react";

const PER_PAGE = 7;

const settlementColors = {
  "Pending":        "bg-red-50 dark:bg-red-500/15 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/20",
  "Partially Paid": "bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20",
  "Fully Paid":     "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20",
};

const dischargeStatusColors = {
  "Admitted":            "bg-blue-50 dark:bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/20",
  "Ready For Discharge": "bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20",
  "Discharged":          "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20",
};

// backend stores dates as ISO datetimes -> show just the date/time parts
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString() : "—");

export default function IPDPatientList({ readOnly = false }) {
  const [patients, setPatients]         = useState([]);
  const [totalPages, setTotalPages]     = useState(1);
  const [totalCount, setTotalCount]     = useState(0);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState("");

  const [search, setSearch]             = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage]                 = useState(1);
  const [deleteId, setDeleteId]         = useState(null);
  const [editing, setEditing]           = useState(null);
  const [viewing, setViewing]           = useState(null);
  const navigate = useNavigate();

  const load = () => {
    setLoading(true);
    fetchPatients({ search, status: statusFilter, page, limit: PER_PAGE })
      .then(({ data, totalPages, total }) => {
        setPatients(data);
        setTotalPages(totalPages);
        setTotalCount(total);
        setError("");
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const t = setTimeout(load, 250); // small debounce for search typing
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter, page]);

  const handleDelete = (id) => {
    apiDeletePatient(id)
      .then(() => { setDeleteId(null); load(); })
      .catch((err) => { setError(err.message); setDeleteId(null); });
  };

  if (editing) {
    return (
      <IPDPatientForm
        editPatient={editing}
        onDone={() => { setEditing(null); load(); }}
      />
    );
  }
  if (viewing) {
    return (
      <IPDPatientDetails
        patient={viewing}
        onBack={() => { setViewing(null); load(); }}
        readOnly={readOnly}
      />
    );
  }

  return (
    <div className="w-full px-2 sm:px-4 max-w-7xl mx-auto">
      <PageHeader
        title="IPD Patients"
        subtitle={`${totalCount} records`}
        action={
          !readOnly && (
            <button
              onClick={() => navigate("/ipd/admit")}
              className="flex items-center gap-2 bg-gradient-to-r from-violet-500 to-purple-400 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:scale-[1.02] transition-transform shadow-lg shadow-violet-500/20"
            >
              <UserPlus className="w-4 h-4" />
              <span className="hidden sm:inline">Admit Patient</span>
              <span className="sm:hidden">Admit</span>
            </button>
          )
        }
      />

      {/* Filters */}
      <div className="flex flex-col gap-3 mb-4 md:flex-row md:items-center">
        <div className="flex-1">
          <SearchBar value={search} onChange={s => { setSearch(s); setPage(1); }} placeholder="Search by name or IPD no..." />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {["", "Admitted", "Discharged"].map(s => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(1); }}
              className={`px-3 py-2 rounded-xl text-xs font-medium transition-colors border whitespace-nowrap ${
                statusFilter === s
                  ? "bg-violet-50 dark:bg-violet-500/20 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-500/30"
                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
              }`}
            >
              {s || "All Status"}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-4 text-sm text-red-500 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl px-4 py-2.5">
          {error}
        </div>
      )}

      {loading ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center text-sm text-slate-400">
          Loading patients…
        </div>
      ) : patients.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8">
          <EmptyState icon={Search} message="No patients found" />
        </div>
      ) : (
        <>
          {/* DESKTOP */}
          <div className="hidden xl:block">
            <TableCard>
              <thead>
                <tr>
                  <Th>IPD No.</Th><Th>Patient</Th><Th>Admission</Th><Th>Time</Th>
                  <Th>Total Bill</Th><Th>Paid</Th><Th>Pending</Th>
                  <Th>Settlement</Th><Th>Discharge</Th>
                  {!readOnly && <Th>Actions</Th>}
                </tr>
              </thead>
              <tbody>
                {patients.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <Td><span className="font-mono text-xs text-violet-600 dark:text-violet-400 font-bold">{p.serialNumber || "—"}</span></Td>
                    <Td>
                      <button onClick={() => setViewing(p)} className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border flex-shrink-0 ${
                          p.status === "Admitted"
                            ? "bg-violet-50 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 border-violet-100 dark:border-transparent"
                            : "bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-transparent"
                        }`}>
                          {p.name[0]}
                        </div>
                        <span className="text-slate-800 dark:text-white font-medium whitespace-nowrap">{p.name}</span>
                      </button>
                    </Td>
                    <Td><span className="text-slate-500 dark:text-slate-400">{fmtDate(p.admissionDate)}</span></Td>
                    <Td><span className="text-slate-500 dark:text-slate-400">{p.admissionTime}</span></Td>
                    <Td><span className="text-slate-700 dark:text-slate-300 font-medium">₹{p.totalStay?.toLocaleString()}</span></Td>
                    <Td><span className="text-emerald-600 dark:text-emerald-400 font-medium">₹{p.totalPaid?.toLocaleString()}</span></Td>
                    <Td>
                      {p.balance > 0
                        ? <span className="text-red-500 dark:text-red-400 font-medium">₹{p.balance?.toLocaleString()}</span>
                        : <span className="text-emerald-600 dark:text-emerald-400 text-xs font-semibold">Cleared</span>}
                    </Td>
                    <Td>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap ${settlementColors[p.settlementStatus] || settlementColors["Pending"]}`}>
                        {p.settlementStatus || "Pending"}
                      </span>
                    </Td>
                    <Td>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap ${dischargeStatusColors[p.dischargeStatus] || dischargeStatusColors["Admitted"]}`}>
                        {p.dischargeStatus || "Admitted"}
                      </span>
                    </Td>
                    {!readOnly && (
                      <Td>
                        <div className="flex gap-1">
                          <ActionBtn type="view"   onClick={() => setViewing(p)} />
                          <ActionBtn type="edit"   onClick={() => setEditing(p)} />
                          <ActionBtn type="delete" onClick={() => setDeleteId(p.id)} />
                        </div>
                      </Td>
                    )}
                  </tr>
                ))}
              </tbody>
            </TableCard>
          </div>

          {/* MOBILE */}
          <div className="block xl:hidden space-y-3.5">
            {patients.map(p => (
              <div key={p.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
                <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-800 pb-3 mb-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <button onClick={() => setViewing(p)} className="flex-shrink-0">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm border ${
                        p.status === "Admitted"
                          ? "bg-violet-50 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 border-violet-100 dark:border-transparent"
                          : "bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-transparent"
                      }`}>
                        {p.name[0]}
                      </div>
                    </button>
                    <div className="min-w-0">
                      <h4 className="text-slate-800 dark:text-white font-semibold text-sm truncate">{p.name}</h4>
                      <p className="text-xs text-violet-600 dark:text-violet-400 font-mono font-bold mt-0.5">
                        IPD No: {p.serialNumber || "—"}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 items-end flex-shrink-0 pl-1">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${dischargeStatusColors[p.dischargeStatus] || dischargeStatusColors["Admitted"]}`}>
                      {p.dischargeStatus || "Admitted"}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 dark:text-slate-400 mb-3 bg-slate-50/50 dark:bg-slate-800/20 p-2 rounded-xl border border-slate-100 dark:border-slate-800/50">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span className="truncate">Adm: {fmtDate(p.admissionDate)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Clock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span className="truncate">Time: {p.admissionTime}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs border-b border-slate-100 dark:border-slate-800 pb-3 mb-3">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Initial Deposit:</span>
                    <span className="font-medium text-blue-600 dark:text-blue-400">₹{p.deposit || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Total Paid:</span>
                    <span className="font-medium text-emerald-600 dark:text-emerald-400">₹{p.totalPaid || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Settlement:</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${settlementColors[p.settlementStatus] || settlementColors["Pending"]}`}>
                      {p.settlementStatus || "Pending"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 font-semibold">Net Balance:</span>
                    {p.balance > 0 ? (
                      <span className="font-bold text-red-500">₹{p.balance?.toLocaleString()}</span>
                    ) : (
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold text-xs">Cleared</span>
                    )}
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <div className="flex gap-1 items-center max-w-[60%] flex-wrap">
                    {p.cash > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-100 dark:border-transparent">Cash</span>}
                    {p.upi > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-100 dark:border-transparent">UPI</span>}
                    {p.card > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-transparent">Card</span>}
                  </div>
                  {!readOnly && (
                    <div className="flex gap-1 flex-shrink-0">
                      <ActionBtn type="view"   onClick={() => setViewing(p)} />
                      <ActionBtn type="edit"   onClick={() => setEditing(p)} />
                      <ActionBtn type="delete" onClick={() => setDeleteId(p.id)} />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="mt-4">
        <Pagination current={page} total={totalPages} onPageChange={setPage} />
      </div>

      {deleteId && (
        <DeleteModal
          name={patients.find(p => p.id === deleteId)?.name}
          onConfirm={() => handleDelete(deleteId)}
          onCancel={() => setDeleteId(null)}
        />
      )}
    </div>
  );
}