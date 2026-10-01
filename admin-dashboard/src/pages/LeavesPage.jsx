import React, { useState } from 'react';
import { Check, X, Clock, MessageSquare } from 'lucide-react';
import { adminApi } from '../api/adminClient';

export default function LeavesPage({ leaves, onReload }) {
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [actionType, setActionType] = useState('approved');
  const [remarks, setRemarks] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">Leave Approvals Panel</h2>
        <p className="text-xs text-slate-400">
          Review, approve, or reject employee leave requests. Approved leaves automatically count towards paid academic payroll days.
        </p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-slate-950/60 text-slate-400 text-xs uppercase font-semibold border-b border-slate-800">
            <tr>
              <th className="py-3 px-4">Employee</th>
              <th className="py-3 px-4">Type</th>
              <th className="py-3 px-4">Duration</th>
              <th className="py-3 px-4">Reason</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {leaves && leaves.length > 0 ? (
              leaves.map((l) => (
                <tr key={l.id} className="hover:bg-slate-800/30 transition">
                  <td className="py-3 px-4">
                    <div className="font-semibold text-white">{l.employee_name}</div>
                    <div className="text-xs text-slate-500 font-mono">{l.employee_id}</div>
                  </td>
                  <td className="py-3 px-4 uppercase text-xs font-bold text-sky-400">
                    {l.leave_type}
                  </td>
                  <td className="py-3 px-4 text-xs font-mono text-slate-300">
                    {l.start_date} to {l.end_date}
                  </td>
                  <td className="py-3 px-4 max-w-xs text-slate-300 text-xs truncate">
                    {l.reason}
                    {l.admin_remarks && (
                      <div className="text-[11px] text-purple-400 italic">
                        Note: {l.admin_remarks}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold uppercase ${
                        l.status === 'approved'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : l.status === 'rejected'
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}
                    >
                      {l.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    {l.status === 'pending' ? (
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedLeave(l);
                            setActionType('approved');
                          }}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => {
                            setSelectedLeave(l);
                            setActionType('rejected');
                          }}
                          className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition"
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-500 italic">Reviewed</span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-500">
                  No leave requests found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Decision Modal with remarks */}
      {selectedLeave && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white capitalize">
              {actionType} Leave for {selectedLeave.employee_name}
            </h3>
            <p className="text-xs text-slate-400">
              {selectedLeave.start_date} to {selectedLeave.end_date} • {selectedLeave.reason}
            </p>

            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1">
                Admin Remarks (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Approved as per academic calendar"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedLeave(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReview}
                disabled={isProcessing}
                className={`px-4 py-2 text-white rounded-xl text-xs font-bold transition ${
                  actionType === 'approved' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-rose-600 hover:bg-rose-500'
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
