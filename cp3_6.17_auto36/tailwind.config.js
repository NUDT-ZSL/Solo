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
        navy: '#1e293b',
        'navy-light': '#334155',
        surface: '#f8fafc',
        'surface-white': '#ffffff',
        'status-green': '#22c55e',
        'status-yellow': '#eab308',
        'status-red': '#ef4444',
        'link-blue': '#3b82f6',
        'disabled': '#94a3b8',
      },
      transitionDuration: {
        '300': '300ms',
      },
    },
  },
  plugins: [],
};
