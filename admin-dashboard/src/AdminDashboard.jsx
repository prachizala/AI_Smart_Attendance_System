import React, { useState, useEffect } from 'react';
import adminClient from './api/adminClient';
import {
  Users,
  UserCheck,
  Clock,
  CalendarOff,
  CheckCircle2,
  XCircle,
  AlertCircle,
  MapPin,
  RefreshCw,
  Search,
  Check,
  X,
  Shield,
  TrendingUp,
  Sparkles,
  ArrowUpRight
} from 'lucide-react';
import WeeklyAttendanceChart from './components/WeeklyAttendanceChart';

export default function AdminDashboard() {
  // State for Attendance & Leaves
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [pendingLeaves, setPendingLeaves] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    present: 0,
    late: 0,
    pendingLeavesCount: 0,
  });

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionInProgress, setActionInProgress] = useState({});
  const [notification, setNotification] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Show transient banner notification
  const triggerNotification = (type, message) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  // ============================================================================
  // AXIOS API INTEGRATION
  // ============================================================================

  // 1. Fetch Real-Time Today Attendance Table Data
  const fetchTodayAttendance = async () => {
    try {
      let response;
      try {
        response = await adminClient.get('/api/admin/attendance/today', { timeout: 8000 });
      } catch (err) {
        response = await adminClient.get('/api/attendance/today', { timeout: 8000 });
      }
      return response.data || [];
    } catch (err) {
      console.error('Failed to fetch attendance logs:', err);
      return [];
    }
  };

  // 2. Fetch Pending Leaves Data
  const fetchPendingLeaves = async () => {
    try {
      let response;
      try {
        response = await adminClient.get('/api/admin/leaves/pending', { timeout: 8000 });
        return response.data || [];
      } catch (err) {
        response = await adminClient.get('/api/leaves/all', { timeout: 8000 });
        const allLeaves = response.data || [];
        return allLeaves.filter((l) => l.status === 'pending');
      }
    } catch (err) {
      console.error('Failed to fetch pending leaves:', err);
      return [];
    }
  };

  // Main Data Loader
  const loadDashboardData = async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const [logs, leaves] = await Promise.all([
        fetchTodayAttendance(),
        fetchPendingLeaves(),
      ]);

      setAttendanceLogs(logs);
      setPendingLeaves(leaves);

      // Compute dynamic stats
      const presentCount = logs.filter((l) => l.status === 'present').length;
      const lateCount = logs.filter((l) => l.status === 'late').length;

      setStats({
        total: logs.length,
        present: presentCount,
        late: lateCount,
        pendingLeavesCount: leaves.length,
      });
    } catch (error) {
      triggerNotification('error', 'Error syncing with backend server.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(() => loadDashboardData(false), 12000);
    return () => clearInterval(interval);
  }, []);

  // 3. Leave Review Action (PUT Request to Backend)
  const handleReviewLeave = async (leaveId, decision) => {
    setActionInProgress((prev) => ({ ...prev, [leaveId]: true }));
    try {
      const remarks = decision === 'approved' ? 'Approved by Admin' : 'Rejected by Admin';
      const path = `/api/admin/leaves/${leaveId}/review?status_update=${decision}&remarks=${encodeURIComponent(remarks)}`;

      try {
        await adminClient.put(path, {}, { timeout: 8000 });
      } catch (err) {
        await adminClient.put(
          `/api/leaves/${leaveId}/review?status_update=${decision}&remarks=${encodeURIComponent(remarks)}`,
          {},
          { timeout: 8000 }
        );
      }

      triggerNotification(
        decision === 'approved' ? 'success' : 'info',
        `Leave Request #${leaveId} successfully ${decision.toUpperCase()}!`
      );

      await loadDashboardData(false);
    } catch (err) {
      triggerNotification('error', `Failed to ${decision} leave request: ${err.message}`);
    } finally {
      setActionInProgress((prev) => ({ ...prev, [leaveId]: false }));
    }
  };

  // Filter attendance logs by search query and status pill
  const filteredAttendance = attendanceLogs.filter((record) => {
    const nameMatch =
      record.employee_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.employee_id?.toLowerCase().includes(searchQuery.toLowerCase());
    const statusMatch =
      statusFilter === 'ALL' || record.status?.toUpperCase() === statusFilter;
    return nameMatch && statusMatch;
  });

  return (
    <div className="space-y-8 transition-colors duration-300">
      {/* Toast Notification Banner */}
      {notification && (
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between shadow-md transition-all ${
            notification.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/70 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
              : notification.type === 'info'
              ? 'bg-blue-50 dark:bg-blue-950/70 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200'
              : 'bg-red-50 dark:bg-red-950/70 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            )}
            <span className="text-sm font-semibold">{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-xs font-bold opacity-75 hover:opacity-100 p-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Header & Live Sync Status */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Workforce Operations Dashboard
            </h1>
            <span className="bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1.5 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Geofence
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time biometric attendance monitoring with OpenCV 128-D matching & authoritative 100m geofence.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadDashboardData(true)}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-slate-700 shadow-sm transition disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 text-indigo-600 dark:text-indigo-400 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Syncing...' : 'Refresh Live Feeds'}</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards with Gradient Icon Bubbles and Trend Indicators */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Checked In */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs relative overflow-hidden transition-all duration-300 hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Checked In
            </span>
            <div className="p-3 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-indigo-600/5 dark:from-indigo-500/30 dark:to-indigo-600/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-800/50">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                {stats.total}
              </span>
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center">
                <ArrowUpRight className="w-3.5 h-3.5" /> +100%
              </span>
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Active punches recorded today</p>
          </div>
        </div>

        {/* On-Time Present */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs relative overflow-hidden transition-all duration-300 hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Present (On Time)
            </span>
            <div className="p-3 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/5 dark:from-emerald-500/30 dark:to-emerald-600/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/50">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                {stats.present}
              </span>
              <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                On Schedule
              </span>
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Checked in before 09:30 AM</p>
          </div>
        </div>

        {/* Late Arrivals */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs relative overflow-hidden transition-all duration-300 hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Late Arrivals
            </span>
            <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-600/5 dark:from-amber-500/30 dark:to-amber-600/10 text-amber-600 dark:text-amber-400 border border-amber-200/50 dark:border-amber-800/50">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-black text-amber-600 dark:text-amber-400 tracking-tight">
                {stats.late}
              </span>
              <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/80 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                Grace Flagged
              </span>
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Punched in after grace threshold</p>
          </div>
        </div>

        {/* Pending Leaves */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs relative overflow-hidden transition-all duration-300 hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Pending Leaves
            </span>
            <div className="p-3 rounded-2xl bg-gradient-to-br from-purple-500/20 to-purple-600/5 dark:from-purple-500/30 dark:to-purple-600/10 text-purple-600 dark:text-purple-400 border border-purple-200/50 dark:border-purple-800/50">
              <CalendarOff className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-black text-purple-600 dark:text-purple-400 tracking-tight">
                {stats.pendingLeavesCount}
              </span>
              <span className="text-[11px] font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/80 px-2 py-0.5 rounded-full border border-purple-200 dark:border-purple-800">
                Action Required
              </span>
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">Awaiting administrative decision</p>
          </div>
        </div>
      </div>

      {/* Interactive Recharts Attendance Analytics Chart */}
      <WeeklyAttendanceChart todayLogs={attendanceLogs} stats={stats} />

      {/* ====================================================================== */}
      {/* DOMAIN 1: REAL-TIME ATTENDANCE TABLE                                   */}
      {/* ====================================================================== */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-5 transition-colors duration-300">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              Real-Time Attendance Log
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Live dual-factor verification status for today's workforce entries
            </p>
          </div>

          {/* Search & Status Filters */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search employee..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-44 sm:w-56"
              />
            </div>

            <div className="flex bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-0.5 rounded-xl text-xs">
              {['ALL', 'PRESENT', 'LATE'].map((pill) => (
                <button
                  key={pill}
                  onClick={() => setStatusFilter(pill)}
                  className={`px-3 py-1 rounded-lg font-semibold transition ${
                    statusFilter === pill
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {pill}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3.5 px-4">Employee</th>
                <th className="py-3.5 px-4">Check-In Time</th>
                <th className="py-3.5 px-4">Check-Out Time</th>
                <th className="py-3.5 px-4 text-center">Face Biometric</th>
                <th className="py-3.5 px-4 text-center">GPS Geofence</th>
                <th className="py-3.5 px-4">Distance to HQ</th>
                <th className="py-3.5 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
              {isLoading ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-500 dark:text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-indigo-600 dark:text-indigo-400" />
                      <span>Loading attendance records from FastAPI server...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredAttendance.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-10 text-center text-slate-400 dark:text-slate-500">
                    No attendance records found for today.
                  </td>
                </tr>
              ) : (
                filteredAttendance.map((rec, index) => {
                  const checkInFormatted = rec.check_in
                    ? new Date(rec.check_in).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })
                    : '--:--:--';

                  const checkOutFormatted = rec.check_out
                    ? new Date(rec.check_out).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })
                    : 'Active Shift';

                  const isFaceVerified = Boolean(rec.face_verified);
                  const isGeoVerified = Boolean(rec.location_verified || rec.geo_verified);

                  return (
                    <tr 
                      key={rec.id} 
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition ${
                        index % 2 === 1 ? 'bg-slate-50/40 dark:bg-slate-800/20' : ''
                      }`}
                    >
                      {/* Employee Info */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {rec.employee_name || 'Workforce Employee'}
                        </div>
                        <div className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400">
                          {rec.employee_id || `ID #${rec.user_id}`}
                        </div>
                      </td>

                      {/* Check-In */}
                      <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 font-mono">
                        {checkInFormatted}
                      </td>

                      {/* Check-Out */}
                      <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 font-mono">
                        {checkOutFormatted}
                      </td>

                      {/* Face Verified */}
                      <td className="py-3.5 px-4 text-center">
                        {isFaceVerified ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 font-bold text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span>128-D Verified</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-50 dark:bg-red-950/70 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 font-bold text-[11px]">
                            <XCircle className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                            <span>Failed</span>
                          </div>
                        )}
                      </td>

                      {/* Geo Verified */}
                      <td className="py-3.5 px-4 text-center">
                        {isGeoVerified ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-400 font-bold text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                            <span>Inside</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-50 dark:bg-red-950/70 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 font-bold text-[11px]">
                            <XCircle className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                            <span>Outside</span>
                          </div>
                        )}
                      </td>

                      {/* Distance to HQ */}
                      <td className="py-3.5 px-4 font-mono text-slate-700 dark:text-slate-300">
                        {rec.distance_meters !== null && rec.distance_meters !== undefined ? (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                            {rec.distance_meters.toFixed(1)} m
                          </span>
                        ) : (
                          '--'
                        )}
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-4 text-right">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider ${
                            rec.status === 'present'
                              ? 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                              : rec.status === 'late'
                              ? 'bg-amber-50 dark:bg-amber-950/70 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                              : 'bg-red-50 dark:bg-red-950/70 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
                          }`}
                        >
                          {rec.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ====================================================================== */}
      {/* DOMAIN 2: LEAVE MANAGEMENT MODULE (APPROVE / REJECT ACTIONS)          */}
      {/* ====================================================================== */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-5 transition-colors duration-300">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CalendarOff className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              Pending Leave Management
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Review and dispatch administrative decisions on employee leave applications
            </p>
          </div>

          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-purple-50 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
            {pendingLeaves.length} Actionable Items
          </span>
        </div>

        {/* Pending Requests List */}
        {isLoading ? (
          <div className="py-8 text-center text-slate-500 dark:text-slate-400 text-xs">
            Loading pending leave applications...
          </div>
        ) : pendingLeaves.length === 0 ? (
          <div className="py-12 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-center text-slate-500 dark:text-slate-400">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">All caught up!</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">There are no pending leave requests to review.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingLeaves.map((leave) => {
              const isWorking = actionInProgress[leave.id];

              return (
                <div
                  key={leave.id}
                  className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-slate-300 dark:hover:border-slate-600 transition"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                          {leave.employee_name || `Employee #${leave.user_id}`}
                        </h3>
                        <p className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400">
                          {leave.employee_id || `User ID: ${leave.user_id}`}
                        </p>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-50 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                        {leave.leave_type || 'Leave'}
                      </span>
                    </div>

                    {/* Date Range */}
                    <div className="bg-slate-50 dark:bg-slate-900/70 rounded-xl p-2.5 border border-slate-200 dark:border-slate-700/80 text-xs">
                      <span className="text-slate-500 dark:text-slate-400 font-medium">Duration: </span>
                      <span className="text-slate-800 dark:text-slate-200 font-semibold font-mono">
                        {leave.start_date} → {leave.end_date}
                      </span>
                    </div>

                    {/* Reason */}
                    <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-900/70 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700/80">
                      <span className="text-slate-400 dark:text-slate-500 font-semibold block text-[10px] uppercase tracking-wider mb-1">
                        Employee Reason
                      </span>
                      "{leave.reason}"
                    </div>
                  </div>

                  {/* Actions (Approve / Reject PUT Requests) */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleReviewLeave(leave.id, 'rejected')}
                      disabled={isWorking}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 dark:bg-red-950/60 hover:bg-red-100 dark:hover:bg-red-900/60 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 text-xs font-bold transition disabled:opacity-50"
                    >
                      {isWorking ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <X className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                      )}
                      <span>Reject</span>
                    </button>

                    <button
                      onClick={() => handleReviewLeave(leave.id, 'approved')}
                      disabled={isWorking}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition disabled:opacity-50"
                    >
                      {isWorking ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Check className="w-3.5 h-3.5" />
                      )}
                      <span>Approve Leave</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
