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
        serif: ['"Noto Serif SC"', 'serif'],
      },
      colors: {
        night: {
          50: '#e8e6f0',
          100: '#c5c1d9',
          800: '#1a1a2e',
          900: '#0a0a0f',
        },
        gold: {
          400: '#d4a853',
          500: '#c9952e',
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};
