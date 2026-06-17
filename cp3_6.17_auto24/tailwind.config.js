/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'bg-primary': '#121212',
        'bg-secondary': '#1e1e1e',
        'bg-tertiary': '#252525',
        'text-primary': '#e0e0e0',
        'text-secondary': '#a0a0a0',
        'accent': '#ff5722',
        'accent-hover': '#ff7043',
      }
    },
  },
  plugins: [],
}
