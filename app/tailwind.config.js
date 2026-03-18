import forms from '@tailwindcss/forms'

export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'primary': '#2f6a3d',
        'background-light': '#efe8da',
        'background-dark': '#101622',
        'surface-dark': '#1a2235',
        'surface-dark-alt': '#242e47',
        'border-dark': '#334155',
        'status-safe': '#22c55e',
        'status-safe-bg': '#dcfce7',
        'status-safe-bg-dark': '#14532d',
        'status-warning': '#eab308',
        'status-warning-bg': '#fef9c3',
        'status-warning-bg-dark': '#713f12',
        'status-danger': '#ef4444',
        'status-danger-bg': '#fee2e2',
        'status-danger-bg-dark': '#7f1d1d',
      },
      fontFamily: {
        display: ['Space Grotesk', 'sans-serif'],
        body: ['Manrope', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '0.25rem',
        lg: '0.5rem',
        xl: '0.75rem',
        full: '9999px',
      },
    },
  },
  plugins: [
    forms,
  ],
}
