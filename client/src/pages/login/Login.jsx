// client/src/pages/login/Login.jsx
// Replace your existing Login.jsx with this file
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const MODULES = [
  {
    id: "OPD",
    label: "Outpatient",
    icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
  },
  {
    id: "IPD",
    label: "Inpatient",
    icon: "M19 16v1a1 1 0 01-1 1H6a1 1 0 01-1-1v-1m14-4v2m-14-2v2m14-5V7a2 2 0 00-2-2H6a2 2 0 00-2 2v3m16 0h-2M4 10h2m11 4H7",
  },
  {
    id: "Pharmacy",
    label: "Pharmacy",
    icon: "M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z",
  },
];

export default function Login() {
  const [module, setModule] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    if (!module) { setError("Please select an administration module first."); return; }
    setLoading(true);
    setTimeout(() => {
      const result = login(username, password, module);
      if (result.success) {
        if (result.role === "receptionist" && result.module === "OPD") navigate("/opd-dashboard");
        else if (result.role === "receptionist" && result.module === "IPD") navigate("/ipd-dashboard");
        else if (result.role === "doctor" && result.module === "OPD") navigate("/doctor/opd");
        else if (result.role === "doctor" && result.module === "IPD") navigate("/doctor/ipd");
        else if (result.role === "pharmacy") navigate("/pharmacy-dashboard");
      } else {
        setError("Invalid credentials. Please verify your identity and try again.");
        setLoading(false);
      }
    }, 600);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 relative flex items-center justify-center p-4 overflow-hidden font-sans transition-colors duration-300">
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-teal-200/40 dark:bg-teal-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-blue-200/50 dark:bg-blue-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-60 dark:opacity-40" />

      <div className="w-full max-w-[480px] relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white dark:bg-slate-900 shadow-[0_8px_30px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)] border border-slate-100 dark:border-slate-800 mb-4 transition-transform duration-300 hover:scale-105">
            <svg className="w-7 h-7 text-teal-600 dark:text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 10.5V20a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-9.5m14 0V9a2 2 0 0 0-2-2h-3.5M19 10.5h-3.5m-7 0H5m4 0V9a2 2 0 0 1 2-2h3.5m-5.5 3.5H13m-4 4h5m-5 4h3" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">MediCore</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium mt-1 text-sm tracking-wide uppercase">Hospital Management System</p>
        </div>

        <div className="bg-white/70 dark:bg-slate-900/40 backdrop-blur-md border border-white/80 dark:border-slate-800/80 rounded-[32px] p-8 shadow-[0_24px_70px_rgba(0,0,0,0.02)] dark:shadow-[0_24px_70px_rgba(0,0,0,0.4)] transition-all duration-300">
          <div className="mb-6">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-3">Select Context</label>
            <div className="grid grid-cols-3 gap-2.5 p-1.5 bg-slate-100/80 dark:bg-slate-950/60 rounded-2xl border border-slate-200/40 dark:border-slate-800/40">
              {MODULES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => { setModule(m.id); setError(""); }}
                  className={`flex flex-col items-center justify-center py-3 px-2 rounded-xl font-semibold text-sm transition-all duration-300 ${
                    module === m.id
                      ? "bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.2)] border border-slate-200/50 dark:border-slate-700/50 scale-[1.02]"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 border border-transparent"
                  }`}
                >
                  <svg className={`w-5 h-5 mb-1 ${module === m.id ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400 dark:text-slate-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={m.icon} />
                  </svg>
                  <span className="text-[10px] font-bold tracking-wide">{m.id}</span>
                  <span className="text-[9px] font-medium opacity-60 font-mono tracking-tight mt-0.5">{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1.5">Username</label>
              <input
                type="text"
                value={username}
                onChange={e => { setUsername(e.target.value); setError(""); }}
                placeholder="Enter your username"
                className="w-full bg-slate-50/50 dark:bg-slate-950/30 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-100 placeholder-slate-400/70 dark:placeholder-slate-600 focus:outline-none focus:border-teal-500 dark:focus:border-teal-500 focus:bg-white dark:focus:bg-slate-950 focus:shadow-[0_0_0_4px_rgba(20,184,166,0.1)] dark:focus:shadow-[0_0_0_4px_rgba(20,184,166,0.05)] transition-all duration-200 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => { setPassword(e.target.value); setError(""); }}
                placeholder="••••••••"
                className="w-full bg-slate-50/50 dark:bg-slate-950/30 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-100 placeholder-slate-400/70 dark:placeholder-slate-600 focus:outline-none focus:border-teal-500 dark:focus:border-teal-500 focus:bg-white dark:focus:bg-slate-950 focus:shadow-[0_0_0_4px_rgba(20,184,166,0.1)] dark:focus:shadow-[0_0_0_4px_rgba(20,184,166,0.05)] transition-all duration-200 text-sm"
              />
            </div>

            {error && (
              <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-xl px-4 py-3 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2.5 animate-fadeIn">
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span className="font-medium">{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-950 font-bold text-sm py-3.5 rounded-xl transition-all duration-200 shadow-md hover:shadow-xl active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed mt-2 flex items-center justify-center tracking-wide"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2.5">
                  <svg className="animate-spin h-4 w-4 text-current" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                  Authenticating...
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  Secure Sign In
                  <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </span>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800/60">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 text-center mb-3">System Sandbox Access</p>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/40 rounded-xl p-2.5">
                <div className="text-slate-700 dark:text-slate-300 font-bold mb-0.5 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> Reception
                </div>
                <div className="text-slate-400 dark:text-slate-500 font-mono text-[10px]">receptionist / 123</div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/40 rounded-xl p-2.5">
                <div className="text-slate-700 dark:text-slate-300 font-bold mb-0.5 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span> Doctor
                </div>
                <div className="text-slate-400 dark:text-slate-500 font-mono text-[10px]">doctor / 123</div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/40 rounded-xl p-2.5">
                <div className="text-slate-700 dark:text-slate-300 font-bold mb-0.5 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Pharmacy
                </div>
                <div className="text-slate-400 dark:text-slate-500 font-mono text-[10px]">pharmacy / 123</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}