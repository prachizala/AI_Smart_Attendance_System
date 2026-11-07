import React, { useState, useEffect, useCallback } from 'react';
import { 
  ShieldAlert, 
  Clock, 
  FileText, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  Zap, 
  User, 
  Building2, 
  RefreshCw, 
  Printer, 
  X,
  TrendingUp,
  MapPin,
  Eye
} from 'lucide-react';
import { adminApi } from '../api/adminClient';

export default function HRIntelligencePage({ employees = [] }) {
  const [activeSubTab, setActiveSubTab] = useState('anomalies'); // 'anomalies' | 'overtime' | 'payslips'
  const [anomalies, setAnomalies] = useState([]);
  const [overtimeSummary, setOvertimeSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  // Modal for printable payslip
  const [payslipModalOpen, setPayslipModalOpen] = useState(false);
  const [activePayslipHtml, setActivePayslipHtml] = useState('');
  const [activePayslipEmployee, setActivePayslipEmployee] = useState(null);
  const [loadingPayslip, setLoadingPayslip] = useState(false);

  // Filters for anomalies
  const [anomalyFilter, setAnomalyFilter] = useState('all'); // 'all' | 'critical' | 'unresolved'

  const loadHRData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [anomData, otData] = await Promise.all([
        adminApi.getAnomalies().catch(() => []),
        adminApi.getOvertimeSummary(selectedMonth, selectedYear).catch(() => null),
      ]);
      setAnomalies(anomData);
      setOvertimeSummary(otData);
    } catch (err) {
      console.error('Error fetching HR intelligence data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    loadHRData();
  }, [loadHRData]);

  const handleResolve = async (anomalyId) => {
    try {
      await adminApi.resolveAnomaly(anomalyId);
      setAnomalies(prev => prev.map(a => a.id === anomalyId ? { ...a, resolved: true, resolved_by: 'HR Admin' } : a));
    } catch (err) {
      alert('Failed to resolve anomaly: ' + (err.message || 'Server error'));
    }
  };

  const handleOpenPayslip = async (emp) => {
    setActivePayslipEmployee(emp);
    setPayslipModalOpen(true);
    setLoadingPayslip(true);
    try {
      const url = adminApi.getPayslipHtmlUrl(emp.employee_id, selectedMonth, selectedYear);
      const res = await fetch(url);
      const htmlText = await res.text();
      setActivePayslipHtml(htmlText);
    } catch (err) {
      setActivePayslipHtml('<div style="padding:40px; text-align:center; color:red;">Failed to load payslip preview.</div>');
    } finally {
      setLoadingPayslip(false);
    }
  };

  const handleDownloadCsv = () => {
    const csvUrl = adminApi.getPayslipsCsvUrl(selectedMonth, selectedYear);
    window.open(csvUrl, '_blank');
  };

  // Filtered anomalies
  const filteredAnomalies = anomalies.filter(a => {
    if (anomalyFilter === 'critical') return a.severity === 'critical';
    if (anomalyFilter === 'unresolved') return !a.resolved;
    return true;
  });

  const unresolvedCount = anomalies.filter(a => !a.resolved).length;
  const criticalCount = anomalies.filter(a => a.severity === 'critical').length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-rose-50 dark:bg-rose-950/60 rounded-xl text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                HR Security & Overtime Engine
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  AI Active
                </span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Automated Impossible Velocity Detection, AI Anti-Spoofing Audits, and Instant Payslip Generation
              </p>
            </div>
          </div>
        </div>

        {/* Global Action Bar */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="bg-transparent text-xs font-semibold text-slate-700 dark:text-slate-200 px-2 py-1 outline-hidden"
            >
              {[
                'January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'
              ].map((m, idx) => (
                <option key={m} value={idx + 1} className="dark:bg-slate-900">{m}</option>
              ))}
            </select>
            <span className="text-xs text-slate-400">/</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-transparent text-xs font-semibold text-slate-700 dark:text-slate-200 px-2 py-1 outline-hidden"
            >
              {[2025, 2026, 2027].map((y) => (
                <option key={y} value={y} className="dark:bg-slate-900">{y}</option>
              ))}
            </select>
          </div>

          <button
            onClick={loadHRData}
            disabled={isLoading}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title="Refresh HR Telemetry"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleDownloadCsv}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs shadow-indigo-600/20"
          >
            <Download className="w-4 h-4" />
            Export Payslips (CSV)
          </button>
        </div>
      </div>

      {/* Top Telemetry Metric Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Unresolved Anomalies</p>
            <p className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">{unresolvedCount}</p>
            <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
              <AlertTriangle className="w-3 h-3 text-rose-500" /> {criticalCount} Critical Teleportations
            </span>
          </div>
          <div className="p-3 bg-rose-50 dark:bg-rose-950/60 rounded-xl text-rose-600 dark:text-rose-400">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Overtime Logged</p>
            <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
              {overtimeSummary?.total_overtime_hours || '0.0'} <span className="text-sm font-semibold text-slate-400">hrs</span>
            </p>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-0.5">
              <TrendingUp className="w-3 h-3" /> Standard shift: 8.0 hrs/day
            </span>
          </div>
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/60 rounded-xl text-indigo-600 dark:text-indigo-400">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Overtime Bonus Liability</p>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
              ₹ {overtimeSummary?.estimated_overtime_payout?.toLocaleString('en-IN') || '0.00'}
            </p>
            <span className="text-[10px] text-slate-400 mt-0.5">Rate: 1.5x regular hourly wage</span>
          </div>
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 rounded-xl text-emerald-600 dark:text-emerald-400">
            <Zap className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Automated Payslips</p>
            <p className="text-2xl font-black text-sky-600 dark:text-sky-400 mt-1">{employees.length || 20}</p>
            <span className="text-[10px] text-slate-400 mt-0.5">Ready for instant PDF / CSV</span>
          </div>
          <div className="p-3 bg-sky-50 dark:bg-sky-950/60 rounded-xl text-sky-600 dark:text-sky-400">
            <FileText className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Sub Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <button
          onClick={() => setActiveSubTab('anomalies')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeSubTab === 'anomalies'
              ? 'bg-rose-600 text-white shadow-xs shadow-rose-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          Fraud & Anomaly Radar
          {unresolvedCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-white text-rose-700 text-[10px] font-extrabold ml-1">
              {unresolvedCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('overtime')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeSubTab === 'overtime'
              ? 'bg-indigo-600 text-white shadow-xs shadow-indigo-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Clock className="w-4 h-4" />
          Overtime & Hours Analytics
        </button>

        <button
          onClick={() => setActiveSubTab('payslips')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeSubTab === 'payslips'
              ? 'bg-emerald-600 text-white shadow-xs shadow-emerald-600/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          Instant Payslip & CSV Generator
        </button>
      </div>

      {/* ========================================================= */}
      {/* Tab 1: AI Anomaly & Fraud Radar */}
      {/* ========================================================= */}
      {activeSubTab === 'anomalies' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/50">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Flagged Attendance Anomalies & Proxy Attacks
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Impossible velocity (&gt;120 km/h), blocked static spoof photos, and rapid punch logs
              </p>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-200/60 dark:bg-slate-800 p-1 rounded-xl text-xs">
              <button
                onClick={() => setAnomalyFilter('all')}
                className={`px-3 py-1 rounded-lg font-medium transition ${
                  anomalyFilter === 'all'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                All ({anomalies.length})
              </button>
              <button
                onClick={() => setAnomalyFilter('critical')}
                className={`px-3 py-1 rounded-lg font-medium transition ${
                  anomalyFilter === 'critical'
                    ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Critical ({criticalCount})
              </button>
              <button
                onClick={() => setAnomalyFilter('unresolved')}
                className={`px-3 py-1 rounded-lg font-medium transition ${
                  anomalyFilter === 'unresolved'
                    ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Unresolved ({unresolvedCount})
              </button>
            </div>
          </div>

          {filteredAnomalies.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Zero Security Anomalies</p>
              <p className="text-xs text-slate-400 mt-1">All punches comply with human physical velocity and liveness standards.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredAnomalies.map((a) => {
                const isCrit = a.severity === 'critical';
                const isSpoof = a.anomaly_type === 'SPOOF_ATTEMPT';
                const isSpeed = a.anomaly_type === 'IMPOSSIBLE_SPEED';

                return (
                  <div key={a.id} className="p-4 sm:p-5 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <div className={`p-2.5 rounded-xl shrink-0 ${
                        isCrit ? 'bg-rose-100 dark:bg-rose-950 text-rose-600' :
                        isSpoof ? 'bg-amber-100 dark:bg-amber-950 text-amber-600' :
                        'bg-blue-100 dark:bg-blue-950 text-blue-600'
                      }`}>
                        {isSpeed ? <Zap className="w-5 h-5" /> :
                         isSpoof ? <ShieldAlert className="w-5 h-5" /> :
                         <AlertTriangle className="w-5 h-5" />}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            {a.employee_name} ({a.employee_id})
                          </span>
                          <span className="text-[11px] text-slate-400">• {a.department}</span>

                          <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                            isCrit ? 'bg-rose-500/10 text-rose-600 border border-rose-500/20' :
                            isSpoof ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20' :
                            'bg-slate-500/10 text-slate-600 border border-slate-500/20'
                          }`}>
                            {a.anomaly_type.replace('_', ' ')}
                          </span>

                          {a.calculated_speed_kmh && (
                            <span className="text-[10px] font-mono font-bold bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 px-2 py-0.5 rounded-md border border-rose-200 dark:border-rose-900">
                              ⚡ {a.calculated_speed_kmh} km/h
                            </span>
                          )}

                          {a.resolved ? (
                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-500/20 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Resolved
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded-md border border-rose-500/20 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> Flagged for HR
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                          {a.description}
                        </p>

                        <div className="flex items-center gap-4 text-[11px] text-slate-400 pt-1">
                          {a.distance_km && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" /> Distance Jump: {a.distance_km} km
                            </span>
                          )}
                          {a.time_delta_mins && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" /> Time Delta: {a.time_delta_mins} mins
                            </span>
                          )}
                          <span>Timestamp: {new Date(a.created_at).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-2 self-end md:self-center">
                      {!a.resolved ? (
                        <button
                          onClick={() => handleResolve(a.id)}
                          className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 rounded-xl text-xs font-bold transition shadow-xs"
                        >
                          Mark as Resolved
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400 font-medium italic">
                          Resolved by {a.resolved_by || 'HR'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* Tab 2: Overtime Analytics */}
      {/* ========================================================= */}
      {activeSubTab === 'overtime' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-1">
              Top Overtime Earners ({new Date(0, selectedMonth - 1).toLocaleString('default', { month: 'long' })} {selectedYear})
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Employees who worked beyond standard 8-hour shift limits
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 text-left">
                    <th className="pb-3 font-semibold">Employee</th>
                    <th className="pb-3 font-semibold">Department</th>
                    <th className="pb-3 font-semibold text-right">Overtime Hours</th>
                    <th className="pb-3 font-semibold text-right">Bonus (1.5x Rate)</th>
                    <th className="pb-3 font-semibold text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {overtimeSummary?.top_overtime_workers?.map((w) => (
                    <tr key={w.employee_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                      <td className="py-3 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center font-bold text-xs">
                          {w.full_name?.charAt(0) || 'E'}
                        </div>
                        <div>
                          <div>{w.full_name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{w.employee_id}</div>
                        </div>
                      </td>
                      <td className="py-3 text-slate-600 dark:text-slate-300">{w.department}</td>
                      <td className="py-3 text-right font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {w.overtime_hours} hrs
                      </td>
                      <td className="py-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        ₹ {w.overtime_payout?.toFixed(2)}
                      </td>
                      <td className="py-3 text-center">
                        <button
                          onClick={() => handleOpenPayslip(w)}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-semibold transition"
                        >
                          View Payslip
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">Company Overtime Policy</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Automated compensation guidelines configured in smart engine
              </p>

              <div className="space-y-3 text-xs">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                  <span className="font-bold text-slate-800 dark:text-slate-200">Standard Daily Threshold:</span>
                  <p className="text-slate-500 mt-0.5">8.0 working hours (480 minutes). Check-outs exceeding this trigger overtime accumulation.</p>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                  <span className="font-bold text-slate-800 dark:text-slate-200">Overtime Wage Multiplier:</span>
                  <p className="text-slate-500 mt-0.5">1.5× calculated hourly rate: <code className="font-mono text-indigo-600">(Base / 30 / 8) * 1.5</code>.</p>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                  <span className="font-bold text-slate-800 dark:text-slate-200">Audit Compliance:</span>
                  <p className="text-slate-500 mt-0.5">Overtime is burned with GPS location stamps to prevent ghost hours billing.</p>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
              <button
                onClick={handleDownloadCsv}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download Monthly Audit CSV
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* Tab 3: Instant Payslip Generator */}
      {/* ========================================================= */}
      {activeSubTab === 'payslips' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Instant Employee Payslip Generator
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                1-click official corporate salary slips with HRA, Overtime Bonus, and Deductions
              </p>
            </div>

            <button
              onClick={handleDownloadCsv}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
            >
              <Download className="w-4 h-4" />
              Download All as CSV
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 text-left">
                  <th className="pb-3 font-semibold">Employee ID</th>
                  <th className="pb-3 font-semibold">Name</th>
                  <th className="pb-3 font-semibold">Department</th>
                  <th className="pb-3 font-semibold text-right">Base Salary</th>
                  <th className="pb-3 font-semibold text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {employees.map((emp) => (
                  <tr key={emp.employee_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="py-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      {emp.employee_id}
                    </td>
                    <td className="py-3 font-bold text-slate-900 dark:text-white">
                      {emp.full_name}
                    </td>
                    <td className="py-3 text-slate-600 dark:text-slate-300">
                      {emp.department || 'General'}
                    </td>
                    <td className="py-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                      ₹ {(emp.base_salary || 30000).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 text-center">
                      <button
                        onClick={() => handleOpenPayslip(emp)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-600 dark:text-indigo-400 text-xs font-bold transition"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        View & Print Payslip
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payslip Print / Preview Modal */}
      {payslipModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  Official Payslip Preview — {activePayslipEmployee?.full_name} ({activePayslipEmployee?.employee_id})
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const iframe = document.getElementById('payslip-iframe');
                    if (iframe) iframe.contentWindow.print();
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print / Save PDF
                </button>
                <button
                  onClick={() => setPayslipModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body / Iframe */}
            <div className="flex-1 bg-slate-100 p-4 overflow-y-auto">
              {loadingPayslip ? (
                <div className="p-16 text-center">
                  <RefreshCw className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-2" />
                  <p className="text-xs text-slate-500">Calculating gross wages and overtime hours...</p>
                </div>
              ) : (
                <iframe
                  id="payslip-iframe"
                  srcDoc={activePayslipHtml}
                  title="Official Payslip"
                  className="w-full h-[650px] bg-white rounded-xl shadow-xs border-0"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
