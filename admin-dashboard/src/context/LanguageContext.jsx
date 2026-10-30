import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../locales/translations';

const LANGUAGE_STORAGE_KEY = 'smart_attendance_language';

const LanguageContext = createContext();

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English', nativeLabel: 'English', flag: '🇬🇧' },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी', flag: '🇮🇳' },
  { code: 'gu', label: 'Gujarati', nativeLabel: 'ગુજરાતી', flag: '🇮🇳' },
];

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    try {
      const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (saved && (saved === 'en' || saved === 'hi' || saved === 'gu')) {
        return saved;
      }
    } catch {}
    return 'en'; // DEFAULT IS ENGLISH
  });

  const changeLanguage = (newLang) => {
    if (newLang === 'en' || newLang === 'hi' || newLang === 'gu') {
      setLanguageState(newLang);
      try {
        localStorage.setItem(LANGUAGE_STORAGE_KEY, newLang);
      } catch (e) {
        console.warn('Could not save language to localStorage', e);
      }
    }
  };

  const t = (key, fallback = '') => {
    const currentDict = translations[language] || translations.en;
    if (currentDict && currentDict[key] !== undefined) {
      return currentDict[key];
    }
    if (translations.en && translations.en[key] !== undefined) {
      return translations.en[key];
    }
    return fallback || key;
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        changeLanguage,
        t,
        supportedLanguages: SUPPORTED_LANGUAGES,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    return {
      language: 'en',
      changeLanguage: () => {},
      t: (key, fallback = '') => translations.en[key] || fallback || key,
      supportedLanguages: SUPPORTED_LANGUAGES,
    };
  }
  return context;
}

export default LanguageContext;
