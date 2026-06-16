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
        primary: '#4ade80',
        secondary: '#22c55e',
        bg: '#fefce8',
        'text-primary': '#1f2937',
        'text-body': '#374151',
        'skeleton': '#e5e7eb',
        'tag-leaf': '#3b82f6',
        'tag-margin': '#f59e0b',
        'tag-vein': '#10b981',
        'tag-fruit': '#8b5cf6',
        'badge-new': '#f97316',
        'confirm-bg': '#fee2e2',
      },
      keyframes: {
        'slide-in-right': {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        'fade-out': {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        'shimmer': {
          '0%': { 'background-position': '-1000px 0' },
          '100%': { 'background-position': '1000px 0' },
        },
      },
      animation: {
        'slide-in-right': 'slide-in-right 0.4s ease-out',
        'fade-out': 'fade-out 0.5s ease-in forwards',
        'shimmer': 'shimmer 1.5s infinite linear',
      },
    },
  },
  plugins: [],
};
