// client/src/pages/ipd/IPDFollowUps.jsx
import { useState, useEffect } from "react";
import { PageHeader, SearchBar, StatusBadge, EmptyState, Pagination } from "../../components/UI";
import { CalendarClock, Phone, Clock, CheckCircle2, Bell, MessageCircle, Users, AlertCircle, Loader2, BedDouble } from "lucide-react";
import { fetchFollowUps, updatePatient } from "./api/ipd.api";

const followUpStatusColors = {
  Pending:   "bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20",
  Completed: "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20",
  Missed:    "bg-red-50 dark:bg-red-500/15 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/20",
};

const reminderStatusColors = {
  Pending: "bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20",
  Sent:    "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20",
  Failed:  "bg-red-50 dark:bg-red-500/15 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/20",
};

// converts a backend date ("2026-07-13T00:00:00.000Z" or "2026-07-13") to plain "YYYY-MM-DD" for string comparisons
const toDateStr = (d) => (d ? new Date(d).toISOString().split("T")[0] : "");

export default function IPDFollowUps() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [savingId, setSavingId] = useState(null);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("followups");
  const [followUpsPage, setFollowUpsPage] = useState(1);
  const FOLLOWUPS_PER_PAGE = 10;

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError("");
      try {
        // Only patients with a follow-up date are relevant on this page.
        const { patients: data } = await fetchFollowUps();
        setPatients(data.map(p => ({ ...p, followUpDate: toDateStr(p.followUpDate) })));
      } catch (err) {
        setError(err.message || "Could not load follow-ups.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const withFollowUp = patients
    .filter(p => p.followUpDate && p.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => new Date(a.followUpDate) - new Date(b.followUpDate));

  // Follow-Ups tab only shows records still awaiting action — Completed/Missed
  // ones are done and don't need to keep cluttering this view.
  const pendingFollowUps = withFollowUp.filter(p => p.followUpStatus === "Pending");
  const pendingTotalPages = Math.ceil(pendingFollowUps.length / FOLLOWUPS_PER_PAGE) || 1;
  const safeFollowUpsPage = Math.min(followUpsPage, pendingTotalPages);
  const pendingPaginated = pendingFollowUps.slice(
    (safeFollowUpsPage - 1) * FOLLOWUPS_PER_PAGE,
    safeFollowUpsPage * FOLLOWUPS_PER_PAGE
  );

  // Incoming = today + next 7 days
  const next7 = new Date();
  next7.setDate(next7.getDate() + 7);
  const incomingPatients = patients
    .filter(p => p.followUpDate && p.followUpDate >= today && new Date(p.followUpDate) <= next7)
    .sort((a, b) => new Date(a.followUpDate) - new Date(b.followUpDate));

  // Reminders
  const pendingReminders = patients.filter(p => p.reminderEnabled && p.reminderStatus === "Pending" && p.followUpDate >= today);

  const updateFollowUpStatus = async (patientId, status) => {
    setSavingId(patientId);
    setError("");
    try {
      const current = patients.find(p => p.id === patientId);
      const updated = await updatePatient(patientId, { ...current, followUpStatus: status });
      setPatients(ps => ps.map(p => p.id === patientId ? { ...updated, followUpDate: toDateStr(updated.followUpDate) } : p));
    } catch (err) {
      setError(err.message || "Could not update status.");
    } finally {
      setSavingId(null);
    }
  };

  const markReminderSent = async (patientId) => {
    setSavingId(patientId);
    setError("");
    try {
      const current = patients.find(p => p.id === patientId);
      const updated = await updatePatient(patientId, {
        ...current,
        reminderStatus: "Sent",
        reminderSentDate: today,
      });
      setPatients(ps => ps.map(p => p.id === patientId ? { ...updated, followUpDate: toDateStr(updated.followUpDate) } : p));
    } catch (err) {
      setError(err.message || "Could not mark reminder as sent.");
    } finally {
      setSavingId(null);
    }
  };

  const tabs = [
    { key: "followups",  label: "Follow-Ups",      icon: CalendarClock, count: pendingFollowUps.length },
    { key: "incoming",   label: "Incoming",         icon: Users,         count: incomingPatients.length },
    { key: "reminders",  label: "Reminders",        icon: Bell,          count: pendingReminders.length },
  ];

  const Card = ({ p }) => {
    const isToday = p.followUpDate === today;
    const isPast  = p.followUpDate < today;
    const isSaving = savingId === p.id;
    return (
      <div className={`bg-white dark:bg-slate-900 border rounded-2xl p-4 flex gap-4 transition-all shadow-sm dark:shadow-none ${
        isToday ? "border-amber-300 dark:border-amber-500/40 bg-amber-50/30 dark:bg-amber-500/5"
        : isPast ? "border-slate-200 dark:border-slate-800 opacity-70"
        : "border-slate-200 dark:border-slate-800"
      }`}>
        <div className="flex-shrink-0">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
            isPast
              ? "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
              : "bg-violet-50 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 border border-violet-100 dark:border-transparent"
          }`}>
            {p.name[0]}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-mono text-xs text-violet-600 dark:text-violet-400 font-bold">{p.serialNumber}</span>
            <span className="text-slate-800 dark:text-white font-semibold text-sm">{p.name}</span>
            <StatusBadge status={p.condition} />
            {p.status === "Admitted" && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-violet-50 dark:bg-violet-500/15 text-violet-700 dark:text-violet-400 border border-violet-200 dark:border-violet-500/20 flex items-center gap-1">
                <BedDouble className="w-3 h-3" /> Admitted
              </span>
            )}
            {isToday && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 font-medium border border-amber-200 dark:border-amber-500/30 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Today
              </span>
            )}
            {isPast && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Past
              </span>
            )}
            {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />}
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400 mb-2">
            <span className="flex items-center gap-1"><CalendarClock className="w-3.5 h-3.5" />{p.followUpDate}</span>
            {p.phone && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{p.phone}</span>}
          </div>
          {p.followUpDesc && (
            <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed bg-slate-50 dark:bg-slate-800/50 rounded-lg px-3 py-2 border border-slate-100 dark:border-slate-800 mb-2 break-words">
              {p.followUpDesc}
            </p>
          )}
          {/* Follow-Up Status Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-slate-400 dark:text-slate-500">Status:</span>
            {["Pending", "Completed", "Missed"].map(s => (
              <button
                key={s}
                disabled={isSaving}
                onClick={() => updateFollowUpStatus(p.id, s)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all disabled:opacity-60 ${
                  p.followUpStatus === s
                    ? followUpStatusColors[s]
                    : "bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const IncomingCard = ({ p }) => {
    const isToday = p.followUpDate === today;
    return (
      <div className={`bg-white dark:bg-slate-900 border rounded-2xl p-4 flex items-center gap-4 shadow-sm dark:shadow-none transition-all ${
        isToday ? "border-amber-300 dark:border-amber-500/40" : "border-slate-200 dark:border-slate-800"
      }`}>
        <div className="w-10 h-10 rounded-full bg-violet-50 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 flex items-center justify-center font-bold text-sm border border-violet-100 dark:border-transparent flex-shrink-0">
          {p.name[0]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs text-violet-600 dark:text-violet-400 font-bold">{p.serialNumber}</span>
            <span className="text-slate-800 dark:text-white font-semibold text-sm">{p.name}</span>
            {isToday && <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 font-medium border border-amber-200 dark:border-amber-500/30">Today</span>}
          </div>
          <div className="flex items-center gap-4 mt-1 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
            {p.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{p.phone}</span>}
            <span className="flex items-center gap-1"><CalendarClock className="w-3 h-3" />{p.followUpDate}</span>
            <StatusBadge status={p.condition} />
          </div>
        </div>
      </div>
    );
  };

  const ReminderCard = ({ p }) => {
    const isSaving = savingId === p.id;
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-4 shadow-sm dark:shadow-none">
        <div className="w-10 h-10 rounded-full bg-violet-50 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 flex items-center justify-center font-bold text-sm border border-violet-100 dark:border-transparent flex-shrink-0">
          {p.name[0]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-mono text-xs text-violet-600 dark:text-violet-400 font-bold">{p.serialNumber}</span>
            <span className="text-slate-800 dark:text-white font-semibold text-sm">{p.name}</span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${reminderStatusColors[p.reminderStatus] || reminderStatusColors["Pending"]}`}>
              {p.reminderStatus}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
            {p.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{p.phone}</span>}
            <span className="flex items-center gap-1"><CalendarClock className="w-3 h-3" />{p.followUpDate}</span>
          </div>
          {p.followUpDesc && <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 line-clamp-1">{p.followUpDesc}</p>}
        </div>
        <div className="flex gap-2 flex-shrink-0">
          {p.phone && (
            <a
              href={`https://wa.me/91${p.phone}?text=Dear ${encodeURIComponent(p.name)}, your follow-up is scheduled on ${p.followUpDate}. ${encodeURIComponent(p.followUpDesc || "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 hover:bg-emerald-100 dark:hover:bg-emerald-500/30 transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
            </a>
          )}
          <button
            disabled={isSaving}
            onClick={() => markReminderSent(p.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-violet-50 dark:bg-violet-500/20 text-violet-700 dark:text-violet-400 border border-violet-200 dark:border-violet-500/30 hover:bg-violet-100 dark:hover:bg-violet-500/30 transition-colors disabled:opacity-60"
          >
            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            Mark Sent
          </button>
        </div>
      </div>
    );
  };

  return (
    <div>
      <PageHeader title="IPD Follow-Up Management" subtitle="Scheduled inpatient follow-ups & reminders" />

      {error && (
        <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-xl px-4 py-3 text-rose-600 dark:text-rose-400 text-sm font-medium mb-4">
          {error}
        </div>
      )}

      {/* Tab switcher */}
      <div className="flex items-center gap-1 mb-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-1 w-fit max-w-full overflow-x-auto shadow-sm dark:shadow-none">
        {tabs.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all flex-shrink-0 ${
                activeTab === t.key
                  ? "bg-violet-50 dark:bg-violet-500/20 text-violet-700 dark:text-violet-400 border border-violet-200 dark:border-violet-500/20"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{t.label}</span>
              {t.count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                  activeTab === t.key
                    ? "bg-violet-100 dark:bg-violet-500/30 text-violet-700 dark:text-violet-300"
                    : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
                }`}>
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mb-5">
        <SearchBar value={search} onChange={s => { setSearch(s); setFollowUpsPage(1); }} placeholder="Search patient..." />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="flex items-center gap-3 text-slate-400 dark:text-slate-500 text-sm font-medium">
            <Loader2 className="w-5 h-5 animate-spin" /> Loading follow-ups...
          </div>
        </div>
      ) : (
        <>
          {/* Follow-Ups Tab — Pending only, 10 per page */}
          {activeTab === "followups" && (
            <>
              {pendingFollowUps.length === 0 ? (
                <EmptyState icon={CalendarClock} message="No pending follow-ups" />
              ) : (
                <>
                  <div className="space-y-3">{pendingPaginated.map(p => <Card key={p.id} p={p} />)}</div>
                  <div className="mt-4">
                    <Pagination current={safeFollowUpsPage} total={pendingTotalPages} onPageChange={setFollowUpsPage} />
                  </div>
                </>
              )}
            </>
          )}

          {/* Incoming Patients Tab */}
          {activeTab === "incoming" && (
            <>
              {incomingPatients.length === 0 ? (
                <EmptyState icon={Users} message="No incoming follow-ups in next 7 days" />
              ) : (
                <div>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">
                    Patients with follow-up scheduled within the next 7 days, sorted by nearest date.
                  </p>
                  <div className="space-y-3">
                    {incomingPatients.map(p => <IncomingCard key={p.id} p={p} />)}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Reminders Tab */}
          {activeTab === "reminders" && (
            <>
              {pendingReminders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <CheckCircle2 className="w-12 h-12 text-emerald-400 dark:text-emerald-500" strokeWidth={1.5} />
                  <p className="text-slate-500 dark:text-slate-400 font-medium">No pending reminders</p>
                </div>
              ) : (
                <div>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mb-4 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Click "WhatsApp" to send reminder or "Mark Sent" to update status.
                  </p>
                  <div className="space-y-3">
                    {pendingReminders.map(p => <ReminderCard key={p.id} p={p} />)}
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}