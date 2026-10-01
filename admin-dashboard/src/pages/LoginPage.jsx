import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Lock, User, Eye, EyeOff, AlertCircle, Info } from 'lucide-react';

export default function LoginPage() {
  const [identifier, setIdentifier] = useState('ADMIN01');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const { login, isAuthenticated, sessionExpiredMessage, clearSessionMessage } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/';

  // If already authenticated, redirect to dashboard
  React.useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    clearSessionMessage();

    if (!identifier.trim() || !password.trim()) {
      setErrorMessage('Please enter both Admin ID/Username and password.');
      return;
    }

    setIsLoading(true);

    try {
      await login(identifier.trim(), password);
      navigate(from, { replace: true });
    } catch (err) {
      if (err.response) {
        if (err.response.status === 401) {
          setErrorMessage('Invalid administrator credentials.');
        } else if (err.response.status === 403) {
          setErrorMessage('Administrator access denied.');
        } else if (err.response.data?.detail) {
          setErrorMessage(err.response.data.detail);
        } else {
          setErrorMessage(`Authentication failed with status ${err.response.status}.`);
        }
      } else if (err.message && (err.message.includes('Access denied') || err.message.includes('Administrator role required'))) {
        setErrorMessage('Administrator access denied.');
      } else {
        setErrorMessage('Unable to connect to FastAPI backend server. Ensure backend is running.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between font-sans selection:bg-sky-500 selection:text-white">
      {/* Top Banner / Academic Context */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-sm tracking-tight text-white">AI Smart Attendance</span>
              <span className="ml-2 text-[10px] uppercase font-bold tracking-widest bg-sky-500/20 text-sky-300 px-2 py-0.5 rounded-full border border-sky-500/30">
                Admin
              </span>
            </div>
          </div>
          <span className="text-xs text-slate-400 hidden sm:inline">
            College Minor Project BCA (Bachelor of Computer Applications)
          </span>
        </div>
      </header>

      {/* Login Card Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md">
          {/* Card */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur-xl">
            {/* Header info */}
            <div className="text-center mb-8">
              <div className="inline-flex p-3 rounded-2xl bg-sky-500/10 text-sky-400 border border-sky-500/20 mb-4">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h1 className="text-2xl font-extrabold text-white tracking-tight">AI Smart Attendance System</h1>
              <p className="text-xs text-sky-400 font-semibold mt-1">Admin Portal Login</p>
              <p className="text-xs text-slate-400 mt-2">
                College Minor Project BCA (Bachelor of Computer Applications)
              </p>
            </div>

            {/* Session Expired Notice */}
            {sessionExpiredMessage && !errorMessage && (
              <div className="mb-6 p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-2.5 text-xs text-amber-300">
                <Info className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <span className="font-medium">{sessionExpiredMessage}</span>
              </div>
            )}

            {/* Error Banner */}
            {errorMessage ? (
              <div className="mb-6 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-2.5 text-xs text-rose-300">
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                <span className="font-medium">{errorMessage}</span>
              </div>
            ) : null}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Username / Admin ID */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Admin ID / Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="e.g. ADMIN01 or hod@college.edu"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition"
                    autoComplete="username"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter admin password"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-11 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 transition"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-sky-600 to-sky-500 hover:from-sky-500 hover:to-sky-400 text-white font-bold text-sm shadow-lg shadow-sky-500/20 transition-all transform active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <span>Sign In as Administrator</span>
                )}
              </button>
            </form>

            {/* Helper Notice */}
            <div className="mt-6 pt-5 border-t border-slate-800/80 text-center">
              <p className="text-[11px] text-slate-500 font-medium">
                Standard Demo Admin: <code className="text-sky-400">ADMIN01</code> • Enter your authorized administrator credentials
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* College Project Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 text-center text-xs text-slate-500">
        AI Smart Attendance & Workforce Management System • College Minor Project BCA (Bachelor of Computer Applications)
      </footer>
    </div>
  );
}
