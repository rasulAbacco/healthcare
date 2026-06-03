// client/src/pages/opd/OPDPatientList.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  PageHeader, SearchBar, TableCard, Th, Td, ActionBtn,
  DeleteModal, EmptyState, Pagination, StatusBadge,
} from "../../components/UI";
import OPDPatientForm from "./OPDPatientForm";
import OPDPatientDetails from "./OPDPatientDetails";
import { UserPlus, SlidersHorizontal, X, Search } from "lucide-react";

const PER_PAGE = 7;

const followUpStatusColors = {
  Pending:   "bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20",
  Completed: "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20",
  Missed:    "bg-red-50 dark:bg-red-500/15 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/20",
};

export default function OPDPatients({ patients, setPatients, readOnly = false }) {
  const [search, setSearch]       = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [page, setPage]           = useState(1);
  const [deleteId, setDeleteId]   = useState(null);
  const [editing, setEditing]     = useState(null);
  const [viewing, setViewing]     = useState(null);
  const navigate = useNavigate();

  const filtered = patients.filter(p => {
    const matchName = p.name.toLowerCase().includes(search.toLowerCase())
      || (p.serialNumber || "").toLowerCase().includes(search.toLowerCase());
    const matchDate = !dateFilter || p.visitDate === dateFilter;
    return matchName && matchDate;
  });

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const handleDelete = (id) => { setPatients(ps => ps.filter(p => p.id !== id)); setDeleteId(null); };

  // Allow doctor to update diagnosis/prescription/doctorNotes but not delete or edit payments
  const handleSave = (updated) => {
    setPatients(ps => ps.map(p => p.id === updated.id ? updated : p));
  };

  if (editing) return <OPDPatientForm patients={patients} setPatients={setPatients} editPatient={editing} onDone={() => setEditing(null)} />;
  if (viewing) return <OPDPatientDetails patient={viewing} onBack={() => setViewing(null)} setPatients={setPatients} readOnly={readOnly} />;

  return (
    <div>
      <PageHeader
        title="OPD Patients"
        subtitle={`${filtered.length} records`}
        action={
          !readOnly && (
            <button
              onClick={() => navigate("/opd/register")}
              className="flex items-center gap-2 bg-gradient-to-r from-teal-500 to-cyan-400 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:scale-[1.02] transition-transform shadow-lg shadow-teal-500/20"
            >
              <UserPlus className="w-4 h-4" />
              <span className="hidden sm:inline">Register Patient</span>
              <span className="sm:hidden">Register</span>
            </button>
          )
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <SearchBar value={search} onChange={s => { setSearch(s); setPage(1); }} placeholder="Search by name or token..." />
        <div className="flex items-center gap-2">
          <div className="relative flex items-center">
            <SlidersHorizontal className="absolute left-3 w-4 h-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
            <input
              type="date"
              value={dateFilter}
              onChange={e => { setDateFilter(e.target.value); setPage(1); }}
              className="pl-9 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-800 dark:text-white text-sm focus:outline-none focus:border-teal-500 dark:focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 transition-colors"
            />
          </div>
          {dateFilter && (
            <button
              onClick={() => setDateFilter("")}
              className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white bg-white dark:bg-slate-800 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors"
            >
              <X className="w-3.5 h-3.5" /> Clear
            </button>
          )}
        </div>
      </div>

      <TableCard>
        <thead>
          <tr>
            <Th>Token</Th><Th>Patient</Th><Th>Age</Th>
            <Th>Phone</Th><Th>Place</Th>
            <Th>Fee</Th><Th>Cash</Th><Th>UPI</Th><Th>Total</Th>
            <Th>Visit Date</Th><Th>Follow-Up</Th>
            {!readOnly && <Th>Actions</Th>}
          </tr>
        </thead>
        <tbody>
          {paginated.length === 0 ? (
            <tr><td colSpan={12}><EmptyState icon={Search} message="No patients found" /></td></tr>
          ) : paginated.map(p => (
            <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
              <Td>
                <span className="font-mono text-xs text-teal-600 dark:text-teal-400 font-bold">{p.serialNumber || "—"}</span>
              </Td>
              <Td>
                <button onClick={() => setViewing(p)} className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
                  <div className="w-8 h-8 rounded-full bg-teal-50 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center text-xs font-bold border border-teal-100 dark:border-transparent flex-shrink-0">
                    {p.name[0]}
                  </div>
                  <span className="text-slate-800 dark:text-white font-medium whitespace-nowrap">{p.name}</span>
                </button>
              </Td>
              <Td>{p.age}y</Td>
              <Td><span className="text-slate-500 dark:text-slate-400">{p.phone}</span></Td>
              <Td><span className="text-slate-500 dark:text-slate-400">{p.place}</span></Td>
              <Td><span className="text-emerald-600 dark:text-emerald-400 font-medium">₹{p.fee}</span></Td>
              <Td>{p.cash > 0 ? <span className="text-amber-600 dark:text-amber-400">₹{p.cash}</span> : <span className="text-slate-300 dark:text-slate-600">—</span>}</Td>
              <Td>{p.upi  > 0 ? <span className="text-violet-600 dark:text-violet-400">₹{p.upi}</span>  : <span className="text-slate-300 dark:text-slate-600">—</span>}</Td>
              <Td><span className="text-slate-800 dark:text-white font-bold">₹{p.total}</span></Td>
              <Td><span className="text-slate-500 dark:text-slate-400">{p.visitDate}</span></Td>
              <Td>
                {p.followUpStatus ? (
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border whitespace-nowrap ${followUpStatusColors[p.followUpStatus] || followUpStatusColors["Pending"]}`}>
                    {p.followUpStatus}
                  </span>
                ) : <span className="text-slate-300 dark:text-slate-600">—</span>}
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