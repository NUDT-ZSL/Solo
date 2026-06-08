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
        tea: {
          50: '#FAF6F0',
          100: '#F0E6D6',
          200: '#E8D5B7',
          300: '#D4B896',
          400: '#C4A47A',
          500: '#B08D5E',
          600: '#9A7548',
          700: '#7D5C38',
          800: '#5E4429',
          900: '#3D2D1A',
        },
        'warm-gold': '#D4A24E',
        'sage-green': '#7A9E7E',
      },
      fontFamily: {
        serif: ['Noto Serif SC', 'serif'],
        sans: ['Noto Sans SC', 'sans-serif'],
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        tea: '0 4px 20px rgba(180, 141, 94, 0.15)',
        'tea-lg': '0 8px 32px rgba(180, 141, 94, 0.2)',
        'tea-glow': '0 0 20px rgba(212, 162, 78, 0.3)',
      },
    },
  },
  plugins: [],
};
