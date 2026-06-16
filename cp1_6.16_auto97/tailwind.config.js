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
        'coffee-primary': '#8B6F5E',
        'coffee-secondary': '#D4A373',
        'coffee-bg': '#FAF5EB',
        'coffee-text': '#3E2723',
        'coffee-title': '#5D4037',
        'coffee-divider': '#D4C5B0',
        'coffee-card': '#FAF5EB',
        'coffee-chart-bg': '#F0EBE1',
        'gold': '#FFD700',
        'silver': '#C0C0C0',
        'bronze': '#CD7F32',
      },
      fontFamily: {
        'serif': ['"Noto Serif SC"', 'serif'],
        'sans': ['"Noto Sans SC"', 'sans-serif'],
      },
      boxShadow: {
        'card': '2px 2px 8px 2px #D4C5B0',
        'card-hover': '4px 4px 16px 4px #D4C5B0',
      },
      borderRadius: {
        'card': '12px',
        'btn': '8px',
      },
      transitionTimingFunction: {
        'DEFAULT': 'ease-out',
      },
      transitionDuration: {
        'DEFAULT': '300ms',
      },
      animation: {
        'fade-in-out': 'fadeInOut 0.4s ease-out',
        'shape-morph': 'shapeMorph 0.5s ease-out',
      },
      keyframes: {
        fadeInOut: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        shapeMorph: {
          '0%': { transform: 'scale(0.95)', opacity: '0.6' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
