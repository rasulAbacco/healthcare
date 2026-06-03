// client/src/pages/ipd/IPDPatientList.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  PageHeader, SearchBar, TableCard, Th, Td, ActionBtn,
  DeleteModal, EmptyState, Pagination, StatusBadge,
} from "../../components/UI";
import IPDPatientForm from "./IPDPatientForm";
import IPDPatientDetails from "./IPDPatientDetails";
import { UserPlus, Search } from "lucide-react";

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

export default function IPDPatientList({ patients, setPatients, readOnly = false }) {
  const [search, setSearch]             = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage]                 = useState(1);
  const [deleteId, setDeleteId]         = useState(null);
  const [editing, setEditing]           = useState(null);
  const [viewing, setViewing]           = useState(null);
  const navigate = useNavigate();

  const filtered = patients.filter(p => {
    const matchName   = p.name.toLowerCase().includes(search.toLowerCase())
      || (p.serialNumber || "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || p.status === statusFilter;
    return matchName && matchStatus;
  });

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const handleDelete = (id) => { setPatients(ps => ps.filter(p => p.id !== id)); setDeleteId(null); };

  if (editing) return <IPDPatientForm patients={patients} setPatients={setPatients} editPatient={editing} onDone={() => setEditing(null)} />;
  if (viewing) return <IPDPatientDetails patient={viewing} setPatients={setPatients} onBack={() => setViewing(null)} readOnly={readOnly} />;

  return (
    <div>
      <PageHeader
        title="IPD Patients"
        subtitle={`${filtered.length} records`}
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

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <SearchBar value={search} onChange={s => { setSearch(s); setPage(1); }} placeholder="Search by name or IPD no..." />
        <div className="flex gap-2 flex-wrap">
          {["", "Admitted", "Discharged"].map(s => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(1); }}
              className={`px-3 py-2 rounded-xl text-xs font-medium transition-colors border ${
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

      <TableCard>
        <thead>
          <tr>
            <Th>IPD No.</Th><Th>Patient</Th><Th>Admission</Th><Th>Time</Th>
            <Th>Deposit</Th><Th>Cash</Th><Th>UPI</Th><Th>Card</Th><Th>Total Paid</Th>
            <Th>Balance</Th><Th>Settlement</Th><Th>Discharge</Th>
            {!readOnly && <Th>Actions</Th>}
          </tr>
        </thead>
        <tbody>
          {paginated.length === 0 ? (
            <tr><td colSpan={13}><EmptyState icon={Search} message="No patients found" /></td></tr>
          ) : paginated.map(p => (
            <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
              <Td>
                <span className="font-mono text-xs text-violet-600 dark:text-violet-400 font-bold">{p.serialNumber || "—"}</span>
              </Td>
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
              <Td><span className="text-slate-500 dark:text-slate-400">{p.admissionDate}</span></Td>
              <Td><span className="text-slate-500 dark:text-slate-400">{p.admissionTime}</span></Td>
              <Td><span className="text-blue-600 dark:text-blue-400">₹{p.deposit?.toLocaleString()}</span></Td>
              <Td>{p.cash > 0 ? <span className="text-amber-600 dark:text-amber-400">₹{p.cash}</span> : <span className="text-slate-300 dark:text-slate-600">—</span>}</Td>
              <Td>{p.upi  > 0 ? <span className="text-violet-600 dark:text-violet-400">₹{p.upi}</span>  : <span className="text-slate-300 dark:text-slate-600">—</span>}</Td>
              <Td>{(p.card || 0) > 0 ? <span className="text-blue-500 dark:text-blue-400">₹{p.card}</span> : <span className="text-slate-300 dark:text-slate-600">—</span>}</Td>
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

      <Pagination current={page} total={totalPages} onPageChange={setPage} />

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