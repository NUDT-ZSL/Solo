/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        dark: {
          bg: '#1E1E2E',
          card: '#2A2A3E',
          text: '#E0E0E0',
          border: '#3A3A4E',
        },
        primary: '#4A90D9',
        'primary-light': '#6BA8E8',
      },
      animation: {
        'pulse-highlight': 'pulseHighlight 500ms ease-out',
        'slide-up': 'slideUp 300ms ease-in-out',
        'slide-down': 'slideDown 300ms ease-in-out',
      },
      keyframes: {
        pulseHighlight: {
          '0%': { boxShadow: '0 0 0 0 rgba(74, 144, 217, 0.6)' },
          '50%': { boxShadow: '0 0 20px 10px rgba(74, 144, 217, 0.3)' },
          '100%': { boxShadow: '0 0 0 0 rgba(74, 144, 217, 0)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(0)', opacity: '1' },
          '100%': { transform: 'translateY(100%)', opacity: '0' },
        },
      },
    },
  },
  plugins: [],
};
