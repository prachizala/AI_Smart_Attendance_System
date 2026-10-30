import React, { useState, useRef, useEffect } from 'react';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function LanguageSelector({ compact = false }) {
  const { language, changeLanguage, supportedLanguages, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const current = supportedLanguages.find((l) => l.code === language) || supportedLanguages[0];

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-xs font-bold transition shadow-xs"
        aria-haspopup="true"
        aria-expanded={isOpen}
        title={t('selectLanguage')}
      >
        <Globe className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
        <span>{compact ? current.code.toUpperCase() : current.nativeLabel}</span>
        <ChevronDown className="w-3 h-3 text-slate-400" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-44 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl z-50 py-1.5 animate-in fade-in duration-150">
          <div className="px-3 py-1 border-b border-slate-100 dark:border-slate-700/60 mb-1">
            <span className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400 dark:text-slate-500">
              {t('selectLanguage')}
            </span>
          </div>
          {supportedLanguages.map((item) => {
            const isSelected = language === item.code;
            return (
              <button
                key={item.code}
                type="button"
                onClick={() => {
                  changeLanguage(item.code);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs transition ${
                  isSelected
                    ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-bold'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm">{item.flag}</span>
                  <div className="text-left">
                    <div>{item.nativeLabel}</div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">
                      {item.label}
                    </div>
                  </div>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
