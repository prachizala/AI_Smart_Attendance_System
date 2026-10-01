import React, { useState } from 'react';
import { Calculator, DollarSign, Calendar, Info, CheckCircle } from 'lucide-react';
import { adminApi } from '../api/adminClient';

export default function PayrollPage({ payrolls, onReload }) {
  const [month, setMonth] = useState(10);
  const [year, setYear] = useState(2026);
  const [isGenerating, setIsGenerating] = useState(false);
  const [message, setMessage] = useState('');

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

  return (
    <div className="space-y-6">
      {/* Title & Generator Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Basic Academic Payroll Module</h2>
          <p className="text-xs text-slate-400">
            Automated compensation calculation grounded in verified biometric attendance & approved leaves.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-2 rounded-2xl shadow-lg">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 rounded-xl">
            <Calendar className="w-4 h-4 text-sky-400" />
            <select
              value={month}
              onChange={(e) => setMonth(parseInt(e.target.value))}
              className="bg-transparent text-xs text-white font-bold focus:outline-none cursor-pointer"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                <option key={m} value={m} className="bg-slate-900 text-white">
                  Month {m}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 rounded-xl">
            <span className="text-xs text-slate-400 font-bold">2026</span>
          </div>

          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition shadow"
          >
            <Calculator className="w-4 h-4" />
            {isGenerating ? 'Calculating...' : 'Generate Payroll'}
          </button>
        </div>
      </div>

      {message && (
        <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs font-medium">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {/* Formula Explanation Callout */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-300 space-y-1">
          <div className="font-bold text-white">Academic Payroll Formulation:</div>
          <div className="font-mono text-slate-400">
            Per_Day_Salary = (Base_Salary / 30)
          </div>
          <div className="font-mono text-slate-400">
            Net_Payable = Per_Day_Salary × (Present_Days + Approved_Paid_Leaves)
          </div>
        </div>
      </div>

      {/* Payroll Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-slate-950/60 text-slate-400 text-xs uppercase font-semibold border-b border-slate-800">
            <tr>
              <th className="py-3 px-4">Employee</th>
              <th className="py-3 px-4">Period</th>
              <th className="py-3 px-4">Base Salary</th>
              <th className="py-3 px-4">Present Days</th>
              <th className="py-3 px-4">Paid Leaves</th>
              <th className="py-3 px-4">Calculated Net Pay</th>
              <th className="py-3 px-4">Payment Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {payrolls && payrolls.length > 0 ? (
              payrolls.map((p) => (
                <tr key={p.id} className="hover:bg-slate-800/30 transition">
                  <td className="py-3 px-4">
                    <div className="font-semibold text-white">{p.employee_name || 'Employee'}</div>
                    <div className="text-xs text-slate-500 font-mono">{p.employee_id}</div>
                  </td>
                  <td className="py-3 px-4 font-mono text-xs text-slate-300">
                    {p.month}/{p.year}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-400">
                    ₹{p.base_salary?.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 font-mono text-emerald-400 font-bold">
                    {p.present_days} days
                  </td>
                  <td className="py-3 px-4 font-mono text-purple-400 font-bold">
                    {p.paid_leaves} days
                  </td>
                  <td className="py-3 px-4 font-mono text-base font-extrabold text-white">
                    ₹{p.calculated_salary?.toLocaleString()}
                  </td>
                  <td className="py-3 px-4">
                    <span className="inline-block px-2.5 py-1 rounded-full text-xs font-bold uppercase bg-sky-500/10 text-sky-400 border border-sky-500/20">
                      {p.status}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-500">
                  No payroll records generated yet. Click "Generate Payroll" above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
