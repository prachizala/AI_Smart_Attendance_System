import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { User, AlertCircle, Info, Sparkles, XCircle, X } from 'lucide-react';
import PasswordInput from '../components/PasswordInput';
import ThemeToggle from '../components/ThemeToggle';
import LanguageSelector from '../components/LanguageSelector';
import BrandLogo from '../components/BrandLogo';

export default function LoginPage() {
  const [identifier, setIdentifier] = useState('ADMIN01');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [popupError, setPopupError] = useState(null); // { title: string, message: string, type: string }

  const { login, isAuthenticated, sessionExpiredMessage, clearSessionMessage } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/';

  // If already authenticated, redirect to dashboard
  React.useEffect(() => {
    if (isAuthenticated) {
      const target = from === '/login' ? '/' : from;
      navigate(target, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setPopupError(null);
    clearSessionMessage();

    if (!identifier.trim() || !password.trim()) {
      const msg = t('missingCredentialsMsg');
      setErrorMessage(msg);
      setPopupError({
        title: t('missingCredentialsTitle'),
        message: msg,
        type: 'missing',
      });
      return;
    }

    setIsLoading(true);

    try {
      await login(identifier.trim(), password);
      const target = from === '/login' ? '/' : from;
      navigate(target, { replace: true });
    } catch (err) {
      let rawDetail = err.response?.data?.detail || err.message || '';
      let title = t('authFailedTitle');
      let message = t('wrongPasswordMsg');
      let type = 'general';

      const lower = rawDetail.toLowerCase();

      if (lower.includes('password') || lower.includes('incorrect password')) {
        title = t('wrongPasswordTitle');
        message = t('wrongPasswordMsg');
        type = 'password';
      } else if (
        lower.includes('invalid employee id') || 
        lower.includes('not found') || 
        lower.includes('identifier')
      ) {
        title = t('invalidIdTitle');
        message = t('invalidIdMsg');
        type = 'identifier';
      } else if (lower.includes('access denied') || lower.includes('administrator role required') || lower.includes('employee accounts cannot access')) {
        title = t('accessDeniedTitle');
        message = t('accessDeniedMsg');
        type = 'general';
      } else if (lower.includes('deactivated')) {
        title = t('deactivatedTitle');
        message = t('deactivatedMsg');
        type = 'general';
      } else if (err.response?.status === 401) {
        title = t('authFailedTitle');
        message = rawDetail || t('wrongPasswordMsg');
      } else if (!err.response) {
        title = t('serverErrorTitle');
        message = t('serverErrorMsg');
      } else {
        message = rawDetail || t('serverErrorMsg');
      }

      setErrorMessage(message);
      setPopupError({ title, message, type });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50/60 via-slate-50 to-teal-50/50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950/40 text-slate-900 dark:text-slate-100 flex flex-col justify-between font-sans selection:bg-indigo-500 selection:text-white transition-colors duration-300 relative overflow-hidden">
      {/* Decorative ambient background blur lights */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/10 dark:bg-indigo-500/15 rounded-full blur-3xl pointer-events-none transform -translate-y-1/2" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-teal-500/10 dark:bg-teal-500/10 rounded-full blur-3xl pointer-events-none transform translate-y-1/2" />

      {/* Top Banner / Academic Context */}
      <header className="border-b border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md px-6 py-4 shadow-xs relative z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BrandLogo size="md" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white">
                  {t('appTitle')}
                </span>
                <span className="text-[10px] uppercase font-bold tracking-widest bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 px-2.5 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
                  {t('portalTitle')}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('portalSubtitle')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 dark:text-slate-400 hidden sm:inline font-medium">
              {t('academicHeader')}
            </span>
            {/* Language Selector */}
            <LanguageSelector />
            {/* Theme Toggle in top-right */}
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Login Card Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 relative z-10">
        {/* High-Visibility Error Popup Modal */}
        {popupError && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl relative text-center transform scale-100 transition-all">
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setPopupError(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Error Icon Circle */}
              <div className="mx-auto w-16 h-16 rounded-full bg-red-100 dark:bg-red-950/60 border border-red-200 dark:border-red-800/80 flex items-center justify-center mb-4 text-red-600 dark:text-red-400 shadow-sm">
                <XCircle className="w-9 h-9" />
              </div>

              {/* Title */}
              <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight mb-2">
                {popupError.title}
              </h3>

              {/* Message */}
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-6 font-medium">
                {popupError.message}
              </p>

              {/* Action Button */}
              <button
                type="button"
                onClick={() => setPopupError(null)}
                autoFocus
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold text-sm shadow-md shadow-red-600/25 transition transform active:scale-[0.99]"
              >
                {t('tryAgain')}
              </button>
            </div>
          </div>
        )}

        <div className="w-full max-w-md">
          {/* Glass Card */}
          <div className="bg-white/90 dark:bg-slate-900/85 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800/90 rounded-3xl p-8 sm:p-9 shadow-2xl shadow-indigo-950/5 dark:shadow-black/40 transition-all duration-300">
            {/* Header info */}
            <div className="text-center mb-8">
              <div className="mb-4">
                <BrandLogo size="xl" />
              </div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {t('adminAuth')}
              </h1>
              <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mt-1 uppercase tracking-wider flex items-center justify-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                {t('authorizedWorkspace')}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                {t('loginDescription')}
              </p>
            </div>

            {/* Session Expired Notice */}
            {sessionExpiredMessage && !errorMessage && (
              <div className="mb-6 p-3.5 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/70 rounded-2xl flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-300">
                <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <span className="font-medium">{sessionExpiredMessage}</span>
              </div>
            )}

            {/* Error Banner */}
            {errorMessage ? (
              <div className="mb-6 p-3.5 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800/70 rounded-2xl flex items-start gap-2.5 text-xs text-red-700 dark:text-red-300">
                <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <span className="font-medium">{errorMessage}</span>
              </div>
            ) : null}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Username / Admin ID */}
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                  {t('adminIdOrEmail')}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder={t('adminIdPlaceholder')}
                    className="w-full bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition shadow-xs"
                    autoComplete="username"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                  {t('password')}
                </label>
                <PasswordInput
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('passwordPlaceholder')}
                  autoComplete="current-password"
                  required
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-bold text-sm shadow-md shadow-indigo-600/25 transition-all duration-200 transform active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>{t('authenticating')}</span>
                  </>
                ) : (
                  <span>{t('signInAsAdmin')}</span>
                )}
              </button>
            </form>

            {/* Helper Notice */}
            <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800/80 text-center">
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                {t('standardDemoAdmin')} <code className="text-indigo-600 dark:text-indigo-400 font-bold font-mono">ADMIN01</code>
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* College Project Footer */}
      <footer className="border-t border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md py-4 text-center text-xs text-slate-500 dark:text-slate-400 shadow-xs relative z-10">
        {t('academicFooter')}
      </footer>
    </div>
  );
}
