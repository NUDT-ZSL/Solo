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
        neon: {
          blue: '#00d4ff',
          purple: '#b44aff',
          pink: '#ff2d7b',
          dark: '#0a0a0f',
        },
      },
      fontFamily: {
        orbitron: ['Orbitron', 'sans-serif'],
        exo: ['Exo 2', 'sans-serif'],
      },
      backdropBlur: {
        glass: '16px',
      },
    },
  },
  plugins: [],
};
