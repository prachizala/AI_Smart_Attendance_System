import React, { useState } from 'react';
import { adminApi } from '../api/adminClient';
import { CalendarOff, CheckCircle2, XCircle, Clock, Filter, X } from 'lucide-react';

export default function LeavesPage({ leaves, onReload }) {
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [actionType, setActionType] = useState('approved');
  const [remarks, setRemarks] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL');

  const handleReview = async () => {
    if (!selectedLeave) return;
    setIsProcessing(true);
    try {
      await adminApi.reviewLeave(selectedLeave.id, actionType, remarks);
      setSelectedLeave(null);
      setRemarks('');
      onReload();
    } catch (err) {
      alert('Error reviewing leave: ' + (err.response?.data?.detail || err.message));
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredLeaves = (leaves || []).filter((l) => {
    if (statusFilter === 'ALL') return true;
    return l.status?.toLowerCase() === statusFilter.toLowerCase();
  });

  return (
    <div className="space-y-6 transition-colors duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              Leave Approvals Panel
            </h2>
            <span className="text-xs font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/70 px-2.5 py-0.5 rounded-full border border-purple-200 dark:border-purple-800">
              {leaves?.filter(l => l.status === 'pending').length || 0} Pending
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Review, approve, or reject employee leave requests. Approved leaves automatically count towards paid academic payroll days.
          </p>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-0.5 rounded-xl text-xs">
          {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map((pill) => (
            <button
              key={pill}
              onClick={() => setStatusFilter(pill)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition ${
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

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm transition-colors duration-300">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 text-xs uppercase font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Employee</th>
                <th className="py-3.5 px-4">Type</th>
                <th className="py-3.5 px-4">Duration</th>
                <th className="py-3.5 px-4">Reason</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium text-xs">
              {filteredLeaves && filteredLeaves.length > 0 ? (
                filteredLeaves.map((l, index) => (
                  <tr 
                    key={l.id} 
                    className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition ${
                      index % 2 === 1 ? 'bg-slate-50/40 dark:bg-slate-800/20' : ''
                    }`}
                  >
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900 dark:text-white">{l.employee_name}</div>
                      <div className="text-[11px] text-indigo-600 dark:text-indigo-400 font-mono">{l.employee_id}</div>
                    </td>
                    <td className="py-3.5 px-4 uppercase text-xs font-bold text-indigo-600 dark:text-indigo-400">
                      {l.leave_type}
                    </td>
                    <td className="py-3.5 px-4 text-xs font-mono text-slate-700 dark:text-slate-300">
                      {l.start_date} to {l.end_date}
                    </td>
                    <td className="py-3.5 px-4 max-w-xs text-slate-700 dark:text-slate-300 text-xs truncate">
                      {l.reason}
                      {l.admin_remarks && (
                        <div className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold italic mt-0.5">
                          Note: {l.admin_remarks}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold uppercase ${
                          l.status === 'approved'
                            ? 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                            : l.status === 'rejected'
                            ? 'bg-red-50 dark:bg-red-950/70 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
                            : 'bg-amber-50 dark:bg-amber-950/70 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                        }`}
                      >
                        {l.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {l.status === 'pending' ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedLeave(l);
                              setActionType('approved');
                            }}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-xs"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => {
                              setSelectedLeave(l);
                              setActionType('rejected');
                            }}
                            className="px-3 py-1 bg-red-50 dark:bg-red-950/60 hover:bg-red-100 dark:hover:bg-red-900/60 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg text-xs font-bold transition shadow-xs"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 dark:text-slate-500 italic">Reviewed</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400 dark:text-slate-500">
                    No leave requests found in registry.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Decision Modal with remarks */}
      {selectedLeave && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl transition-all">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-white capitalize">
                {actionType} Leave for {selectedLeave.employee_name}
              </h3>
              <button
                onClick={() => setSelectedLeave(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              {selectedLeave.start_date} to {selectedLeave.end_date} • "{selectedLeave.reason}"
            </p>

            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                Admin Remarks (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Approved as per academic calendar"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedLeave(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReview}
                disabled={isProcessing}
                className={`px-4 py-2 text-white rounded-xl text-xs font-bold transition shadow-xs ${
                  actionType === 'approved' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {isProcessing ? 'Saving...' : `Confirm ${actionType}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
