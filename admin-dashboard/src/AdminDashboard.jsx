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
  ScanFace,
} from 'lucide-react';
import { API_BASE_URL } from './api/adminClient';

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
      // Primary: /api/admin/attendance/today, Fallback: /api/attendance/today
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
      // Primary: /api/admin/leaves/pending, Fallback: filter /api/leaves/all
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
    // Auto-refresh every 12 seconds for live telemetry
    const interval = setInterval(() => loadDashboardData(false), 12000);
    return () => clearInterval(interval);
  }, []);

  // 3. Leave Review Action (PUT Request to Backend)
  const handleReviewLeave = async (leaveId, decision) => {
    setActionInProgress((prev) => ({ ...prev, [leaveId]: true }));
    try {
      // Attempt PUT /api/admin/leaves/{id}/review or fallback to /api/leaves/{id}/review
      const remarks = decision === 'approved' ? 'Approved by Admin' : 'Rejected by Admin';
      const path = `/api/admin/leaves/${leaveId}/review?status_update=${decision}&remarks=${encodeURIComponent(remarks)}`;

      try {
        await adminClient.put(path, {}, { timeout: 8000 });
      } catch (err) {
        // Fallback endpoint
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

      // Refresh list after action
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
    <div className="space-y-8">
      {/* Toast Notification Banner */}
      {notification && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between shadow-lg transition-all ${
            notification.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300'
              : notification.type === 'info'
              ? 'bg-sky-950/80 border-sky-500/40 text-sky-300'
              : 'bg-rose-950/80 border-rose-500/40 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-400" />
            )}
            <span className="text-sm font-semibold">{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-xs font-bold opacity-75 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Header & Sync Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-white tracking-tight">
              Workforce Operations Dashboard
            </h1>
            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Live Sync
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Real-time biometric attendance monitoring and pending leave dispatch
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadDashboardData(true)}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-semibold border border-slate-800 shadow-sm transition"
          >
            <RefreshCw className={`w-4 h-4 text-sky-400 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Syncing...' : 'Refresh Live Feeds'}</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Checked In */}
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Checked In
            </span>
            <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-white tracking-tight">
              {stats.total}
            </span>
            <p className="text-[11px] text-slate-500 mt-1">Active punches recorded today</p>
          </div>
        </div>

        {/* On-Time Present */}
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Present (On Time)
            </span>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-emerald-400 tracking-tight">
              {stats.present}
            </span>
            <p className="text-[11px] text-slate-500 mt-1">Checked in before 09:30 AM</p>
          </div>
        </div>

        {/* Late Arrivals */}
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Late Arrivals
            </span>
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-amber-400 tracking-tight">
              {stats.late}
            </span>
            <p className="text-[11px] text-slate-500 mt-1">Punched in after grace threshold</p>
          </div>
        </div>

        {/* Pending Leaves */}
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Pending Leaves
            </span>
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <CalendarOff className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-purple-400 tracking-tight">
              {stats.pendingLeavesCount}
            </span>
            <p className="text-[11px] text-slate-500 mt-1">Awaiting administrative decision</p>
          </div>
        </div>
      </div>

      {/* ====================================================================== */}
      {/* DOMAIN 1: REAL-TIME ATTENDANCE TABLE                                   */}
      {/* ====================================================================== */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-sky-400" />
              Real-Time Attendance Log
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Live dual-factor verification status for today's workforce entries
            </p>
          </div>

          {/* Search & Status Filters */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search employee..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 w-44 sm:w-56"
              />
            </div>

            <div className="flex bg-slate-950 border border-slate-800 p-0.5 rounded-xl text-xs">
              {['ALL', 'PRESENT', 'LATE'].map((pill) => (
                <button
                  key={pill}
                  onClick={() => setStatusFilter(pill)}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                    statusFilter === pill
                      ? 'bg-sky-600 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {pill}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto rounded-xl border border-slate-800/80">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950/70 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3.5 px-4">Employee</th>
                <th className="py-3.5 px-4">Check-In Time</th>
                <th className="py-3.5 px-4">Check-Out Time</th>
                <th className="py-3.5 px-4 text-center">Face Biometric</th>
                <th className="py-3.5 px-4 text-center">GPS Geofence</th>
                <th className="py-3.5 px-4">Distance to HQ</th>
                <th className="py-3.5 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {isLoading ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-sky-400" />
                      <span>Loading attendance records from FastAPI server...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredAttendance.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-10 text-center text-slate-500">
                    No attendance records found for today.
                  </td>
                </tr>
              ) : (
                filteredAttendance.map((rec) => {
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

                  // Verified indicators (handling property synonyms)
                  const isFaceVerified = Boolean(rec.face_verified);
                  const isGeoVerified = Boolean(rec.location_verified || rec.geo_verified);

                  return (
                    <tr key={rec.id} className="hover:bg-slate-800/40 transition">
                      {/* Employee Info */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white">
                          {rec.employee_name || 'Workforce Employee'}
                        </div>
                        <div className="text-[11px] font-mono text-sky-400">
                          {rec.employee_id || `ID #${rec.user_id}`}
                        </div>
                      </td>

                      {/* Check-In */}
                      <td className="py-3.5 px-4 text-slate-300 font-mono">
                        {checkInFormatted}
                      </td>

                      {/* Check-Out */}
                      <td className="py-3.5 px-4 text-slate-400 font-mono">
                        {checkOutFormatted}
                      </td>

                      {/* Face Verified (Green Checkmark) */}
                      <td className="py-3.5 px-4 text-center">
                        {isFaceVerified ? (
                          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Verified</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 font-bold text-[11px]">
                            <XCircle className="w-3.5 h-3.5 text-rose-400" />
                            <span>Failed</span>
                          </div>
                        )}
                      </td>

                      {/* Geo Verified (Green Checkmark) */}
                      <td className="py-3.5 px-4 text-center">
                        {isGeoVerified ? (
                          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Inside</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 font-bold text-[11px]">
                            <XCircle className="w-3.5 h-3.5 text-rose-400" />
                            <span>Outside</span>
                          </div>
                        )}
                      </td>

                      {/* Distance to HQ */}
                      <td className="py-3.5 px-4 font-mono text-slate-300">
                        {rec.distance_meters !== null && rec.distance_meters !== undefined ? (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-500" />
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
                              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                              : rec.status === 'late'
                              ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                              : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
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
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <CalendarOff className="w-5 h-5 text-purple-400" />
              Pending Leave Management
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Review and dispatch administrative decisions on employee leave applications
            </p>
          </div>

          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
            {pendingLeaves.length} Actionable Items
          </span>
        </div>

        {/* Pending Requests List */}
        {isLoading ? (
          <div className="py-8 text-center text-slate-500 text-xs">
            Loading pending leave applications...
          </div>
        ) : pendingLeaves.length === 0 ? (
          <div className="py-12 border border-dashed border-slate-800 rounded-xl text-center text-slate-500">
            <CheckCircle2 className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-400">All caught up!</p>
            <p className="text-xs text-slate-500 mt-1">There are no pending leave requests to review.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingLeaves.map((leave) => {
              const isWorking = actionInProgress[leave.id];

              return (
                <div
                  key={leave.id}
                  className="bg-slate-950/70 border border-slate-800 rounded-xl p-5 shadow-md flex flex-col justify-between space-y-4 hover:border-slate-700 transition"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-bold text-white text-sm">
                          {leave.employee_name || `Employee #${leave.user_id}`}
                        </h3>
                        <p className="text-[11px] font-mono text-sky-400">
                          {leave.employee_id || `User ID: ${leave.user_id}`}
                        </p>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        {leave.leave_type || 'Leave'}
                      </span>
                    </div>

                    {/* Date Range */}
                    <div className="bg-slate-900/60 rounded-lg p-2.5 border border-slate-800/80 text-xs">
                      <span className="text-slate-400 font-medium">Duration: </span>
                      <span className="text-slate-200 font-semibold font-mono">
                        {leave.start_date} → {leave.end_date}
                      </span>
                    </div>

                    {/* Reason */}
                    <div className="text-xs text-slate-300 leading-relaxed bg-slate-900/40 p-2.5 rounded-lg border border-slate-800/40">
                      <span className="text-slate-500 font-semibold block text-[10px] uppercase tracking-wider mb-1">
                        Employee Reason
                      </span>
                      "{leave.reason}"
                    </div>
                  </div>

                  {/* Actions (Approve / Reject PUT Requests) */}
                  <div className="pt-3 border-t border-slate-800/60 flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleReviewLeave(leave.id, 'rejected')}
                      disabled={isWorking}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold transition disabled:opacity-50"
                    >
                      {isWorking ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <X className="w-3.5 h-3.5 text-rose-400" />
                      )}
                      <span>Reject</span>
                    </button>

                    <button
                      onClick={() => handleReviewLeave(leave.id, 'approved')}
                      disabled={isWorking}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm transition disabled:opacity-50"
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
