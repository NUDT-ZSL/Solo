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
        morandi: {
          lavender: '#9B8EC4',
          sage: '#8FA89A',
          haze: '#8B9DAF',
          sand: '#C9A882',
          rose: '#C49A9A',
          warmgray: '#A89B8E',
          bg: '#F0EDE8',
          cream: '#FAF8F5',
          muted: '#B8B0A6',
        }
      },
      fontFamily: {
        serif: ['"Noto Serif SC"', 'serif'],
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'glow-expand': 'glowExpand 0.6s ease-out forwards',
        'fade-in-up': 'fadeInUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        'slide-in': 'slideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
      },
      keyframes: {
        glowExpand: {
          '0%': { transform: 'scale(0.3)', opacity: '0.8' },
          '100%': { transform: 'scale(2.5)', opacity: '0' },
        },
        fadeInUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateX(-20px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
