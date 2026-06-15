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
          bg: '#1e1e2e',
          surface: '#313244',
          overlay: '#45475a',
          text: '#cdd6f4',
          subtext: '#a6adc8',
          accent: '#89b4fa',
          green: '#a6e3a1',
          red: '#f38ba8',
          yellow: '#f9e2af',
          peach: '#fab387',
          mauve: '#cba6f7',
          teal: '#94e2d5',
          blue: '#89b4fa',
          lavender: '#b4befe',
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
        sans: ['Noto Sans SC', 'Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'slide-in': 'slideIn 0.3s ease-out forwards',
        'fade-in': 'fadeIn 0.3s ease-out forwards',
        'score-count': 'scoreCount 1s ease-out forwards',
        'progress-ring': 'progressRing 2s ease-out forwards',
      },
      keyframes: {
        slideIn: {
          '0%': { transform: 'scaleX(0)', opacity: '0' },
          '100%': { transform: 'scaleX(1)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scoreCount: {
          '0%': { opacity: '0.5' },
          '100%': { opacity: '1' },
        },
        progressRing: {
          '0%': { strokeDashoffset: '283' },
          '100%': { strokeDashoffset: 'var(--target-offset)' },
        },
      },
    },
  },
  plugins: [],
};
