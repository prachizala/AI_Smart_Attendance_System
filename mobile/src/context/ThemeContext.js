import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { lightColors, darkColors } from '../theme/colors';

const THEME_STORAGE_KEY = 'smart_attendance_theme';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState('light');
  const [isLoaded, setIsLoaded] = useState(false);

  // Load saved theme on startup
  useEffect(() => {
    async function loadTheme() {
      try {
        const saved = await SecureStore.getItemAsync(THEME_STORAGE_KEY);
        if (saved === 'dark' || saved === 'light') {
          setThemeState(saved);
        }
      } catch (e) {
        console.warn('Could not load theme from SecureStore', e);
      } finally {
        setIsLoaded(true);
      }
    }
    loadTheme();
  }, []);

  const setTheme = async (newTheme) => {
    setThemeState(newTheme);
    try {
      await SecureStore.setItemAsync(THEME_STORAGE_KEY, newTheme);
    } catch (e) {
      console.warn('Could not save theme to SecureStore', e);
    }
  };

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
  };

  const isDark = theme === 'dark';
  const colors = isDark ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ theme, isDark, colors, toggleTheme, setTheme, isLoaded }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    return {
      theme: 'light',
      isDark: false,
      colors: lightColors,
      toggleTheme: () => {},
      setTheme: () => {},
      isLoaded: true,
    };
  }
  return context;
}

export default ThemeContext;
