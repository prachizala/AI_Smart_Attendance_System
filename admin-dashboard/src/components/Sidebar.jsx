import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  CalendarOff, 
  CreditCard, 
  ChevronLeft, 
  ChevronRight, 
  X,
  Sparkles
} from 'lucide-react';
import BrandLogo from './BrandLogo';

export default function Sidebar({ 
  activeTab, 
  setActiveTab, 
  isCollapsed, 
  setIsCollapsed, 
  mobileOpen, 
  setMobileOpen 
}) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, badge: null },
    { id: 'employees', label: 'Employees', icon: Users, badge: null },
    { id: 'leaves', label: 'Leave Requests', icon: CalendarOff, badge: null },
    { id: 'payroll', label: 'Academic Payroll', icon: CreditCard, badge: null },
  ];

  const handleSelect = (id) => {
    setActiveTab(id);
    if (mobileOpen) setMobileOpen(false);
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-300">
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3 overflow-hidden">
          <BrandLogo size="md" />
          {(!isCollapsed || mobileOpen) && (
            <div className="truncate">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-1.5 truncate">
                Smart Attendance
                <span className="text-[9px] uppercase font-bold tracking-widest bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800">
                  Admin
                </span>
              </h2>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
                Workforce & Biometrics
              </p>
            </div>
          )}
        </div>

        {/* Mobile close button */}
        {mobileOpen && (
          <button
            onClick={() => setMobileOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 lg:hidden"
            aria-label="Close Sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 px-3 py-5 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleSelect(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-xs transition-all duration-200 group relative ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/25 font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/80 dark:hover:bg-slate-800/60'
              } ${isCollapsed && !mobileOpen ? 'justify-center px-2' : ''}`}
              title={item.label}
            >
              <Icon
                className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 ${
                  isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400'
                }`}
              />

              {(!isCollapsed || mobileOpen) && (
                <span className="truncate flex-1 text-left">{item.label}</span>
              )}

              {/* Active Indicator Strip */}
              {isActive && isCollapsed && !mobileOpen && (
                <div className="absolute right-0 top-2 bottom-2 w-1 bg-white rounded-l-full" />
              )}
            </button>
          );
        })}
      </nav>

      {/* College Project Badge / System Status */}
      {(!isCollapsed || mobileOpen) && (
        <div className="p-3 mx-3 mb-3 bg-gradient-to-br from-indigo-50/70 to-teal-50/50 dark:from-slate-800/70 dark:to-indigo-950/40 rounded-2xl border border-indigo-100/80 dark:border-slate-700/60">
          <div className="flex items-center gap-2 mb-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
              BCA Minor Project
            </span>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
            FastAPI + OpenCV 128-D + Geofence 100m Authoritative System
          </p>
        </div>
      )}

      {/* Collapse Desktop Toggle Button */}
      <div className="hidden lg:flex items-center justify-end p-3 border-t border-slate-100 dark:border-slate-800">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          aria-label={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:block h-screen sticky top-0 z-30 transition-all duration-300 ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 lg:hidden transition-opacity"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Slide-out Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 w-72 z-50 lg:hidden transform transition-transform duration-300 ease-in-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
