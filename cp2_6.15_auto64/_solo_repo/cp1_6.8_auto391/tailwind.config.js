/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './client/src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Playfair Display', 'serif'],
        body: ['Noto Sans SC', 'sans-serif'],
      },
      animation: {
        'breathe-1': 'breathe1 6s ease-in-out infinite',
        'breathe-2': 'breathe2 8s ease-in-out infinite 1s',
        'breathe-3': 'breathe3 7s ease-in-out infinite 2s',
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        'slide-up': 'slideUp 0.4s ease-out forwards',
      },
      keyframes: {
        breathe1: {
          '0%, 100%': { transform: 'scale(1) translate(0, 0)', opacity: '0.8' },
          '50%': { transform: 'scale(1.1) translate(5%, -3%)', opacity: '1' },
        },
        breathe2: {
          '0%, 100%': { transform: 'scale(1) translate(0, 0)', opacity: '0.7' },
          '50%': { transform: 'scale(1.15) translate(-5%, 3%)', opacity: '0.9' },
        },
        breathe3: {
          '0%, 100%': { transform: 'scale(1) translate(0, 0)', opacity: '0.6' },
          '50%': { transform: 'scale(1.08) translate(3%, 5%)', opacity: '0.85' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
