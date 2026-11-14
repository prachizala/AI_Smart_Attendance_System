import React from 'react';
import { RefreshCw, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from './ThemeToggle';
import BrandLogo from './BrandLogo';

export default function Navbar({ activeTab, setActiveTab, onRefresh, isRefreshing }) {
  const { user, logout } = useAuth();

  const tabs = [
    { id: 'dashboard', label: 'Overview' },
    { id: 'employees', label: 'Employees' },
    { id: 'leaves', label: 'Leave Requests' },
    { id: 'payroll', label: 'Academic Payroll' },
  ];

  return (
    <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50 shadow-xs transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
        <div className="flex items-center gap-3">
          <BrandLogo size="lg" />
          <div>
            <h1 className="text-base font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              Smart Attendance
              <span className="text-[10px] uppercase font-bold tracking-widest bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
                Admin
              </span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">College Minor Project BCA (Bachelor of Computer Applications)</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-700/60'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Action Controls: ThemeToggle, User Profile Badge, Sync Button, Logout Button */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Theme Toggle Sun / Moon */}
          <ThemeToggle />

          {/* Admin Identity Badge */}
          {user && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <div className="flex flex-col text-left">
                <span className="font-bold text-slate-800 dark:text-slate-100 leading-tight">
                  {user.full_name || user.employee_id}
                </span>
                <span className="text-[10px] text-indigo-600 dark:text-indigo-400 uppercase tracking-wider font-semibold">
                  {user.designation || 'Administrator'}
                </span>
              </div>
            </div>
          )}

          {/* Refresh / Sync button */}
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium border border-slate-200 dark:border-slate-700 transition shadow-xs disabled:opacity-50"
            title="Refresh Real-Time Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-indigo-600 dark:text-indigo-400' : ''}`} />
            <span className="hidden sm:inline">Sync</span>
          </button>

          {/* Logout Button */}
          <button
            onClick={() => logout()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 dark:bg-red-950/60 hover:bg-red-100 dark:hover:bg-red-900/60 text-red-600 dark:text-red-400 text-xs font-semibold border border-red-200 dark:border-red-800 transition shadow-xs"
            title="Sign Out of Admin Portal"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}
