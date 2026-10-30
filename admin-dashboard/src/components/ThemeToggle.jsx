import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function ThemeToggle({ className = '' }) {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`relative p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700/80 border border-slate-200/80 dark:border-slate-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 shadow-xs flex items-center justify-center ${className}`}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <div className="relative w-5 h-5 flex items-center justify-center transition-transform duration-300">
        {isDark ? (
          <Sun className="w-5 h-5 text-amber-400 transform rotate-0 transition-all duration-300 hover:rotate-45" />
        ) : (
          <Moon className="w-5 h-5 text-indigo-600 transform rotate-0 transition-all duration-300 hover:-rotate-12" />
        )}
      </div>
    </button>
  );
}
