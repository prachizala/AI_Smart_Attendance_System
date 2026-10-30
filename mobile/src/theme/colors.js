// Centralized Theme Palettes for Smart Attendance Mobile App
// Light & Dark Modern Palettes

export const lightColors = {
  // Brand Colors
  primary: '#4F46E5',         // Indigo
  primaryDark: '#4338CA',     // Dark Indigo / Hover
  primaryLight: '#EEF2FF',    // Indigo 50
  primaryBorder: '#C7D2FE',   // Indigo 200

  accent: '#14B8A6',          // Teal
  accentDark: '#0D9488',
  accentLight: '#F0FDFA',     // Teal 50
  accentBorder: '#99F6E4',

  // Surfaces & Layout
  background: '#F8FAFC',      // Slate 50 - clean light background
  surface: '#FFFFFF',         // Pure white card
  surfaceSubtle: '#F1F5F9',   // Slate 100
  card: '#FFFFFF',
  cardAlt: '#F8FAFC',
  inputBg: '#FFFFFF',

  // Borders & Dividers
  border: '#E2E8F0',          // Slate 200
  borderSubtle: '#F1F5F9',    // Slate 100
  borderStrong: '#CBD5E1',    // Slate 300

  // Text Hierarchy
  text: '#0F172A',            // Slate 900
  textPrimary: '#0F172A',
  textSecondary: '#64748B',   // Slate 500
  textMuted: '#94A3B8',       // Slate 400
  textInverse: '#FFFFFF',

  // Status & Badges
  success: '#16A34A',         // Present / Approved (Green 600)
  successBg: '#DCFCE7',       // Green 100
  successBorder: '#86EFAC',   // Green 300
  successText: '#15803D',     // Green 700

  warning: '#F59E0B',         // Late / Incomplete (Amber 500)
  warningBg: '#FEF3C7',       // Amber 100
  warningBorder: '#FDE68A',   // Amber 300
  warningText: '#B45309',     // Amber 700

  danger: '#DC2626',          // Absent / Rejected / Error (Red 600)
  dangerBg: '#FEE2E2',        // Red 100
  dangerBorder: '#FECACA',    // Red 300
  dangerText: '#B91C1C',      // Red 700

  info: '#3B82F6',            // Pending / In Review (Blue 500)
  infoBg: '#DBEAFE',          // Blue 100
  infoBorder: '#93C5FD',      // Blue 300
  infoText: '#1D4ED8',        // Blue 700

  // Shadows
  shadowColor: '#0F172A',
};

export const darkColors = {
  // Brand Colors
  primary: '#818CF8',         // Indigo (brighter for dark mode)
  primaryDark: '#6366F1',     // Indigo 500
  primaryLight: '#1E1B4B',    // Indigo 950
  primaryBorder: '#3730A3',   // Indigo 800

  accent: '#2DD4BF',          // Teal 400
  accentDark: '#14B8A6',
  accentLight: '#042F2E',     // Teal 950
  accentBorder: '#115E59',

  // Surfaces & Layout
  background: '#0B1120',      // Deep navy slate
  surface: '#131C31',         // Dark card surface
  surfaceSubtle: '#1A2438',   // Slightly elevated
  card: '#131C31',
  cardAlt: '#1A2438',
  inputBg: '#1A2438',

  // Borders & Dividers
  border: '#1E293B',          // Slate 800
  borderSubtle: '#162032',
  borderStrong: '#334155',    // Slate 700

  // Text Hierarchy
  text: '#F1F5F9',            // Slate 100
  textPrimary: '#F1F5F9',
  textSecondary: '#94A3B8',   // Slate 400
  textMuted: '#64748B',       // Slate 500
  textInverse: '#0B1120',

  // Status & Badges (Dark-friendly with soft tints)
  success: '#34D399',         // Green 400
  successBg: 'rgba(16, 185, 129, 0.15)',
  successBorder: 'rgba(16, 185, 129, 0.3)',
  successText: '#6EE7B7',     // Green 300

  warning: '#FBBF24',         // Amber 400
  warningBg: 'rgba(245, 158, 11, 0.15)',
  warningBorder: 'rgba(245, 158, 11, 0.3)',
  warningText: '#FCD34D',     // Amber 300

  danger: '#F87171',          // Red 400
  dangerBg: 'rgba(239, 68, 68, 0.15)',
  dangerBorder: 'rgba(239, 68, 68, 0.3)',
  dangerText: '#FCA5A5',      // Red 300

  info: '#60A5FA',            // Blue 400
  infoBg: 'rgba(59, 130, 246, 0.15)',
  infoBorder: 'rgba(59, 130, 246, 0.3)',
  infoText: '#93C5FD',        // Blue 300

  // Shadows
  shadowColor: '#000000',
};

// Default fallback export
export const colors = lightColors;

export default colors;
