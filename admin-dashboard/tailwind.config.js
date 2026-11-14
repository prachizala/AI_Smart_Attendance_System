/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: {
          50: '#EEF2FF',
          100: '#E0E7FF',
          200: '#C7D2FE',
          500: '#6366F1',
          600: '#4F46E5', // Indigo primary
          700: '#4338CA', // Indigo hover
          800: '#3730A3',
          DEFAULT: '#4F46E5',
        },
        accent: {
          50: '#F0FDFA',
          100: '#CCFBF1',
          500: '#14B8A6', // Teal
          600: '#0D9488',
          700: '#0F766E',
          DEFAULT: '#14B8A6',
        },
        background: '#F8FAFC',
        surface: '#FFFFFF',
        card: '#FFFFFF',
        'app-border': '#E2E8F0',
        'text-main': '#0F172A',
        'text-sub': '#64748B',
        'text-muted': '#94A3B8',
        success: {
          DEFAULT: '#16A34A',
          light: '#DCFCE7',
          dark: '#15803D',
        },
        warning: {
          DEFAULT: '#F59E0B',
          light: '#FEF3C7',
          dark: '#B45309',
        },
        danger: {
          DEFAULT: '#DC2626',
          light: '#FEE2E2',
          dark: '#B91C1C',
        },
      }
    },
  },
  plugins: [],
}
