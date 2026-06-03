// client/src/pages/pharmacy/PharmacyMedicineList.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  PageHeader, SearchBar, TableCard, Th, Td, ActionBtn,
  DeleteModal, EmptyState, Pagination,
} from "../../components/UI";
import { PharmacyStatusBadge } from "./PharmacyDashboard";
import PharmacyMedicineForm from "./PharmacyMedicineForm";
import PharmacyMedicineDetails from "./PharmacyMedicineDetails";
import { Plus, Search } from "lucide-react";

const PER_PAGE = 8;

function getMedicineStatus(med) {
  const today = new Date();
  const expiry = new Date(med.expiryDate);
  const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
  if (med.quantity === 0) return "Out of Stock";
  if (diffDays <= 0) return "Expired";
  if (diffDays <= 30) return "Expiring Soon";
  if (med.quantity <= med.reorderLevel) return "Low Stock";
  return "In Stock";
}

const STATUS_FILTERS = ["", "In Stock", "Low Stock", "Out of Stock", "Expiring Soon", "Expired"];

export default function PharmacyMedicineList({ medicines, setMedicines }) {
  const [search, setSearch]             = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage]                 = useState(1);
  const [deleteId, setDeleteId]         = useState(null);
  const [editing, setEditing]           = useState(null);
  const [viewing, setViewing]           = useState(null);
  const navigate = useNavigate();

  const filtered = medicines.filter(m => {
    const matchName   = m.drugName.toLowerCase().includes(search.toLowerCase())
                     || m.genericName?.toLowerCase().includes(search.toLowerCase())
                     || m.batchNumber?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || getMedicineStatus(m) === statusFilter;
    return matchName && matchStatus;
  });

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const handleDelete = (id) => { setMedicines(ms => ms.filter(m => m.id !== id)); setDeleteId(null); };

  if (editing) return <PharmacyMedicineForm medicines={medicines} setMedicines={setMedicines} editMedicine={editing} onDone={() => setEditing(null)} />;
  if (viewing) return <PharmacyMedicineDetails medicine={viewing} setMedicines={setMedicines} onBack={() => setViewing(null)} />;

  return (
    <div>
      <PageHeader
        title="Medicine Inventory"
        subtitle={`${filtered.length} records`}
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

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <SearchBar value={search} onChange={s => { setSearch(s); setPage(1); }} placeholder="Search drug, generic name, batch..." />
        <div className="flex gap-2 flex-wrap">
          {STATUS_FILTERS.map(s => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(1); }}
              className={`px-3 py-2 rounded-xl text-xs font-medium transition-colors border ${
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

      <TableCard>
        <thead>
          <tr>
            <Th>Medicine</Th><Th>Category</Th><Th>Batch</Th>
            <Th>Purchase ₹</Th><Th>Selling ₹</Th>
            <Th>Stock</Th><Th>Reorder</Th><Th>Expiry</Th><Th>Status</Th><Th>Actions</Th>
          </tr>
        </thead>
        <tbody>
          {paginated.length === 0 ? (
            <tr><td colSpan={10}><EmptyState icon={Search} message="No medicines found" /></td></tr>
          ) : paginated.map(m => {
            const status = getMedicineStatus(m);
            return (
              <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                <Td>
                  <button onClick={() => setViewing(m)} className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
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
                      <span className="text-slate-400 dark:text-slate-500 text-xs">{m.genericName}</span>
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
                    <ActionBtn type="edit"   onClick={() => setEditing(m)} />
                    <ActionBtn type="delete" onClick={() => setDeleteId(m.id)} />
                  </div>
                </Td>
              </tr>
            );
          })}
        </tbody>
      </TableCard>

      <Pagination current={page} total={totalPages} onPageChange={setPage} />

      {deleteId && (
        <DeleteModal
          name={medicines.find(m => m.id === deleteId)?.drugName}
          onConfirm={() => handleDelete(deleteId)}
          onCancel={() => setDeleteId(null)}
        />
      )}
    </div>
  );
}