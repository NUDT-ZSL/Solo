/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#0f172a',
        surface: '#1e293b',
        accent: '#8b5cf6',
        accent2: '#a78bfa',
        'surface-light': '#334155',
      },
      keyframes: {
        'purple-glow': {
          '0%, 100%': { opacity: '0.05' },
          '50%': { opacity: '0.15' },
        },
        'ripple': {
          '0%': { transform: 'scale(0)', opacity: '0.6' },
          '100%': { transform: 'scale(4)', opacity: '0' },
        },
      },
      animation: {
        'purple-glow': 'purple-glow 2s ease-in-out infinite',
        'ripple': 'ripple 0.6s linear',
      },
    },
  },
  plugins: [],
}
