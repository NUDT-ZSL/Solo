/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        base: '#1e1e2e',
        surface: '#262637',
        surfaceHover: '#2e2e42',
        text: '#cdd6f4',
        textSub: '#9399b2',
        teal: '#0db9a0',
        tealDark: '#0a9680',
        border: 'rgba(205, 214, 244, 0.1)',
        borderHover: 'rgba(205, 214, 244, 0.2)',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'monospace'],
        sans: ['Noto Sans SC', 'sans-serif'],
      },
      borderRadius: {
        card: '12px',
      },
    },
  },
  plugins: [],
};
