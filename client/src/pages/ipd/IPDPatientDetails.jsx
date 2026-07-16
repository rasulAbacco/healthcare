// client/src/pages/ipd/IPDPatientDetails.jsx
import { useState, useRef } from "react";
import { SectionCard, StatusBadge } from "../../components/UI";
import { uploadDocument, deleteDocument } from "./api/ipd.api";
import {
  ArrowLeft, User, BedDouble, CreditCard, BarChart3,
  FlaskConical, Paperclip, Upload, Trash2,
} from "lucide-react";

const docTypes = ["Prescription", "Lab Report", "Scan Report", "Hospital Bill"];

// Documents now live in Cloudflare R2 — doc.url is already a full,
// publicly-resolvable URL (e.g. https://pub-xxxx.r2.dev/IPD%20documents/...),
// so it can be used directly with no origin-resolving needed.

export default function IPDPatientDetails({ patient: initP, onBack, readOnly = false }) {
  const [p, setP]           = useState(initP);
  const fileRef             = useRef();
  const [docType, setDocType] = useState("Prescription");
  const [uploading, setUploading] = useState(false);
  const [error, setError]   = useState("");

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const doc = await uploadDocument(p.id, file, docType);
      setP(prev => ({ ...prev, documents: [doc, ...(prev.documents || [])] }));
    } catch (err) {
      setError(err.message || "Failed to upload document");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const deleteDoc = async (id) => {
    try {
      await deleteDocument(p.id, id);
      setP(prev => ({ ...prev, documents: prev.documents.filter(d => d.id !== id) }));
    } catch (err) {
      setError(err.message || "Failed to delete document");
    }
  };

  const isImage = (ft) => ft && ft.startsWith("image");

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white text-sm font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />
        <h1 className="text-slate-800 dark:text-white font-bold text-xl">{p.name}</h1>
        <StatusBadge status={p.status} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-6xl mb-4">
        <SectionCard title="Personal Information" icon={User}>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              { label: "Name",   val: p.name },
              { label: "Age",    val: `${p.age} years` },
              { label: "Gender", val: p.gender },
              { label: "Phone",  val: p.phone },
              { label: "Aadhar", val: p.aadhar },
              { label: "Status", val: <StatusBadge status={p.status} /> },
            ].map(item => (
              <div key={item.label}>
                <div className="text-slate-400 dark:text-slate-500 text-xs mb-0.5">{item.label}</div>
                <div className="text-slate-800 dark:text-white font-medium">{item.val || "—"}</div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Admission Information" icon={BedDouble}>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              { label: "Admission Date",  val: p.admissionDate ? new Date(p.admissionDate).toLocaleDateString() : "—" },
              { label: "Admission Time",  val: p.admissionTime },
              { label: "Expected Stay",   val: p.expectedDays ? `${p.expectedDays} days` : "—" },
              { label: "Discharge Date",  val: p.dischargeDate ? new Date(p.dischargeDate).toLocaleDateString() : "—" },
              { label: "Discharge Time",  val: p.dischargeTime  || "—" },
            ].map(item => (
              <div key={item.label}>
                <div className="text-slate-400 dark:text-slate-500 text-xs mb-0.5">{item.label}</div>
                <div className="text-slate-800 dark:text-white font-medium">{item.val}</div>
              </div>
            ))}
          </div>
          {p.notes && (
            <p className="text-slate-500 dark:text-slate-400 text-xs mt-3 leading-relaxed border-t border-slate-100 dark:border-slate-800 pt-3">{p.notes}</p>
          )}
        </SectionCard>

        <SectionCard title="Payment Information" icon={CreditCard}>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
            {[
              { label: "Deposit",    val: `₹${p.deposit?.toLocaleString()}`,   color: "text-blue-600 dark:text-blue-400",    bg: "bg-blue-50 dark:bg-slate-800/50 border-blue-100 dark:border-transparent" },
              { label: "Cash",       val: `₹${p.cash?.toLocaleString()}`,       color: "text-amber-600 dark:text-amber-400",  bg: "bg-amber-50 dark:bg-slate-800/50 border-amber-100 dark:border-transparent" },
              { label: "UPI",        val: `₹${p.upi?.toLocaleString()}`,        color: "text-violet-600 dark:text-violet-400",bg: "bg-violet-50 dark:bg-slate-800/50 border-violet-100 dark:border-transparent" },
              { label: "Total Paid", val: `₹${p.totalPaid?.toLocaleString()}`,  color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-slate-800/50 border-emerald-100 dark:border-transparent" },
              { label: "Total Stay", val: `₹${p.totalStay?.toLocaleString()}`,  color: "text-slate-800 dark:text-white",       bg: "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-transparent" },
              { label: "Balance",    val: `₹${p.balance?.toLocaleString()}`,    color: p.balance > 0 ? "text-red-500 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400", bg: "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-transparent" },
            ].map(item => (
              <div key={item.label} className={`${item.bg} border rounded-xl p-3`}>
                <div className="text-slate-500 dark:text-slate-500 text-xs mb-0.5">{item.label}</div>
                <div className={`font-bold text-sm ${item.color}`}>{item.val}</div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Stay Charges" icon={BarChart3}>
          <div className="space-y-2 mb-3">
            {(p.dailyCharges || []).map((period, i) => (
              <div key={period.id || i} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800/50">
                <div className="text-slate-500 dark:text-slate-400 text-sm">
                  Period {i + 1}: {period.days} days × ₹{period.rate}/day
                </div>
                <div className="text-slate-800 dark:text-white font-medium">₹{period.amount?.toLocaleString()}</div>
              </div>
            ))}
          </div>
          <div className="flex justify-between pt-1">
            <span className="text-slate-500 dark:text-slate-400 font-medium text-sm">Total</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">₹{p.totalStay?.toLocaleString()}</span>
          </div>
        </SectionCard>
      </div>

      {/* Medicines */}
      <div className="max-w-6xl mb-4">
        <SectionCard title="Medicines" icon={FlaskConical}>
          {(!p.medicines || p.medicines.length === 0) ? (
            <p className="text-sm text-slate-400 text-center py-4">No medicines recorded.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {p.medicines.map((m, i) => (
                <div key={m.id || i} className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-transparent rounded-xl p-3 flex justify-between items-center">
                  <span className="text-slate-800 dark:text-white text-sm font-medium">{m.name}</span>
                  <span className="text-slate-500 dark:text-slate-400 text-xs">{m.quantity} {m.unit}</span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      {/* Legacy items */}
      <div className="max-w-6xl mb-4">
        <SectionCard title="Admission Items" icon={FlaskConical}>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Oil",     val: p.oil,     emoji: "🫙" },
              { label: "Protein", val: p.protein, emoji: "💪" },
              { label: "Syrup",   val: p.syrup,   emoji: "🍯" },
            ].map(item => (
              <div key={item.label} className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-transparent rounded-xl p-4 text-center">
                <div className="text-2xl mb-1">{item.emoji}</div>
                <div className="text-slate-800 dark:text-white font-bold text-xl">{item.val}</div>
                <div className="text-slate-500 dark:text-slate-500 text-sm">{item.label}</div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      {/* Documents */}
      <div className="max-w-6xl">
        <SectionCard title="Documents" icon={Paperclip}>
          {error && (
            <div className="mb-3 text-xs text-red-500 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl px-3 py-2">
              {error}
            </div>
          )}
          {!readOnly && (
            <div className="flex gap-3 mb-4 flex-wrap">
              <select
                value={docType}
                onChange={e => setDocType(e.target.value)}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-800 dark:text-white text-sm focus:outline-none focus:border-teal-500 transition-colors"
              >
                {docTypes.map(t => <option key={t}>{t}</option>)}
              </select>
              <button
                type="button"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
                className="flex items-center gap-2 bg-violet-50 dark:bg-violet-500/20 text-violet-700 dark:text-violet-400 border border-violet-200 dark:border-violet-500/30 px-4 py-2 rounded-xl text-sm font-medium hover:bg-violet-100 dark:hover:bg-violet-500/30 transition-colors disabled:opacity-60"
              >
                <Upload className="w-4 h-4" /> {uploading ? "Uploading..." : "Upload Document"}
              </button>
              <input ref={fileRef} type="file" className="hidden" onChange={handleFile} accept="image/*,.pdf" />
            </div>
          )}

          {(!p.documents || p.documents.length === 0) ? (
            <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-sm flex flex-col items-center gap-2">
              <Paperclip className="w-8 h-8 opacity-30" />
              No documents uploaded yet.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {p.documents.map(doc => (
                <div key={doc.id} className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                  {isImage(doc.fileType) ? (
                    <a href={doc.url} target="_blank" rel="noopener noreferrer">
                      <img src={doc.url} alt={doc.name} className="w-full h-28 object-cover hover:opacity-90 transition-opacity" />
                    </a>
                  ) : (
                    <a href={doc.url} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center justify-center h-28 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors gap-2">
                      <Paperclip className="w-8 h-8 text-slate-400 dark:text-slate-500" />
                      <span className="text-xs text-slate-400 dark:text-slate-500">View</span>
                    </a>
                  )}
                  <div className="p-2">
                    <div className="text-xs text-violet-600 dark:text-violet-400 font-medium">{doc.type}</div>
                    <div className="text-slate-800 dark:text-white text-xs truncate">{doc.name}</div>
                    {!readOnly && (
                      <button
                        onClick={() => deleteDoc(doc.id)}
                        className="flex items-center gap-1 text-red-500 dark:text-red-400 text-xs hover:text-red-600 dark:hover:text-red-300 transition-colors mt-1"
                      >
                        <Trash2 className="w-3 h-3" /> Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}