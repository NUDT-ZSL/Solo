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
        warm: {
          yellow: '#F5A623',
          orange: '#E8834A',
          brown: '#5D4037',
          cream: '#FFF8F0',
          tan: '#F5E6D3',
          wood: '#C9A96E',
        }
      },
      fontFamily: {
        display: ['"Playfair Display"', 'serif'],
        body: ['Nunito', 'sans-serif'],
      },
      animation: {
        'pulse-glow': 'pulseGlow 1.5s ease-in-out infinite',
        'bounce-in': 'bounceIn 400ms ease-out',
        'note-pop': 'notePop 300ms ease-out',
        'slide-in': 'slideIn 300ms ease-out',
        'fade-in': 'fadeIn 300ms ease-out',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 8px 2px rgba(245,166,35,0.3)' },
          '50%': { boxShadow: '0 0 20px 6px rgba(245,166,35,0.6)' },
        },
        bounceIn: {
          '0%': { transform: 'scale(1)' },
          '30%': { transform: 'scale(1.2)' },
          '60%': { transform: 'scale(0.9)' },
          '100%': { transform: 'scale(1)' },
        },
        notePop: {
          '0%': { transform: 'scale(0)', opacity: '0' },
          '60%': { transform: 'scale(1.15)', opacity: '1' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateX(20px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
