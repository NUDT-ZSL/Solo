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
        rice: {
          DEFAULT: '#F5E6C8',
          light: '#FAF0DC',
          dark: '#E8D5A8',
        },
        ink: {
          DEFAULT: '#2C2C2C',
          light: '#8B7D6B',
          lighter: '#B5A99A',
          faint: '#D4CCC0',
        },
        cinnabar: {
          DEFAULT: '#C04851',
          light: '#D4676F',
          dark: '#A03A42',
        },
        parchment: '#F0DFC0',
      },
      fontFamily: {
        calligraphy: ['"Ma Shan Zheng"', 'cursive'],
        display: ['"ZCOOL XiaoWei"', 'serif'],
        serif: ['"Noto Serif SC"', 'serif'],
      },
      backdropBlur: {
        glass: '16px',
      },
      animation: {
        'ink-spread': 'inkSpread 0.6s ease-out forwards',
        'fade-in': 'fadeIn 0.4s ease-out forwards',
        'fade-out': 'fadeOut 0.3s ease-out forwards',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        inkSpread: {
          '0%': { transform: 'scale(0.8)', opacity: '0.5' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
      },
    },
  },
  plugins: [],
};
