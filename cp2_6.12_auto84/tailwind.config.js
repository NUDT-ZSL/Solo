/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/client/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        primary: '#F5A623',
        secondary: '#2C5F8A',
        background: '#FDF6EC',
        'primary-light': '#FCECD0',
        'primary-dark': '#D4891A',
        'secondary-light': '#3A7AB5',
        'secondary-dark': '#1E4462',
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'shimmer': 'shimmer 1.5s infinite linear',
        'pulse-orange': 'pulseOrange 2s infinite',
        'glow-green': 'glowGreen 2s infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        pulseOrange: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
        glowGreen: {
          '0%, 100%': { boxShadow: '0 0 4px rgba(34,197,94,0.4)' },
          '50%': { boxShadow: '0 0 12px rgba(34,197,94,0.7)' },
        },
      },
    },
  },
  plugins: [],
};
