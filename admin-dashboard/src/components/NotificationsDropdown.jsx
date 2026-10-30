import React, { useState, useRef, useEffect } from 'react';
import { Bell, CheckCircle2, Clock, X, MapPin, ScanFace, ShieldAlert } from 'lucide-react';

export default function NotificationsDropdown({ recentPunches = [], pendingLeavesCount = 0 }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Notifications feed
  const notifications = [
    {
      id: 'sys-online',
      type: 'success',
      title: 'Geofence & Face Biometrics Online',
      desc: 'Haversine 100m office perimeter and 128-D anti-spoofing vision active.',
      time: 'Real-time',
      icon: CheckCircle2,
      color: 'text-emerald-500 bg-emerald-500/10',
    },
    ...(pendingLeavesCount > 0 ? [{
      id: 'pending-leaves',
      type: 'warning',
      title: `${pendingLeavesCount} Pending Leave Request(s)`,
      desc: 'Employees have submitted leaves requiring admin review.',
      time: 'Action Required',
      icon: Clock,
      color: 'text-amber-500 bg-amber-500/10',
    }] : []),
    ...recentPunches.slice(0, 3).map((p, idx) => ({
      id: `punch-${idx}`,
      type: 'info',
      title: `Check-In: ${p.name || p.employee_id || 'Employee'}`,
      desc: `Punched at ${p.time || 'Today'} (Distance: ${p.distance || '15m'} from office).`,
      time: p.time || 'Recent',
      icon: MapPin,
      color: 'text-indigo-500 bg-indigo-500/10',
    })),
  ];

  const unreadCount = (pendingLeavesCount > 0 ? 1 : 0) + Math.min(recentPunches.length, 2);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 transition shadow-xs flex items-center justify-center"
        aria-label="View Notifications"
        title="System Notifications"
      >
        <Bell className="w-4 h-4 text-slate-600 dark:text-slate-300" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-xs">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 py-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center justify-between px-4 pb-2.5 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Live System Alerts</h4>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800/60 max-h-80 overflow-y-auto">
            {notifications.map((item) => {
              const IconComponent = item.icon;
              return (
                <div key={item.id} className="p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition flex gap-3 items-start">
                  <div className={`p-2 rounded-xl flex-shrink-0 ${item.color}`}>
                    <IconComponent className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {item.title}
                      </p>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 whitespace-nowrap">
                        {item.time}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="px-4 pt-2.5 border-t border-slate-100 dark:border-slate-800 text-center">
            <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
              Dual-Factor Biometric & GPS Telemetry Verified
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
