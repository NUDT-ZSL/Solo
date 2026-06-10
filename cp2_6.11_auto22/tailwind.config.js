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
        base: {
          900: '#0F1923',
          800: '#1A2A3A',
          700: '#1E2A3A',
          600: '#2A3A4A',
          500: '#3A4A5A',
        },
        cyan: {
          primary: '#00BCD4',
        },
        indigo: {
          primary: '#3F51B5',
        },
      },
      fontFamily: {
        display: ['Outfit', 'sans-serif'],
        body: ['Noto Sans SC', 'sans-serif'],
      },
      borderRadius: {
        'xl2': '12px',
      },
      backdropBlur: {
        glass: '10px',
      },
    },
  },
  plugins: [],
};
