/** @type {import('tailwindcss').Config} */

export default {
  content: [
    "./index.html",
    "./frontend/src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f7f5f0',
          100: '#f0ece3',
          200: '#e0d9c7',
          300: '#d1c6ab',
          400: '#b8a87f',
        },
        accent: {
          neon: '#39ff14',
        }
      },
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        body: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 2px 12px rgba(0, 0, 0, 0.06)',
        'hover': '0 8px 24px rgba(0, 0, 0, 0.12)',
      },
      borderRadius: {
        'card': '12px',
      },
      animation: {
        'breathing': 'breathingGlow 2s ease-in-out infinite',
        'fade-in': 'fadeIn 0.35s ease forwards',
        'slide-in-left': 'slideInLeft 0.35s ease forwards',
        'slide-in-right': 'slideInRight 0.35s ease forwards',
        'float': 'floatUp 3s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
