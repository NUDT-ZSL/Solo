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
        'nav': '#5D4037',
        'nav-light': '#795548',
        'primary': '#8B4513',
        'primary-dark': '#6B3410',
        'cream': '#F5EDE1',
        'cream-dark': '#EDE4D4',
        'input-bg': '#F5F5F5',
        'input-focus': '#FFF8E7',
        'amber-overlay': 'rgba(139, 69, 19, 0.4)',
      },
      screens: {
        'tablet': '768px',
        'desktop': '1024px',
      },
    },
  },
  plugins: [],
};
