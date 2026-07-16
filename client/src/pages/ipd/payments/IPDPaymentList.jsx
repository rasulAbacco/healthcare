// client/src/pages/ipd/IPDPaymentList.jsx
import { useEffect, useState, useCallback } from "react";
import { PageHeader, Pagination } from "../../../components/UI";
import { fetchPaymentSummary } from "./api/ipdPayment.api";
import IPDPaymentModal from "./IPDPaymentModal";
import { Search, IndianRupee, Wallet } from "lucide-react";

const STATUS_OPTIONS = ["", "Pending", "Partially Paid", "Fully Paid"];

const STATUS_STYLES = {
  "Fully Paid": "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20",
  "Partially Paid": "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/20",
  "Pending": "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/20",
};

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "-");
const fmtMoney = (n) => `₹${(n || 0).toLocaleString("en-IN")}`;

// Order in which settlement statuses should appear: Pending -> Partially Paid -> Fully Paid
const STATUS_ORDER = { "Pending": 0, "Partially Paid": 1, "Fully Paid": 2 };
const sortByStatus = (list) =>
  [...list].sort((a, b) => {
    const oa = STATUS_ORDER[a.settlementStatus] ?? 99;
    const ob = STATUS_ORDER[b.settlementStatus] ?? 99;
    return oa - ob;
  });

const PER_PAGE = 12;

export default function IPDPaymentList() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [activePatientId, setActivePatientId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchPaymentSummary({ search, status });
      setRows(sortByStatus(data));
    } catch (err) {
      setError(err.message || "Failed to load payment summary");
    } finally {
      setLoading(false);
    }
  }, [search, status]);

  useEffect(() => {
    const t = setTimeout(load, 300); // light debounce on search typing
    return () => clearTimeout(t);
  }, [load]);

  // Reset to first page whenever the filtered/sorted data set changes
  useEffect(() => {
    setPage(1);
  }, [search, status]);

  const totalPages = Math.max(1, Math.ceil(rows.length / PER_PAGE));
  const pagedRows = rows.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const handleModalClosed = (didChange) => {
    setActivePatientId(null);
    if (didChange) load();
  };

  return (
    <div>
      <PageHeader title="IPD Payments" subtitle="Manage payments across all admitted patients" />

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or IPD serial number..."
            className="w-full pl-9 pr-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-white focus:outline-none focus:border-teal-500 transition-colors"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-teal-500 transition-colors"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s || "All Statuses"}</option>
          ))}
        </select>
      </div>

      {error && (
        <div className="text-sm text-red-500 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl px-4 py-2.5 mb-4">
          {error}
        </div>
      )}

      <div className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700 text-left text-slate-500 dark:text-slate-400">
                <th className="px-4 py-3 font-medium">IPD No.</th>
                <th className="px-4 py-3 font-medium">Patient Name</th>
                <th className="px-4 py-3 font-medium">Admission Date</th>
                <th className="px-4 py-3 font-medium text-right">Total Bill</th>
                <th className="px-4 py-3 font-medium text-right">Paid</th>
                <th className="px-4 py-3 font-medium text-right">Pending</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">Loading...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">No patients found.</td></tr>
              ) : (
                pagedRows.map((p) => (
                  <tr key={p.id} className="border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3 font-mono font-semibold text-violet-600 dark:text-violet-400">{p.serialNumber}</td>
                    <td className="px-4 py-3 text-slate-800 dark:text-white font-medium">{p.name}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{fmtDate(p.admissionDate)}</td>
                    <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-300">{fmtMoney(p.totalStay)}</td>
                    <td className="px-4 py-3 text-right text-emerald-600 dark:text-emerald-400 font-medium">{fmtMoney(p.totalPaid)}</td>
                    <td className="px-4 py-3 text-right text-red-500 dark:text-red-400 font-medium">{fmtMoney(p.balance)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-medium border ${STATUS_STYLES[p.settlementStatus] || ""}`}>
                        {p.settlementStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {p.balance > 0 ? (
                        <button
                          onClick={() => setActivePatientId(p.id)}
                          className="inline-flex items-center gap-1.5 bg-gradient-to-r from-violet-500 to-purple-400 text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:scale-[1.03] transition-transform"
                        >
                          <IndianRupee className="w-3.5 h-3.5" /> Pay Now
                        </button>
                      ) : (
                        <button
                          onClick={() => setActivePatientId(p.id)}
                          className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors"
                        >
                          <Wallet className="w-3.5 h-3.5" /> View History
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {!loading && rows.length > 0 && (
        <div className="mt-4">
          <Pagination current={page} total={totalPages} onPageChange={setPage} />
        </div>
      )}

      {activePatientId && (
        <IPDPaymentModal patientId={activePatientId} onClose={handleModalClosed} />
      )}
    </div>
  );
}