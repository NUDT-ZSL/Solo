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
        forest: {
          50: '#f5f0e8',
          100: '#e8dcc4',
          200: '#d4c49a',
          300: '#b8a06e',
          400: '#8b7a4a',
          500: '#2d5016',
          600: '#254212',
          700: '#1c330e',
          800: '#13240a',
          900: '#0a1606',
        },
        amber: {
          400: '#f0c050',
          500: '#e8a838',
          600: '#d09020',
        },
        sand: {
          50: '#faf8f2',
          100: '#f5f0e8',
          200: '#ebe3d4',
          300: '#d4c9b0',
        },
      },
      fontFamily: {
        display: ['Georgia', 'serif'],
        body: ['system-ui', '-apple-system', 'sans-serif'],
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-right': {
          '0%': { opacity: '0', transform: 'translateX(100%)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'scale-fade-out': {
          '0%': { opacity: '1', transform: 'scale(1)' },
          '100%': { opacity: '0', transform: 'scale(0.8)' },
        },
        'bounce-number': {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.3)' },
          '100%': { transform: 'scale(1)' },
        },
        'progress-fill': {
          '0%': { width: '0%' },
          '100%': { width: '100%' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.4s ease-out',
        'slide-in-right': 'slide-in-right 0.3s ease-out',
        'scale-fade-out': 'scale-fade-out 0.3s ease-in forwards',
        'bounce-number': 'bounce-number 0.3s ease-out',
        'progress-fill': 'progress-fill 1.5s ease-out',
      },
    },
  },
  plugins: [],
};
