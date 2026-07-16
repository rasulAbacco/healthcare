// client/src/pages/login/Login.jsx
// Replace your existing Login.jsx with this file.
//
// DEV MODE: the OTP step is disabled to match the backend (auth.controller.js
// currently has real OTP send/verify commented out too). Submitting phone +
// password now logs you in directly — no OTP screen, no code to type.
//
// TO RESTORE THE REAL OTP FLOW LATER:
//   1. In auth.controller.js, uncomment the "REAL OTP SEND" and
//      "REAL OTP VERIFY" blocks (and the otp.store.js / sms.service.js
//      imports) and remove the "DEV MODE" pass-through lines.
//   2. In this file, uncomment the "OTP STEP - DISABLED FOR DEV" block
//      inside handleSendOtp below, and remove the "DEV MODE" pass-through
//      call to handleVerifyOtp.
//
// Flow (when enabled): mobile number + password are submitted to
// /api/auth/send-otp, which verifies the password server-side and only then
// sends the OTP. The code is then submitted to /api/auth/verify-otp to
// finish logging in and get a token.
// Your AuthContext needs a way to store the token + user once we already
// have them (rather than making its own network call). If it doesn't have
// one yet, add something like this to AuthContext.jsx:
//
//   function setAuth(token, user) {
//     localStorage.setItem("token", token);
//     setUser(user);
//   }
//   // ...expose setAuth from the provider's value alongside login/logout
//
// This file assumes `useAuth()` exposes `setAuth(token, user)`. Adjust the
// import/usage below if your context names it differently.
import { useState, useRef } from "react";
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

const API_BASE = `${import.meta.env.VITE_API_URL || ""}/api`;

// Maps the uppercase role/module coming back from the server to the routes
// your app already uses.
function routeFor(role, module) {
  const r = String(role || "").toLowerCase();
  const m = String(module || "").toUpperCase();
  if (r === "receptionist" && m === "OPD") return "/opd-dashboard";
  if (r === "receptionist" && m === "IPD") return "/ipd-dashboard";
  if (r === "doctor" && m === "OPD") return "/doctor/opd/dashboard";
  if (r === "doctor" && m === "IPD") return "/doctor/ipd/dashboard";
  if (r === "pharmacy") return "/pharmacy-dashboard";
  return "/login";
}

export default function Login() {
  const [module, setModule] = useState("OPD");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState("phone"); // "phone" | "otp"
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const resendTimer = useRef(null);
  const { setAuth } = useAuth();
  const navigate = useNavigate();

  const startResendCountdown = (seconds = 60) => {
    setResendIn(seconds);
    clearInterval(resendTimer.current);
    resendTimer.current = setInterval(() => {
      setResendIn((s) => {
        if (s <= 1) {
          clearInterval(resendTimer.current);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");

    if (!module) return setError("Please select an administration module first.");
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10) return setError("Please enter a valid 10-digit mobile number.");
    if (!password) return setError("Please enter your password.");

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: digits, password, module: module.toUpperCase() }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Could not send OTP. Please try again.");
        setLoading(false);
        return;
      }

      /* ===================== OTP STEP — DISABLED FOR DEV ==================
         Uncomment this block (and delete the DEV MODE call below it) to
         restore showing the OTP-entry screen after send-otp succeeds.

      setStep("otp");
      setInfo("A 6-digit code has been sent to your mobile number.");
      startResendCountdown(60);
      setLoading(false);
      ======================================================================== */

      // DEV MODE: backend doesn't actually verify an OTP right now, so skip
      // the OTP screen and finish login immediately with a placeholder code.
      await devAutoVerify(digits);
    } catch {
      setError("Network error. Please check your connection and try again.");
      setLoading(false);
    }
  };

  // DEV MODE ONLY: calls verify-otp right away with a placeholder code since
  // the backend isn't checking it. Remove this function when you restore the
  // real OTP flow above.
  const devAutoVerify = async (digits) => {
    try {
      const res = await fetch(`${API_BASE}/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: digits, otp: "000000", module: module.toUpperCase() }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Could not log in.");
        return;
      }

      try {
        setAuth(data.token, data.user, module.toUpperCase());
        navigate(routeFor(data.user.role, module.toUpperCase()));
      } catch (authErr) {
        console.error("setAuth/navigate failed after dev auto-login:", authErr);
        setError("Signed in, but couldn't start your session. Please refresh and try again.");
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendIn > 0) return;
    setError("");
    setInfo("");
    setLoading(true);
    try {
      const digits = phone.replace(/\D/g, "");
      const res = await fetch(`${API_BASE}/auth/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: digits, password, module: module.toUpperCase() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Could not resend OTP.");
      } else {
        setInfo("A new code has been sent.");
        startResendCountdown(60);
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError("");
    setInfo("");

    if (otp.trim().length !== 6) return setError("Enter the 6-digit code sent to your phone.");

    setLoading(true);
    try {
      const digits = phone.replace(/\D/g, "");
      const res = await fetch(`${API_BASE}/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: digits, otp: otp.trim(), module: module.toUpperCase() }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Invalid or expired code.");
      } else {
        try {
          setAuth(data.token, data.user, module.toUpperCase());
          navigate(routeFor(data.user.role, module.toUpperCase()));
        } catch (authErr) {
          console.error("setAuth/navigate failed after OTP verification:", authErr);
          setError("Signed in, but couldn't start your session. Please refresh and try again.");
        }
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const changeNumber = () => {
    setStep("phone");
    setOtp("");
    setPassword("");
    setError("");
    setInfo("");
    clearInterval(resendTimer.current);
    setResendIn(0);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 relative flex items-center justify-center p-4 overflow-hidden font-sans transition-colors duration-300">
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-teal-200/40 dark:bg-teal-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-blue-200/50 dark:bg-blue-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-60 dark:opacity-40" />

      <div className="w-full max-w-[480px] relative z-10">
        <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white dark:bg-slate-900 shadow-[0_8px_30px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.3)] border border-slate-100 dark:border-slate-800 mb-4 overflow-hidden transition-transform duration-300 hover:scale-105">
          <img
            src="/healthcare.jpg"
            alt="MediCore Logo"
            className="w-full h-full object-cover"
          />
        </div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">Virupakshipuram Paralysis Centre</h1>
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
                  disabled={step === "otp"}
                  onClick={() => { setModule(m.id); setError(""); }}
                  className={`flex flex-col items-center justify-center py-3 px-2 rounded-xl font-semibold text-sm transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed ${
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

          {step === "phone" ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1.5">Mobile Number</label>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={phone}
                  onChange={e => { setPhone(e.target.value); setError(""); }}
                  placeholder="98765 43210"
                  maxLength={10}
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
                  autoComplete="current-password"
                  className="w-full bg-slate-50/50 dark:bg-slate-950/30 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-100 placeholder-slate-400/70 dark:placeholder-slate-600 focus:outline-none focus:border-teal-500 dark:focus:border-teal-500 focus:bg-white dark:focus:bg-slate-950 focus:shadow-[0_0_0_4px_rgba(20,184,166,0.1)] dark:focus:shadow-[0_0_0_4px_rgba(20,184,166,0.05)] transition-all duration-200 text-sm"
                />
              </div>

              {error && <ErrorBanner text={error} />}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-950 font-bold text-sm py-3.5 rounded-xl transition-all duration-200 shadow-md hover:shadow-xl active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed mt-2 flex items-center justify-center tracking-wide"
              >
                {loading ? <Spinner label="Signing in..." /> : (
                  <span className="flex items-center gap-1">
                    Sign In
                    <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </span>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Enter OTP</label>
                <button type="button" onClick={changeNumber} className="text-[11px] font-semibold text-teal-600 dark:text-teal-400 hover:underline">
                  Change number
                </button>
              </div>
              <input
                type="text"
                inputMode="numeric"
                value={otp}
                onChange={e => { setOtp(e.target.value.replace(/\D/g, "").slice(0, 6)); setError(""); }}
                placeholder="••••••"
                maxLength={6}
                className="w-full text-center tracking-[0.5em] font-bold text-lg bg-slate-50/50 dark:bg-slate-950/30 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-100 placeholder-slate-400/70 dark:placeholder-slate-600 focus:outline-none focus:border-teal-500 dark:focus:border-teal-500 focus:bg-white dark:focus:bg-slate-950 focus:shadow-[0_0_0_4px_rgba(20,184,166,0.1)] dark:focus:shadow-[0_0_0_4px_rgba(20,184,166,0.05)] transition-all duration-200"
              />

              <p className="text-xs text-slate-500 dark:text-slate-400">
                Code sent to <span className="font-semibold text-slate-700 dark:text-slate-200">{phone}</span>.{" "}
                {resendIn > 0 ? (
                  <span>Resend in {resendIn}s</span>
                ) : (
                  <button type="button" onClick={handleResendOtp} className="font-semibold text-teal-600 dark:text-teal-400 hover:underline">
                    Resend code
                  </button>
                )}
              </p>

              {info && !error && <InfoBanner text={info} />}
              {error && <ErrorBanner text={error} />}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-950 font-bold text-sm py-3.5 rounded-xl transition-all duration-200 shadow-md hover:shadow-xl active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed mt-2 flex items-center justify-center tracking-wide"
              >
                {loading ? <Spinner label="Verifying..." /> : (
                  <span className="flex items-center gap-1">
                    Secure Sign In
                    <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </span>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function Spinner({ label }) {
  return (
    <span className="flex items-center justify-center gap-2.5">
      <svg className="animate-spin h-4 w-4 text-current" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
      </svg>
      {label}
    </span>
  );
}

function ErrorBanner({ text }) {
  return (
    <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-xl px-4 py-3 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2.5 animate-fadeIn">
      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      <span className="font-medium">{text}</span>
    </div>
  );
}

function InfoBanner({ text }) {
  return (
    <div className="bg-teal-50 dark:bg-teal-950/20 border border-teal-100 dark:border-teal-900/30 rounded-xl px-4 py-3 text-teal-700 dark:text-teal-400 text-xs flex items-center gap-2.5 animate-fadeIn">
      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span className="font-medium">{text}</span>
    </div>
  );
}