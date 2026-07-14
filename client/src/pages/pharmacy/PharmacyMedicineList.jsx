// client/src/pages/pharmacy/PharmacyMedicineList.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  PageHeader, SearchBar, TableCard, Th, Td, ActionBtn,
  DeleteModal, EmptyState, Pagination,
} from "../../components/UI";
import { PharmacyStatusBadge, getMedicineStatus } from "./PharmacyDashboard";
import PharmacyMedicineDetails from "./PharmacyMedicineDetails";
import { Plus, Search, Calendar, Layers, Tag, Loader2 } from "lucide-react";
import { api } from "../../lib/api";

const PER_PAGE = 8;

const STATUS_FILTERS = ["", "In Stock", "Low Stock", "Out of Stock", "Expiring Soon", "Expired"];

export default function PharmacyMedicineList() {
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [deleting, setDeleting]   = useState(false);
  const [search, setSearch]             = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage]                 = useState(1);
  const [deleteId, setDeleteId]         = useState(null);
  const [viewing, setViewing]           = useState(null);
  const navigate = useNavigate();

  const fetchMedicines = async () => {
    setLoading(true);
    setError("");
    try {
      const { medicines: data } = await api.get("/pharmacy/medicines");
      setMedicines(data);
    } catch (err) {
      setError(err.message || "Could not load medicines.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMedicines(); }, []);

  const filtered = medicines.filter(m => {
    const matchName   = m.drugName.toLowerCase().includes(search.toLowerCase())
                     || m.genericName?.toLowerCase().includes(search.toLowerCase())
                     || m.batchNumber?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || getMedicineStatus(m) === statusFilter;
    return matchName && matchStatus;
  });

  const totalPages = Math.ceil(filtered.length / PER_PAGE) || 1;
  const paginated  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const handleDelete = async (id) => {
    setDeleting(true);
    try {
      await api.del(`/pharmacy/medicines/${id}`);
      setMedicines(ms => ms.filter(m => m.id !== id));
      setDeleteId(null);
    } catch (err) {
      setError(err.message || "Could not delete this medicine.");
    } finally {
      setDeleting(false);
    }
  };

  if (viewing) {
    return (
      <PharmacyMedicineDetails
        medicine={viewing}
        onBack={() => setViewing(null)}
        onUpdated={(updated) => {
          setMedicines(ms => ms.map(m => m.id === updated.id ? updated : m));
          setViewing(updated);
        }}
      />
    );
  }

  return (
    <div className="w-full px-2 sm:px-4 max-w-7xl mx-auto">
      <PageHeader
        title="Medicine Inventory"
        subtitle={loading ? "Loading..." : `${filtered.length} records`}
        action={
          <button
            onClick={() => navigate("/pharmacy/add")}
            className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-400 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:scale-[1.02] transition-transform shadow-lg shadow-emerald-500/20"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Medicine</span>
            <span className="sm:hidden">Add</span>
          </button>
        }
      />

      {error && (
        <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-xl px-4 py-3 text-rose-600 dark:text-rose-400 text-sm font-medium mb-4">
          {error}
        </div>
      )}

      {/* Filters Area */}
      <div className="flex flex-col gap-3 mb-4 lg:flex-row lg:items-center">
        <div className="flex-1">
          <SearchBar value={search} onChange={s => { setSearch(s); setPage(1); }} placeholder="Search drug, generic name, batch..." />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1.5 lg:pb-0 scrollbar-none">
          {STATUS_FILTERS.map(s => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(1); }}
              className={`px-3 py-2 rounded-xl text-xs font-medium transition-colors border whitespace-nowrap flex-shrink-0 ${
                statusFilter === s
                  ? "bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30"
                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
              }`}
            >
              {s || "All Status"}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="flex items-center gap-3 text-slate-400 dark:text-slate-500 text-sm font-medium">
            <Loader2 className="w-5 h-5 animate-spin" /> Loading medicines...
          </div>
        </div>
      ) : paginated.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8">
          <EmptyState icon={Search} message="No medicines found" />
        </div>
      ) : (
        <>
          {/* 1. DESKTOP MODE */}
          <div className="hidden lg:block">
            <TableCard>
              <thead>
                <tr>
                  <Th>Medicine</Th><Th>Category</Th><Th>Batch</Th>
                  <Th>Purchase ₹</Th><Th>Selling ₹</Th>
                  <Th>Stock</Th><Th>Reorder</Th><Th>Expiry</Th><Th>Status</Th><Th>Actions</Th>
                </tr>
              </thead>
              <tbody>
                {paginated.map(m => {
                  const status = getMedicineStatus(m);
                  return (
                    <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                      <Td>
                        <button onClick={() => setViewing(m)} className="flex items-center gap-2.5 hover:opacity-80 transition-opacity text-left">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border flex-shrink-0 ${
                            status === "In Stock"
                              ? "bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-transparent"
                              : status === "Low Stock"
                              ? "bg-amber-50 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-transparent"
                              : "bg-red-50 dark:bg-red-500/20 text-red-600 dark:text-red-400 border-red-100 dark:border-transparent"
                          }`}>
                            {m.drugName[0]}
                          </div>
                          <div>
                            <span className="text-slate-800 dark:text-white font-medium whitespace-nowrap block">{m.drugName}</span>
                            <span className="text-slate-400 dark:text-slate-500 text-xs block truncate max-w-[180px]">{m.genericName}</span>
                          </div>
                        </button>
                      </Td>
                      <Td><span className="text-slate-500 dark:text-slate-400">{m.category}</span></Td>
                      <Td><span className="text-slate-500 dark:text-slate-400 font-mono text-xs">{m.batchNumber}</span></Td>
                      <Td><span className="text-blue-600 dark:text-blue-400">₹{m.purchasePrice}</span></Td>
                      <Td><span className="text-emerald-600 dark:text-emerald-400 font-medium">₹{m.sellingPrice}</span></Td>
                      <Td>
                        <span className={`font-bold ${
                          m.quantity === 0 ? 'text-red-500 dark:text-red-400'
                          : m.quantity <= m.reorderLevel ? 'text-amber-500 dark:text-amber-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                        }`}>{m.quantity}</span>
                      </Td>
                      <Td><span className="text-slate-500 dark:text-slate-400">{m.reorderLevel}</span></Td>
                      <Td><span className="text-slate-500 dark:text-slate-400">{m.expiryDate}</span></Td>
                      <Td><PharmacyStatusBadge status={status} /></Td>
                      <Td>
                        <div className="flex gap-1">
                          <ActionBtn type="view"   onClick={() => setViewing(m)} />
                          <ActionBtn type="edit"   onClick={() => navigate(`/pharmacy/medicines/${m.id}/edit`)} />
                          <ActionBtn type="delete" onClick={() => setDeleteId(m.id)} />
                        </div>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </TableCard>
          </div>

          {/* 2. MOBILE CARD GRID MODE */}
          <div className="block lg:hidden space-y-3">
            {paginated.map(m => {
              const status = getMedicineStatus(m);
              return (
                <div key={m.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
                  <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-800 pb-3 mb-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <button onClick={() => setViewing(m)} className="flex-shrink-0">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm border ${
                          status === "In Stock"
                            ? "bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-transparent"
                            : status === "Low Stock"
                            ? "bg-amber-50 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-transparent"
                            : "bg-red-50 dark:bg-red-500/20 text-red-600 dark:text-red-400 border-red-100 dark:border-transparent"
                        }`}>
                          {m.drugName[0]}
                        </div>
                      </button>
                      <div className="min-w-0">
                        <h4 className="text-slate-800 dark:text-white font-semibold text-sm truncate">{m.drugName}</h4>
                        <p className="text-xs text-slate-400 dark:text-slate-500 truncate mt-0.5">{m.genericName || "No generic name"}</p>
                      </div>
                    </div>
                    <div className="flex-shrink-0 pl-1">
                      <PharmacyStatusBadge status={status} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 dark:text-slate-400 mb-3 bg-slate-50/50 dark:bg-slate-800/20 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/40">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Layers className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span className="truncate">Cat: {m.category}</span>
                    </div>
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Tag className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span className="truncate font-mono">Batch: {m.batchNumber}</span>
                    </div>
                    <div className="flex items-center gap-1.5 col-span-2">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span>Exp: <span className="font-medium text-slate-700 dark:text-slate-300">{m.expiryDate}</span></span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs border-b border-slate-100 dark:border-slate-800 pb-3 mb-3">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Purchase Price:</span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">₹{m.purchasePrice}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Retail Sale:</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">₹{m.sellingPrice}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Alert Limit:</span>
                      <span className="text-slate-600 dark:text-slate-400 font-medium">{m.reorderLevel} units</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 font-semibold">Current Count:</span>
                      <span className={`font-black text-sm ${
                        m.quantity === 0 ? 'text-red-500'
                        : m.quantity <= m.reorderLevel ? 'text-amber-500'
                        : 'text-emerald-600 dark:text-emerald-400'
                      }`}>{m.quantity} <span className="text-[10px] font-normal text-slate-400">left</span></span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <button onClick={() => setViewing(m)} className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold hover:underline">
                      View Details →
                    </button>
                    <div className="flex gap-1 flex-shrink-0">
                      <ActionBtn type="view"   onClick={() => setViewing(m)} />
                      <ActionBtn type="edit"   onClick={() => navigate(`/pharmacy/medicines/${m.id}/edit`)} />
                      <ActionBtn type="delete" onClick={() => setDeleteId(m.id)} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <div className="mt-4">
        <Pagination current={page} total={totalPages} onPageChange={setPage} />
      </div>

      {deleteId && (
        <DeleteModal
          name={medicines.find(m => m.id === deleteId)?.drugName}
          itemLabel="Medicine"
          onConfirm={() => handleDelete(deleteId)}
          onCancel={() => !deleting && setDeleteId(null)}
        />
      )}
    </div>
  );
}