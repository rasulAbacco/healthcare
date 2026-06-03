// client/src/components/Layout.jsx
import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { Sun, Moon } from "lucide-react";

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const { user } = useAuth();
  const { dark, toggle } = useTheme();

  return (
    <div className="flex min-h-screen overflow-x-hidden bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />

      {/* Main content — offset only on lg+ where sidebar is fixed */}
<div
  className={`flex-1 min-w-0 flex flex-col transition-all duration-300 overflow-x-hidden ${
    collapsed ? "lg:ml-[68px]" : "lg:ml-64"
  }`}
>
        {/* Top Navbar */}
        <header className="h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 sticky top-0 z-20 transition-colors duration-300">
          {/* Left: spacer for mobile hamburger + status */}
          <div className="flex items-center gap-3">
            {/* Spacer so hamburger (fixed) doesn't overlap text */}
            <div className="w-9 lg:hidden" />
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-slate-500 dark:text-slate-400 text-sm font-medium hidden sm:block">
                System Online
              </span>
            </div>
          </div>

          {/* Right: date, role badge, theme toggle */}
          <div className="flex items-center gap-3">
            <span className="text-slate-400 dark:text-slate-500 text-sm hidden md:block">
              {new Date().toLocaleDateString("en-IN", {
                weekday: "short",
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>

            {user && (
              <div
                className={`text-xs font-semibold px-3 py-1.5 rounded-full border hidden sm:flex items-center gap-1.5 ${
                  user.role === "doctor"
                    ? "bg-violet-50 dark:bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-500/20"
                    : "bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/20"
                }`}
              >
                <span>{user.role === "doctor" ? "👨‍⚕️" : "💼"}</span>
                <span className="capitalize">{user.role}</span>
              </div>
            )}

            <button
              onClick={toggle}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-white transition-all duration-200"
              title={dark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </header>

        <main className="flex-1 min-w-0 p-4 sm:p-6 overflow-y-auto overflow-x-hidden bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
          <Outlet />
        </main>
      </div>
    </div>
  );
}