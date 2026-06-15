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
        amber: {
          50: '#fff8f0',
          100: '#ffe0b2',
          200: '#e0c8a0',
          800: '#5d4037',
        },
      },
    },
  },
  plugins: [],
};
