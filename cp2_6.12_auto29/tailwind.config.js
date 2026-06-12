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
        primary: {
          50: '#EFF6FD',
          100: '#D9EAFB',
          200: '#B3D5F7',
          300: '#8DBFF3',
          400: '#67AAEF',
          500: '#4A90D9',
          600: '#3A74B0',
          700: '#2B5884',
          800: '#1C3C58',
          900: '#0D202C',
        },
        accent: {
          50: '#FEF6E8',
          100: '#FDEBC5',
          200: '#FBD78B',
          300: '#F9C351',
          400: '#F7AF17',
          500: '#F5A623',
          600: '#C4851C',
          700: '#936415',
          800: '#62420E',
          900: '#312107',
        },
        background: '#FAFBFC',
      },
      animation: {
        'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-out': 'fadeOut 0.5s ease-out forwards',
        'float-up': 'floatUp 0.5s ease-out forwards',
      },
      keyframes: {
        fadeOut: {
          '0%': { opacity: '1', transform: 'translateY(0)' },
          '100%': { opacity: '0', transform: 'translateY(-10px)' },
        },
        floatUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      transitionProperty: {
        'height': 'max-height, opacity',
      },
    },
  },
  plugins: [],
};
