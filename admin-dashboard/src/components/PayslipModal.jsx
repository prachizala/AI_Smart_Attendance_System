import React, { useRef } from 'react';
import { X, Printer, Download, Building2, CheckCircle2, ShieldCheck, QrCode } from 'lucide-react';

export default function PayslipModal({ payslipData, onClose }) {
  const printRef = useRef(null);

  if (!payslipData) return null;

  const { institution, period, generated_at, employee, attendance_metrics, salary_breakdown, security_hash } = payslipData;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white print:static">
      {/* Modal Container */}
      <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-8 print:border-none print:shadow-none print:my-0 print:w-full print:max-w-none print:rounded-none">
        
        {/* Action Header (Hidden in Print) */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 print:hidden">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
              Official Academic Salary Statement
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save as PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Payslip Body */}
        <div ref={printRef} className="p-8 space-y-6 text-slate-800 dark:text-slate-100 print:p-6 print:text-black">
          
          {/* Institution Header */}
          <div className="flex items-start justify-between border-b-2 border-indigo-600 pb-5">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 print:text-indigo-800">
                <Building2 className="w-6 h-6 shrink-0" />
                <h1 className="text-lg font-black tracking-tight">{institution?.name || 'SBS Campus'}</h1>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 print:text-slate-600">
                {institution?.affiliation}
              </p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 print:text-slate-500">
                {institution?.address} • {institution?.contact}
              </p>
            </div>

            <div className="text-right">
              <span className="inline-block px-3 py-1 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-mono text-xs font-bold rounded-lg border border-indigo-200 dark:border-indigo-800 print:border-slate-300">
                PAYSLIP: {period}
              </span>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">Generated: {generated_at}</p>
            </div>
          </div>

          {/* Employee & Period Summary Grid */}
          <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 text-xs print:bg-slate-50 print:border-slate-300">
            <div className="space-y-1.5">
              <div>
                <span className="text-slate-400 dark:text-slate-500 font-medium">Employee Name:</span>
                <span className="font-bold text-slate-900 dark:text-white ml-2 print:text-black">{employee.full_name}</span>
              </div>
              <div>
                <span className="text-slate-400 dark:text-slate-500 font-medium">Employee Code:</span>
                <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 ml-2 print:text-indigo-900">{employee.employee_id}</span>
              </div>
              <div>
                <span className="text-slate-400 dark:text-slate-500 font-medium">Department:</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300 ml-2 print:text-slate-800">{employee.department}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <div>
                <span className="text-slate-400 dark:text-slate-500 font-medium">Designation:</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300 ml-2 print:text-slate-800">{employee.designation}</span>
              </div>
              <div>
                <span className="text-slate-400 dark:text-slate-500 font-medium">Payment Mode:</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300 ml-2 print:text-slate-800">Direct Academic Payroll Bank Transfer</span>
              </div>
              <div>
                <span className="text-slate-400 dark:text-slate-500 font-medium">Disbursement Status:</span>
                <span className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400 ml-2 print:text-emerald-800">
                  <CheckCircle2 className="w-3.5 h-3.5" /> {salary_breakdown.status}
                </span>
              </div>
            </div>
          </div>

          {/* Attendance Audit Metrics */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
              Verified Biometric Attendance Record
            </h3>
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 print:border-slate-300">
                <div className="text-[10px] text-slate-500">Working Days</div>
                <div className="text-base font-black text-slate-800 dark:text-slate-100 mt-0.5">{attendance_metrics.total_working_days}</div>
              </div>
              <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800/60 print:border-slate-300">
                <div className="text-[10px] text-emerald-700 dark:text-emerald-400">Present Days</div>
                <div className="text-base font-black text-emerald-700 dark:text-emerald-300 mt-0.5">{attendance_metrics.present_days}</div>
              </div>
              <div className="p-3 bg-purple-50/70 dark:bg-purple-950/40 rounded-xl border border-purple-200 dark:border-purple-800/60 print:border-slate-300">
                <div className="text-[10px] text-purple-700 dark:text-purple-400">Approved Leaves</div>
                <div className="text-base font-black text-purple-700 dark:text-purple-300 mt-0.5">{attendance_metrics.paid_leaves}</div>
              </div>
              <div className="p-3 bg-rose-50/70 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-800/60 print:border-slate-300">
                <div className="text-[10px] text-rose-700 dark:text-rose-400">Loss of Pay (LOP)</div>
                <div className="text-base font-black text-rose-700 dark:text-rose-300 mt-0.5">{attendance_metrics.loss_of_pay_days}</div>
              </div>
            </div>
          </div>

          {/* Salary Breakdown Table */}
          <div className="border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden print:border-slate-300">
            <table className="w-full text-xs">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700 print:bg-slate-100">
                <tr>
                  <th className="py-2.5 px-4 text-left">Earnings Component</th>
                  <th className="py-2.5 px-4 text-right">Amount (₹)</th>
                  <th className="py-2.5 px-4 text-left">Deductions</th>
                  <th className="py-2.5 px-4 text-right">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                <tr>
                  <td className="py-2.5 px-4">Basic Monthly Salary</td>
                  <td className="py-2.5 px-4 text-right font-mono font-bold">₹{employee.base_salary?.toLocaleString()}</td>
                  <td className="py-2.5 px-4 text-rose-600 dark:text-rose-400">Loss of Pay ({attendance_metrics.loss_of_pay_days} days)</td>
                  <td className="py-2.5 px-4 text-right font-mono text-rose-600 dark:text-rose-400">-₹{salary_breakdown.loss_of_pay_deduction?.toLocaleString()}</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-4 text-slate-500">Daily Calculation Rate</td>
                  <td className="py-2.5 px-4 text-right font-mono text-slate-500">₹{salary_breakdown.daily_rate}/day</td>
                  <td className="py-2.5 px-4 text-slate-500">Professional Tax & PF</td>
                  <td className="py-2.5 px-4 text-right font-mono text-slate-500">₹0.00</td>
                </tr>
                <tr className="bg-indigo-50/70 dark:bg-indigo-950/40 font-bold text-sm text-slate-900 dark:text-white print:bg-slate-100 print:text-black">
                  <td colSpan={2} className="py-3 px-4 text-indigo-900 dark:text-indigo-200">
                    Net Disbursable Salary:
                  </td>
                  <td colSpan={2} className="py-3 px-4 text-right font-mono text-lg font-black text-indigo-700 dark:text-indigo-400 print:text-black">
                    ₹{salary_breakdown.net_payable?.toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Verification Stamp & Signatory Footer */}
          <div className="flex items-end justify-between pt-4 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
            <div className="space-y-1">
              <div className="font-mono text-[10px] text-slate-400">Audit Hash: {security_hash}</div>
              <p>This is a computer-generated salary slip verified via 128-D Biometric Attendance System.</p>
              <p className="font-semibold text-slate-600 dark:text-slate-300">SBS Campus • Minor Project BCA Examination 2026</p>
            </div>

            <div className="text-center space-y-2">
              <div className="w-36 border-b border-dashed border-slate-400 pb-1 font-serif text-slate-700 dark:text-slate-300 italic">
                Dr. S. K. Kulkarni
              </div>
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Authorized Signatory
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
