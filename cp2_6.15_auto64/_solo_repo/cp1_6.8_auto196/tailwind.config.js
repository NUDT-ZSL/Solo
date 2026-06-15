/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      fontFamily: {
        cinzel: ['Cinzel', 'serif'],
        noto: ['Noto Sans SC', 'sans-serif'],
      },
      colors: {
        cosmos: {
          deep: '#0a0e27',
          dark: '#1a0533',
          mid: '#150d3a',
        },
      },
      animation: {
        'float-up': 'floatUp 0.8s ease-out forwards',
        'float-idle': 'floatIdle 3s ease-in-out infinite',
        'nebula-rotate': 'nebulaRotate 60s linear infinite',
        'twinkle': 'twinkle 1.5s ease-in-out forwards',
        'fade-in': 'fadeIn 0.3s ease-out forwards',
        'fade-in-up': 'fadeInUp 0.4s ease-out forwards',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        floatUp: {
          '0%': { transform: 'translateY(40px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        floatIdle: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        nebulaRotate: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        twinkle: {
          '0%': { transform: 'scale(0)', opacity: '0' },
          '30%': { transform: 'scale(1.2)', opacity: '1' },
          '70%': { transform: 'scale(0.8)', opacity: '0.8' },
          '100%': { transform: 'scale(0)', opacity: '0' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
