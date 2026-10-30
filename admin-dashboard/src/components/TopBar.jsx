import React, { useState } from 'react';
import { 
  Menu, 
  Search, 
  RefreshCw, 
  LogOut, 
  User, 
  ChevronDown, 
  ShieldCheck,
  Check
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from './ThemeToggle';
import LanguageSelector from './LanguageSelector';

export default function TopBar({ 
  onMenuClick, 
  onRefresh, 
  isRefreshing, 
  searchQuery, 
  setSearchQuery 
}) {
  const { user, logout } = useAuth();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  return (
    <header className="h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20 transition-colors duration-300">
      <div className="h-full px-4 sm:px-6 flex items-center justify-between gap-4">
        {/* Left: Mobile Menu Toggle & Search Bar */}
        <div className="flex items-center gap-3 flex-1 max-w-lg">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            aria-label="Open Navigation Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Quick Search Bar */}
          <div className="relative w-full">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchQuery || ''}
              onChange={(e) => setSearchQuery && setSearchQuery(e.target.value)}
              placeholder="Search employee, records, ID..."
              className="w-full bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 rounded-xl pl-10 pr-4 py-2 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:bg-white dark:focus:bg-slate-900 transition shadow-xs"
            />
          </div>
        </div>

        {/* Right Controls: Sync, ThemeToggle, Profile Avatar Dropdown, Logout */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Refresh / Sync Button */}
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-300 text-xs font-semibold border border-slate-200/80 dark:border-slate-700 transition shadow-xs disabled:opacity-50"
            title="Refresh Real-Time Data"
            aria-label="Sync Real-Time Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-indigo-600 dark:text-indigo-400' : ''}`} />
            <span className="hidden sm:inline">Sync</span>
          </button>

          {/* Language Selector */}
          <LanguageSelector compact />

          {/* Theme Toggle Sun / Moon */}
          <ThemeToggle />

          {/* Profile Badge & Dropdown */}
          <div className="relative">
            <button
              onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-slate-100/80 hover:bg-slate-200/70 dark:bg-slate-800/80 dark:hover:bg-slate-700/70 border border-slate-200/80 dark:border-slate-700 text-left transition shadow-xs focus:outline-none"
              aria-label="Admin Profile Menu"
            >
              {/* Avatar circle */}
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-600 to-indigo-700 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'A'}
              </div>

              <div className="hidden md:flex flex-col">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100 leading-tight truncate max-w-[120px]">
                  {user?.full_name || user?.employee_id || 'Admin'}
                </span>
                <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold uppercase tracking-wider">
                  {user?.designation || 'Administrator'}
                </span>
              </div>

              <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
            </button>

            {/* Profile Dropdown Menu */}
            {profileDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setProfileDropdownOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl py-2 z-40 transition-all">
                  <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-700">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {user?.full_name || 'System Administrator'}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate">
                      {user?.employee_id || 'ADMIN01'}
                    </p>
                  </div>

                  <div className="px-2 py-1.5">
                    <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-600 dark:text-slate-300">
                      <ShieldCheck className="w-4 h-4 text-emerald-500" />
                      <span>Role: Administrator</span>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 dark:border-slate-700 pt-1.5 px-2">
                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
