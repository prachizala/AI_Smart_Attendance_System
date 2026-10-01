import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import AdminDashboard from './AdminDashboard';
import EmployeesPage from './pages/EmployeesPage';
import LeavesPage from './pages/LeavesPage';
import PayrollPage from './pages/PayrollPage';
import LoginPage from './pages/LoginPage';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider, useAuth } from './context/AuthContext';
import { adminApi } from './api/adminClient';

// Main Protected Admin Workspace Layout
function AdminWorkspaceLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  // Determine active tab from URL path
  const getTabFromPath = (path) => {
    if (path.startsWith('/employees')) return 'employees';
    if (path.startsWith('/leaves')) return 'leaves';
    if (path.startsWith('/payroll')) return 'payroll';
    return 'dashboard';
  };

  const activeTab = getTabFromPath(location.pathname);

  const handleTabChange = (tabId) => {
    switch (tabId) {
      case 'employees':
        navigate('/employees');
        break;
      case 'leaves':
        navigate('/leaves');
        break;
      case 'payroll':
        navigate('/payroll');
        break;
      case 'dashboard':
      default:
        navigate('/');
        break;
    }
  };

  // Shared Data States
  const [stats, setStats] = useState(null);
  const [todayLogs, setTodayLogs] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [payrolls, setPayrolls] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadData = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    try {
      const [statsData, logsData, empData, leavesData, payData] = await Promise.all([
        adminApi.getStats().catch(() => null),
        adminApi.getTodayAttendance().catch(() => []),
        adminApi.getEmployees().catch(() => []),
        adminApi.getLeaves().catch(() => []),
        adminApi.getPayrolls().catch(() => []),
      ]);
      setStats(statsData);
      setTodayLogs(logsData);
      setEmployees(empData);
      setLeaves(leavesData);
      setPayrolls(payData);
    } catch (err) {
      console.error('Error fetching admin dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 20000);
    return () => clearInterval(interval);
  }, [loadData]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        onRefresh={loadData}
        isRefreshing={isLoading}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && <AdminDashboard />}
        {activeTab === 'employees' && (
          <EmployeesPage employees={employees} onReload={loadData} />
        )}
        {activeTab === 'leaves' && (
          <LeavesPage leaves={leaves} onReload={loadData} />
        )}
        {activeTab === 'payroll' && (
          <PayrollPage payrolls={payrolls} onReload={loadData} />
        )}
      </main>

      <footer className="border-t border-slate-900 bg-slate-950 py-4 text-center text-xs text-slate-500">
        AI Smart Attendance & Workforce Management System • College Minor Project BCA (Bachelor of Computer Applications)
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Login Route */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected Admin Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AdminWorkspaceLayout />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <AdminWorkspaceLayout />
              </ProtectedRoute>
            }
          />
          <Route
            path="/employees"
            element={
              <ProtectedRoute>
                <AdminWorkspaceLayout />
              </ProtectedRoute>
            }
          />
          <Route
            path="/leaves"
            element={
              <ProtectedRoute>
                <AdminWorkspaceLayout />
              </ProtectedRoute>
            }
          />
          <Route
            path="/payroll"
            element={
              <ProtectedRoute>
                <AdminWorkspaceLayout />
              </ProtectedRoute>
            }
          />

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
