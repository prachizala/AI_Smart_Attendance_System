import React from 'react';
import { Users, UserCheck, Clock, UserX, CalendarOff, MapPin, CheckCircle2, XCircle } from 'lucide-react';

export default function DashboardPage({ stats, todayLogs, isLoading }) {
  const cards = [
    {
      title: 'Total Employees',
      value: stats?.total_employees || 0,
      icon: Users,
      color: 'from-blue-500/20 to-blue-600/5',
      border: 'border-blue-500/30',
      text: 'text-blue-400',
    },
    {
      title: 'Present Today',
      value: stats?.present_today || 0,
      icon: UserCheck,
      color: 'from-emerald-500/20 to-emerald-600/5',
      border: 'border-emerald-500/30',
      text: 'text-emerald-400',
    },
    {
      title: 'Late Arrivals',
      value: stats?.late_today || 0,
      icon: Clock,
      color: 'from-amber-500/20 to-amber-600/5',
      border: 'border-amber-500/30',
      text: 'text-amber-400',
    },
    {
      title: 'On Approved Leave',
      value: stats?.on_leave_today || 0,
      icon: CalendarOff,
      color: 'from-purple-500/20 to-purple-600/5',
      border: 'border-purple-500/30',
      text: 'text-purple-400',
    },
    {
      title: 'Absent / Unreported',
      value: stats?.absent_today || 0,
      icon: UserX,
      color: 'from-rose-500/20 to-rose-600/5',
      border: 'border-rose-500/30',
      text: 'text-rose-400',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Metric Counters Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {cards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div
              key={i}
              className={`bg-gradient-to-b ${card.color} bg-slate-900 border ${card.border} rounded-2xl p-5 shadow-lg relative overflow-hidden`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  {card.title}
                </span>
                <Icon className={`w-5 h-5 ${card.text}`} />
              </div>
              <div className="mt-3">
                <span className="text-3xl font-extrabold text-white tracking-tight">
                  {card.value}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Real-time Daily Attendance Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Today's Real-Time Attendance Log</h2>
            <p className="text-xs text-slate-400">
              Live timestamps with verified 128-D OpenCV face embeddings and Haversine GPS distances.
            </p>
          </div>
          <span className="text-xs bg-slate-800 text-sky-400 px-3 py-1 rounded-full border border-slate-700 font-mono">
            Radius Threshold: 100m
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/60 text-slate-400 text-xs uppercase font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Check-In</th>
                <th className="py-3 px-4">Check-Out</th>
                <th className="py-3 px-4">Face Check</th>
                <th className="py-3 px-4">GPS Geofence</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {todayLogs && todayLogs.length > 0 ? (
                todayLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white">{log.employee_name || 'Employee'}</div>
                      <div className="text-xs text-slate-500 font-mono">{log.employee_id}</div>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-300">
                      {log.check_in ? new Date(log.check_in).toLocaleTimeString() : '--:--'}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-300">
                      {log.check_out ? new Date(log.check_out).toLocaleTimeString() : '--:--'}
                    </td>
                    <td className="py-3 px-4">
                      {log.face_verified ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400 text-xs font-medium">
                          <CheckCircle2 className="w-4 h-4" /> 128-D Match
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-400 text-xs font-medium">
                          <XCircle className="w-4 h-4" /> Failed
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {log.location_verified ? (
                        <span className="inline-flex items-center gap-1 text-sky-400 text-xs font-medium">
                          <MapPin className="w-4 h-4" /> Inside ({log.distance_meters}m)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-400 text-xs font-medium">
                          <MapPin className="w-4 h-4" /> Outside
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider ${
                          log.status === 'present'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 text-sm">
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
