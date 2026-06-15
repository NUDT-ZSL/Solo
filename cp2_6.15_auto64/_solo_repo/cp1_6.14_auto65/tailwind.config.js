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
        primary: '#7c3aed',
        'primary-light': '#a78bfa',
        'primary-bg': '#f5f3ff',
        'primary-highlight': '#ede9fe',
        'primary-selection': '#e0e7ff',
        dark: '#1e1e2e',
        success: '#34d399',
        warning: '#fbbf24',
        error: '#f87171',
        surface: '#fafafa',
      },
    },
  },
  plugins: [],
};
