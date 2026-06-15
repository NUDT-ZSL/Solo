/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'cream': '#FFF8E7',
        'coffee': '#4A3728',
        'violet-theme': '#8B5CF6',
        'gold': '#FFD700',
      },
    },
  },
  plugins: [],
}
