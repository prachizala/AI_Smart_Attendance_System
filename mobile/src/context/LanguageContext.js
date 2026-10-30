import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { translations } from '../locales/translations';

const LANGUAGE_STORAGE_KEY = 'smart_attendance_language';

const LanguageContext = createContext();

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English', nativeLabel: 'English', flag: '🇬🇧' },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी', flag: '🇮🇳' },
  { code: 'gu', label: 'Gujarati', nativeLabel: 'ગુજરાતી', flag: '🇮🇳' },
];

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState('en'); // DEFAULT IS ENGLISH
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    async function loadSavedLanguage() {
      try {
        const saved = await SecureStore.getItemAsync(LANGUAGE_STORAGE_KEY);
        if (saved && (saved === 'en' || saved === 'hi' || saved === 'gu')) {
          setLanguageState(saved);
        }
      } catch (e) {
        console.warn('Could not load language preference', e);
      } finally {
        setIsLoaded(true);
      }
    }
    loadSavedLanguage();
  }, []);

  const changeLanguage = async (newLang) => {
    if (newLang === 'en' || newLang === 'hi' || newLang === 'gu') {
      setLanguageState(newLang);
      try {
        await SecureStore.setItemAsync(LANGUAGE_STORAGE_KEY, newLang);
      } catch (e) {
        console.warn('Could not save language preference', e);
      }
    }
  };

  // Helper translation function
  const t = (key, fallback = '') => {
    const currentDict = translations[language] || translations.en;
    if (currentDict && currentDict[key] !== undefined) {
      return currentDict[key];
    }
    // Fallback to English dictionary
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
        isLoaded,
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
      isLoaded: true,
      supportedLanguages: SUPPORTED_LANGUAGES,
    };
  }
  return context;
}

export default LanguageContext;
