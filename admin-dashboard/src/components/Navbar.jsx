import React from 'react';
import { ShieldCheck, RefreshCw, LogOut, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar({ activeTab, setActiveTab, onRefresh, isRefreshing }) {
  const { user, logout } = useAuth();

  const tabs = [
    { id: 'dashboard', label: 'Overview' },
    { id: 'employees', label: 'Employees' },
    { id: 'leaves', label: 'Leave Requests' },
    { id: 'payroll', label: 'Academic Payroll' },
  ];

  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              Smart Attendance
              <span className="text-[10px] uppercase font-bold tracking-widest bg-sky-500/20 text-sky-300 px-2 py-0.5 rounded-full border border-sky-500/30">
                Admin
              </span>
            </h1>
            <p className="text-xs text-slate-400">College Minor Project BCA (Bachelor of Computer Applications)</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === tab.id
                  ? 'bg-sky-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Action Controls: User Profile Badge, Sync Button, Logout Button */}
        <div className="flex items-center gap-3">
          {/* Admin Identity Badge */}
          {user && (
            <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-slate-950/80 border border-slate-800 rounded-xl text-xs">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <div className="flex flex-col text-left">
                <span className="font-bold text-slate-200 leading-tight">
                  {user.full_name || user.employee_id}
                </span>
                <span className="text-[10px] text-sky-400 uppercase tracking-wider font-semibold">
                  {user.designation || 'Administrator'}
                </span>
              </div>
            </div>
          )}

          {/* Refresh / Sync button */}
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition"
            title="Refresh Real-Time Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Sync</span>
          </button>

          {/* Logout Button */}
          <button
            onClick={() => logout()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold border border-rose-500/30 transition shadow-sm"
            title="Sign Out of Admin Portal"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}
