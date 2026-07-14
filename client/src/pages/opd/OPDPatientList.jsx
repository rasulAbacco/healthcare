// client/src/pages/opd/OPDPatientList.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  PageHeader, SearchBar, TableCard, Th, Td, ActionBtn,
  DeleteModal, EmptyState, Pagination, StatusBadge,
} from "../../components/UI";
import OPDPatientDetails from "./OPDPatientDetails";
import { UserPlus, SlidersHorizontal, X, Search, Phone, MapPin, Calendar, Loader2 } from "lucide-react";
import { api } from "../../lib/api";

const PER_PAGE = 7;

const followUpStatusColors = {
  Pending:   "bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20",
  Completed: "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20",
  Missed:    "bg-red-50 dark:bg-red-500/15 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/20",
};

export default function OPDPatients({ readOnly = false }) {
  const [patients, setPatients]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [deleting, setDeleting]   = useState(false);
  const [search, setSearch]       = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [page, setPage]           = useState(1);
  const [deleteId, setDeleteId]   = useState(null);
  const [viewing, setViewing]     = useState(null);
  const navigate = useNavigate();

  const fetchPatients = async () => {
    setLoading(true);
    setError("");
    try {
      const { patients: data } = await api.get("/opd/patients");
      setPatients(data);
    } catch (err) {
      setError(err.message || "Could not load patients.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPatients(); }, []);

  const filtered = patients.filter(p => {
    const matchName = p.name.toLowerCase().includes(search.toLowerCase())
      || (p.serialNumber || "").toLowerCase().includes(search.toLowerCase());
    const matchDate = !dateFilter || p.visitDate === dateFilter;
    return matchName && matchDate;
  });

  const totalPages = Math.ceil(filtered.length / PER_PAGE) || 1;
  const paginated  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const handleDelete = async (id) => {
    setDeleting(true);
    try {
      await api.del(`/opd/patients/${id}`);
      setPatients(ps => ps.filter(p => p.id !== id));
      setDeleteId(null);
    } catch (err) {
      setError(err.message || "Could not delete this patient.");
    } finally {
      setDeleting(false);
    }
  };

  if (viewing) {
    return (
      <OPDPatientDetails
        patient={viewing}
        onBack={() => setViewing(null)}
        onUpdated={(updated) => {
          setPatients(ps => ps.map(p => p.id === updated.id ? updated : p));
          setViewing(updated);
        }}
        readOnly={readOnly}
      />
    );
  }

  return (
    <div className="w-full px-2 sm:px-4 max-w-7xl mx-auto">
      <PageHeader
        title="OPD Patients"
        subtitle={loading ? "Loading..." : `${filtered.length} records`}
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

      {error && (
        <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-xl px-4 py-3 text-rose-600 dark:text-rose-400 text-sm font-medium mb-4">
          {error}
        </div>
      )}

      {/* Filters Stack vertically on mobile, horizontally on desktop */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4 w-full">
        <div className="flex-1 w-full">
          <SearchBar value={search} onChange={s => { setSearch(s); setPage(1); }} placeholder="Search by name or token..." />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex items-center flex-1 sm:flex-initial w-full">
            <SlidersHorizontal className="absolute left-3 w-4 h-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
            <input
              type="date"
              value={dateFilter}
              onChange={e => { setDateFilter(e.target.value); setPage(1); }}
              className="pl-9 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-800 dark:text-white text-sm focus:outline-none focus:border-teal-500 dark:focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10 transition-colors"
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

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="flex items-center gap-3 text-slate-400 dark:text-slate-500 text-sm font-medium">
            <Loader2 className="w-5 h-5 animate-spin" /> Loading patients...
          </div>
        </div>
      ) : paginated.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8">
          <EmptyState icon={Search} message="No patients found" />
        </div>
      ) : (
        <>
          {/* 1. DESKTOP VIEW: Hidden on mobile screens, shown on md and above */}
          <div className="hidden md:block">
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
                {paginated.map(p => (
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
                          <ActionBtn type="edit"   onClick={() => navigate(`/opd/patients/${p.id}/edit`)} />
                          <ActionBtn type="delete" onClick={() => setDeleteId(p.id)} />
                        </div>
                      </Td>
                    )}
                  </tr>
                ))}
              </tbody>
            </TableCard>
          </div>

          {/* 2. MOBILE VIEW: Shown on small viewports, hidden on desktop sizes */}
          <div className="block md:hidden space-y-3">
            {paginated.map(p => (
              <div key={p.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
                {/* Header Information */}
                <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-800 pb-3 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-teal-50 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold border border-teal-100 dark:border-transparent flex-shrink-0">
                      {p.name[0]}
                    </div>
                    <div>
                      <h4 className="text-slate-800 dark:text-white font-semibold text-sm">{p.name}</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-mono font-bold text-teal-600 dark:text-teal-400 mt-0.5">
                        Token: {p.serialNumber || "—"} ({p.age}y)
                      </p>
                    </div>
                  </div>
                  {p.followUpStatus && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0 ${followUpStatusColors[p.followUpStatus] || followUpStatusColors["Pending"]}`}>
                      {p.followUpStatus}
                    </span>
                  )}
                </div>

                {/* Patient Demographics */}
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 dark:text-slate-400 mb-3">
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span className="truncate">{p.phone}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span className="truncate">{p.place}</span>
                  </div>
                  <div className="flex items-center gap-1.5 col-span-2">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span>Visited: {p.visitDate}</span>
                  </div>
                </div>

                {/* Collections / Payments Layout Split */}
                <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-2.5 grid grid-cols-3 gap-1 text-center text-xs mb-3">
                  <div>
                    <span className="text-[10px] uppercase text-slate-400 block mb-0.5">Cash</span>
                    <span className="font-medium text-amber-600 dark:text-amber-400">{p.cash > 0 ? `₹${p.cash}` : "—"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-slate-400 block mb-0.5">UPI</span>
                    <span className="font-medium text-violet-600 dark:text-violet-400">{p.upi > 0 ? `₹${p.upi}` : "—"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-slate-400 block mb-0.5">Total</span>
                    <span className="font-bold text-slate-800 dark:text-white">₹{p.total}</span>
                  </div>
                </div>

                {/* Bottom Action Sheet Trigger row */}
                <div className="flex justify-between items-center pt-1">
                  <button onClick={() => setViewing(p)} className="text-xs text-teal-600 dark:text-teal-400 font-semibold hover:underline">
                    View Details →
                  </button>
                  {!readOnly && (
                    <div className="flex gap-1.5">
                      <ActionBtn type="view"   onClick={() => setViewing(p)} />
                      <ActionBtn type="edit"   onClick={() => navigate(`/opd/patients/${p.id}/edit`)} />
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
          onCancel={() => !deleting && setDeleteId(null)}
        />
      )}
    </div>
  );
}