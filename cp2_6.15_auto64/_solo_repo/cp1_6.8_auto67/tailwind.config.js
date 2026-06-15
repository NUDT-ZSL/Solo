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
        ark: {
          bg: '#0a0a2e',
          bgDark: '#1a0a3e',
          gold: '#f0c878',
          goldMuted: '#d4a574',
          blue: '#4a9eff',
          purple: '#9b59b6',
        },
      },
      fontFamily: {
        cinzel: ['Cinzel', 'serif'],
        noto: ['Noto Sans SC', 'sans-serif'],
      },
      animation: {
        'twinkle': 'twinkle 4s ease-in-out infinite',
        'float': 'float 4s ease-in-out infinite',
        'glow-pulse': 'glowPulse 3s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
