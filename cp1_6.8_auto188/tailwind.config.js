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
        poetry: ['"Ma Shan Zheng"', 'serif'],
      },
      colors: {
        paper: '#F5F0E8',
        ink: '#1A1A1A',
        vermilion: '#C23B22',
        azurite: '#2E5C8A',
      },
    },
  },
  plugins: [],
};
