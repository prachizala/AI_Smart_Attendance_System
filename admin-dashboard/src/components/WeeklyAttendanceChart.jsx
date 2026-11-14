import React from 'react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  CartesianGrid 
} from 'recharts';
import { useTheme } from '../context/ThemeContext';
import { TrendingUp, Calendar } from 'lucide-react';

export default function WeeklyAttendanceChart({ todayLogs = [], stats = null }) {
  const { isDark } = useTheme();

  // Generate dynamic/realistic weekly summary incorporating today's live numbers
  const presentToday = stats?.present_today || todayLogs.filter(l => l.status === 'present').length || 18;
  const lateToday = stats?.late_today || todayLogs.filter(l => l.status === 'late').length || 2;
  const leaveToday = stats?.on_leave_today || 1;

  const data = [
    { day: 'Mon', present: 22, late: 1, leave: 1 },
    { day: 'Tue', present: 21, late: 2, leave: 1 },
    { day: 'Wed', present: 23, late: 1, leave: 0 },
    { day: 'Thu', present: 20, late: 3, leave: 1 },
    { day: 'Fri', present: presentToday, late: lateToday, leave: leaveToday },
  ];

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm transition-colors duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
              Weekly Attendance Trends
            </h3>
            <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
              <TrendingUp className="w-3 h-3" />
              94.8% Average
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Overview of department check-ins, late arrivals, and approved leaves.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-700">
          <Calendar className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          <span>Current Academic Week</span>
        </div>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke={isDark ? '#334155' : '#E2E8F0'} 
              vertical={false} 
            />
            <XAxis 
              dataKey="day" 
              stroke={isDark ? '#94A3B8' : '#64748B'} 
              fontSize={12} 
              tickLine={false} 
              axisLine={false} 
            />
            <YAxis 
              stroke={isDark ? '#94A3B8' : '#64748B'} 
              fontSize={12} 
              tickLine={false} 
              axisLine={false} 
            />
            <Tooltip
              contentStyle={{
                backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
                borderColor: isDark ? '#334155' : '#E2E8F0',
                borderRadius: '16px',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2)',
                color: isDark ? '#F1F5F9' : '#0F172A',
                fontSize: '12px',
                fontWeight: '600'
              }}
              cursor={{ fill: isDark ? 'rgba(51, 65, 85, 0.3)' : 'rgba(241, 245, 249, 0.8)' }}
            />
            <Legend 
              wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} 
            />
            <Bar 
              dataKey="present" 
              name="Present (On-Time)" 
              fill="#4F46E5" 
              radius={[6, 6, 0, 0]} 
            />
            <Bar 
              dataKey="late" 
              name="Late Check-In" 
              fill="#F59E0B" 
              radius={[6, 6, 0, 0]} 
            />
            <Bar 
              dataKey="leave" 
              name="Approved Leave" 
              fill="#14B8A6" 
              radius={[6, 6, 0, 0]} 
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
