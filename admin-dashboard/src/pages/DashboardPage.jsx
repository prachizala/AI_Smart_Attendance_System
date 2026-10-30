import React from 'react';
import { Users, UserCheck, Clock, UserX, CalendarOff, MapPin, CheckCircle2, XCircle } from 'lucide-react';

export default function DashboardPage({ stats, todayLogs, isLoading }) {
  const cards = [
    {
      title: 'Total Employees',
      value: stats?.total_employees || 0,
      icon: Users,
      bg: 'bg-indigo-50/70 dark:bg-indigo-950/40',
      border: 'border-indigo-100 dark:border-indigo-900/60',
      iconColor: 'text-indigo-600 dark:text-indigo-400',
    },
    {
      title: 'Present Today',
      value: stats?.present_today || 0,
      icon: UserCheck,
      bg: 'bg-emerald-50/70 dark:bg-emerald-950/40',
      border: 'border-emerald-100 dark:border-emerald-900/60',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      title: 'Late Arrivals',
      value: stats?.late_today || 0,
      icon: Clock,
      bg: 'bg-amber-50/70 dark:bg-amber-950/40',
      border: 'border-amber-100 dark:border-amber-900/60',
      iconColor: 'text-amber-600 dark:text-amber-400',
    },
    {
      title: 'On Approved Leave',
      value: stats?.on_leave_today || 0,
      icon: CalendarOff,
      bg: 'bg-purple-50/70 dark:bg-purple-950/40',
      border: 'border-purple-100 dark:border-purple-900/60',
      iconColor: 'text-purple-600 dark:text-purple-400',
    },
    {
      title: 'Absent / Unreported',
      value: stats?.absent_today || 0,
      icon: UserX,
      bg: 'bg-rose-50/70 dark:bg-rose-950/40',
      border: 'border-rose-100 dark:border-rose-900/60',
      iconColor: 'text-rose-600 dark:text-rose-400',
    },
  ];

  return (
    <div className="space-y-6 transition-colors duration-300">
      {/* Metric Counters Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {cards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div
              key={i}
              className={`${card.bg} border ${card.border} rounded-3xl p-5 shadow-xs relative overflow-hidden`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {card.title}
                </span>
                <div className={`p-2 rounded-xl bg-white/80 dark:bg-slate-800/80 shadow-xs ${card.iconColor}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                  {card.value}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Real-time Daily Attendance Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Today's Real-Time Attendance Log</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Live timestamps with verified 128-D OpenCV face embeddings and Haversine GPS distances.
            </p>
          </div>
          <span className="text-xs bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 px-3 py-1 rounded-full border border-indigo-200 dark:border-indigo-800 font-mono font-medium">
            Radius Threshold: 100m
          </span>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-sm text-slate-700 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 text-xs uppercase font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Check-In</th>
                <th className="py-3 px-4">Check-Out</th>
                <th className="py-3 px-4">Face Check</th>
                <th className="py-3 px-4">GPS Geofence</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
              {todayLogs && todayLogs.length > 0 ? (
                todayLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50 transition">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 dark:text-white">{log.employee_name || 'Employee'}</div>
                      <div className="text-xs text-slate-400 dark:text-slate-500 font-mono">{log.employee_id}</div>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-700 dark:text-slate-300">
                      {log.check_in ? new Date(log.check_in).toLocaleTimeString() : '--:--'}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-700 dark:text-slate-300">
                      {log.check_out ? new Date(log.check_out).toLocaleTimeString() : '--:--'}
                    </td>
                    <td className="py-3 px-4">
                      {log.face_verified ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 text-xs font-medium">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" /> 128-D Match
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-700 dark:text-rose-400 text-xs font-medium">
                          <XCircle className="w-4 h-4 text-rose-500" /> Failed
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {log.location_verified ? (
                        <span className="inline-flex items-center gap-1 text-indigo-700 dark:text-indigo-400 text-xs font-medium">
                          <MapPin className="w-4 h-4 text-indigo-500" /> Inside ({log.distance_meters}m)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-700 dark:text-rose-400 text-xs font-medium">
                          <MapPin className="w-4 h-4 text-rose-500" /> Outside
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider ${
                          log.status === 'present'
                            ? 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                            : 'bg-amber-50 dark:bg-amber-950/70 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 dark:text-slate-500 text-sm">
                    No attendance records registered yet today.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
