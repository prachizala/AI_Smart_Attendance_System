import React, { useState } from 'react';
import { UserPlus, Check, X, ShieldAlert, Sparkles } from 'lucide-react';
import { adminApi } from '../api/adminClient';

export default function EmployeesPage({ employees, onReload }) {
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    employee_id: '',
    full_name: '',
    email: '',
    password: '',
    role: 'employee',
    base_salary: 30000,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await adminApi.createEmployee(formData);
      setShowModal(false);
      setFormData({
        employee_id: '',
        full_name: '',
        email: '',
        password: '',
        role: 'employee',
        base_salary: 30000,
      });
      onReload();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create employee profile.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Workforce Registry</h2>
          <p className="text-xs text-slate-400">
            Manage employee identities, biometric face registration status, and base compensation.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-sky-600 hover:bg-sky-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition shadow-md"
        >
          <UserPlus className="w-4 h-4" />
          Add Employee
        </button>
      </div>

      {/* Employees Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-slate-950/60 text-slate-400 text-xs uppercase font-semibold border-b border-slate-800">
            <tr>
              <th className="py-3 px-4">Employee ID</th>
              <th className="py-3 px-4">Full Name</th>
              <th className="py-3 px-4">Department</th>
              <th className="py-3 px-4">Designation</th>
              <th className="py-3 px-4">Contact</th>
              <th className="py-3 px-4">Role</th>
              <th className="py-3 px-4">Base Salary</th>
              <th className="py-3 px-4">Biometrics Enrolled</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {employees && employees.length > 0 ? (
              employees.map((emp) => (
                <tr key={emp.id} className="hover:bg-slate-800/30 transition">
                  <td className="py-3 px-4 font-mono font-bold text-sky-400">{emp.employee_id}</td>
                  <td className="py-3 px-4 font-semibold text-white">
                    {emp.full_name}
                    {emp.employee_id === 'EMP001' && (
                      <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        PRIMARY REAL
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-slate-300 font-medium">
                    {emp.department || 'Computer Applications'}
                  </td>
                  <td className="py-3 px-4 text-sky-300/90 text-xs">
                    {emp.designation || 'Employee'}
                  </td>
                  <td className="py-3 px-4 text-slate-400 text-xs">
                    <div>{emp.email}</div>
                    {emp.phone && <div className="text-slate-500 font-mono mt-0.5">{emp.phone}</div>}
                  </td>
                  <td className="py-3 px-4 uppercase text-xs font-semibold text-slate-300">
                    <span className="bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                      {emp.role}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-emerald-400">
                    ₹{emp.base_salary?.toLocaleString()}
                  </td>
                  <td className="py-3 px-4">
                    {emp.has_face_registered ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        <Check className="w-3.5 h-3.5" /> 128-D Registered
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                        <ShieldAlert className="w-3.5 h-3.5" /> Pending Enrollment
                      </span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-500">
                  No employees found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* New Employee Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Enroll New Employee</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">
                  Employee ID
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. EMP102"
                  value={formData.employee_id}
                  onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">Email</label>
                <input
                  type="email"
                  required
                  placeholder="rahul@college.edu"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">
                  Temporary Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="Minimum 6 characters"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">
                  Base Monthly Salary (₹)
                </label>
                <input
                  type="number"
                  required
                  value={formData.base_salary}
                  onChange={(e) =>
                    setFormData({ ...formData, base_salary: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition shadow"
                >
                  {isSubmitting ? 'Creating...' : 'Enroll Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
