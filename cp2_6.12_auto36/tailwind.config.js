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
        primary: '#2563EB',
        'primary-dark': '#1D4ED8',
        bg: '#F8FAFC',
        text: '#334155',
        'diff-added': '#DCFCE7',
        'diff-deleted': '#FEE2E2',
        'annotation-bg': '#FEF9C3',
      },
    },
  },
  plugins: [],
};
