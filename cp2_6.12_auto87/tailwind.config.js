/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'fantasy-dark': '#0a0e27',
        'fantasy-mid': '#1a1f4e',
        'fantasy-light': '#2a2f6e',
        'gold-accent': '#d4a844',
        'gold-bright': '#f0d060',
      },
      keyframes: {
        'gold-flow': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 8px rgba(212,168,68,0.4)' },
          '50%': { boxShadow: '0 0 20px rgba(212,168,68,0.9)' },
        },
        'flip-card': {
          '0%': { transform: 'rotateY(0deg)' },
          '100%': { transform: 'rotateY(180deg)' },
        },
      },
      animation: {
        'gold-flow': 'gold-flow 1.5s linear infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'flip-card': 'flip-card 0.3s ease-out',
      },
    },
  },
  plugins: [],
}
