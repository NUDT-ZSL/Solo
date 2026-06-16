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
        primary: '#1E1E2E',
        accent: '#E74C3C',
        gold: '#F1C40F',
        card: {
          from: '#2C3E50',
          to: '#34495E',
        },
        platform: '#27AE60',
        unlock: {
          bg: '#1A1A2E',
          border: '#FFD700',
        },
        muted: '#7F8C8D',
        star: '#BDC3C7',
        shadow: '#1A252F',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
      borderRadius: {
        card: '16px',
        pill: '20px',
        unlock: '20px',
      },
      transitionDuration: {
        star: '200ms',
        card: '300ms',
        carousel: '500ms',
        log: '300ms',
        fade: '400ms',
      },
    },
  },
  plugins: [],
};
