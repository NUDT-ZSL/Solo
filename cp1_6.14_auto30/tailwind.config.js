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
        surface: {
          DEFAULT: '#1e1e1e',
          dark: '#121212',
          light: '#2a2a2a',
        },
        accent: {
          green: '#1db954',
          amber: '#f59e0b',
          indigo: '#6366f1',
        }
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'sans-serif'],
      }
    },
  },
  plugins: [],
};
