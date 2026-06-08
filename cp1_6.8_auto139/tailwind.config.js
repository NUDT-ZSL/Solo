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
        cream: '#FAF8F5',
        warmgray: '#E8E6E3',
        amber: {
          light: '#D4A574',
          DEFAULT: '#C8956C',
          dark: '#A67C52',
        },
        poem: {
          bg: '#FAF8F5',
          card: 'rgba(255, 255, 255, 0.72)',
          text: '#3D3229',
          muted: '#8C7E72',
        },
      },
      fontFamily: {
        xiaowei: ['"ZCOOL XiaoWei"', 'serif'],
        serif: ['"Noto Serif SC"', 'serif'],
      },
      backdropBlur: {
        glass: '16px',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'float-up': 'floatUp 0.5s ease-out',
        'petal': 'petalFall 8s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        floatUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        petalFall: {
          '0%': { transform: 'translateY(-10vh) rotate(0deg)', opacity: '0' },
          '10%': { opacity: '0.6' },
          '90%': { opacity: '0.6' },
          '100%': { transform: 'translateY(110vh) rotate(720deg)', opacity: '0' },
        },
      },
    },
  },
  plugins: [],
};
