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
        'dome-bg': '#0a0e27',
        'dome-purple': '#1a0533',
        'neon-blue': '#00f0ff',
        'neon-pink': '#ff00aa',
        'neon-purple': '#8b5cf6',
      },
      fontFamily: {
        orbitron: ['Orbitron', 'sans-serif'],
        rajdhani: ['Rajdhani', 'sans-serif'],
      },
      backdropBlur: {
        'glass': '16px',
      },
    },
  },
  plugins: [],
};
