import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
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

  // Sidebar responsive states
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex font-sans transition-colors duration-300">
      {/* Collapsible Left Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Top Header Bar */}
        <TopBar
          onMenuClick={() => setMobileOpen(true)}
          onRefresh={loadData}
          isRefreshing={isLoading}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />

        {/* View Port Content */}
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

        {/* Footer */}
        <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-4 text-center text-xs text-slate-500 dark:text-slate-400 shadow-xs transition-colors duration-300">
          AI Smart Attendance & Workforce Management System • College Minor Project BCA (Bachelor of Computer Applications)
        </footer>
      </div>
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
