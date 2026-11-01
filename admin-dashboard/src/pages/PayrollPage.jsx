import React, { useState } from 'react';
import { Calculator, Calendar, Info, CheckCircle, FileText } from 'lucide-react';
import { adminApi } from '../api/adminClient';
import PayslipModal from '../components/PayslipModal';

export default function PayrollPage({ payrolls, onReload }) {
  const [month, setMonth] = useState(10);
  const [year, setYear] = useState(2026);
  const [isGenerating, setIsGenerating] = useState(false);
  const [message, setMessage] = useState('');
  const [selectedPayslip, setSelectedPayslip] = useState(null);
  const [loadingPayslipId, setLoadingPayslipId] = useState(null);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setMessage('');
    try {
      const results = await adminApi.generatePayroll(month, year);
      setMessage(`Successfully generated payroll for ${results.length} employee(s) for Month ${month}/${year}.`);
      onReload();
    } catch (err) {
      alert('Error generating payroll: ' + (err.response?.data?.detail || err.message));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleViewPayslip = async (payrollId) => {
    setLoadingPayslipId(payrollId);
    try {
      const res = await fetch(`/api/reports/payroll/payslip-data/${payrollId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token') || ''}`
        }
      });
      if (!res.ok) throw new Error('Failed to load payslip data');
      const data = await res.json();
      setSelectedPayslip(data);
    } catch (err) {
      alert('Could not open payslip: ' + err.message);
    } finally {
      setLoadingPayslipId(null);
    }
  };

  return (
    <div className="space-y-6 transition-colors duration-300">
      {/* Title & Generator Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            Academic Payroll Module
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Automated compensation calculation grounded in verified biometric attendance & approved leaves.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-1.5 rounded-2xl shadow-xs">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xs">
            <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <select
              value={month}
              onChange={(e) => setMonth(parseInt(e.target.value))}
              className="bg-transparent text-xs text-slate-800 dark:text-slate-200 font-bold focus:outline-none cursor-pointer"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                <option key={m} value={m} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                  Month {m}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xs">
            <span className="text-xs text-slate-600 dark:text-slate-300 font-bold">2026</span>
          </div>

          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition shadow-xs disabled:opacity-50"
          >
            <Calculator className="w-4 h-4" />
            {isGenerating ? 'Calculating...' : 'Generate Payroll'}
          </button>
        </div>
      </div>

      {message && (
        <div className="flex items-center gap-2 p-3.5 bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 rounded-2xl text-xs font-medium">
          <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>{message}</span>
        </div>
      )}

      {/* Formula Explanation Callout */}
      <div className="bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 rounded-3xl p-5 flex items-start gap-3.5">
        <div className="p-2 rounded-xl bg-white dark:bg-slate-800 shadow-xs text-indigo-600 dark:text-indigo-400 shrink-0">
          <Info className="w-4 h-4" />
        </div>
        <div className="text-xs text-slate-700 dark:text-slate-300 space-y-1">
          <div className="font-bold text-slate-900 dark:text-white">Academic Payroll Formulation:</div>
          <div className="font-mono text-slate-600 dark:text-slate-400">
            Per_Day_Salary = (Base_Salary / 30)
          </div>
          <div className="font-mono text-slate-600 dark:text-slate-400">
            Net_Payable = Per_Day_Salary × (Present_Days + Approved_Paid_Leaves)
          </div>
        </div>
      </div>

      {/* Payroll Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm transition-colors duration-300">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 text-xs uppercase font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Employee</th>
                <th className="py-3.5 px-4">Period</th>
                <th className="py-3.5 px-4">Base Salary</th>
                <th className="py-3.5 px-4">Present Days</th>
                <th className="py-3.5 px-4">Paid Leaves</th>
                <th className="py-3.5 px-4">Calculated Net Pay</th>
                <th className="py-3.5 px-4">Payment Status</th>
                <th className="py-3.5 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium text-xs">
              {payrolls && payrolls.length > 0 ? (
                payrolls.map((p, index) => (
                  <tr 
                    key={p.id} 
                    className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition ${
                      index % 2 === 1 ? 'bg-slate-50/40 dark:bg-slate-800/20' : ''
                    }`}
                  >
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900 dark:text-white">{p.employee_name || 'Employee'}</div>
                      <div className="text-[11px] text-indigo-600 dark:text-indigo-400 font-mono">{p.employee_id}</div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-700 dark:text-slate-300">
                      {p.month}/{p.year}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-400">
                      ₹{p.base_salary?.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                      {p.present_days} days
                    </td>
                    <td className="py-3.5 px-4 font-mono text-purple-600 dark:text-purple-400 font-bold">
                      {p.paid_leaves} days
                    </td>
                    <td className="py-3.5 px-4 font-mono text-sm font-extrabold text-slate-900 dark:text-white">
                      ₹{p.calculated_salary?.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-block px-2.5 py-1 rounded-full text-xs font-bold uppercase bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                        {p.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => handleViewPayslip(p.id)}
                        disabled={loadingPayslipId === p.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-bold text-xs rounded-xl border border-indigo-200 dark:border-indigo-800 transition shadow-2xs"
                        title="View Official Salary Payslip"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>{loadingPayslipId === p.id ? 'Loading...' : 'Payslip'}</span>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400 dark:text-slate-500">
                    No payroll records generated yet. Click "Generate Payroll" above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Official Payslip Statement Modal */}
      {selectedPayslip && (
        <PayslipModal
          payslipData={selectedPayslip}
          onClose={() => setSelectedPayslip(null)}
        />
      )}
    </div>
  );
}
