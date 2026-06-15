/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./client/index.html", "./client/src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        'warm-brown': '#5C3D2E',
        'dark-brown': '#3E2723',
        'dark-gold': '#B8860B',
        'cream': '#F5F0E8',
        'copper': '#CD7F32',
        'light-brown': '#8B6914',
        'wood': '#6B4423',
        'wood-light': '#8B6914',
      },
      fontFamily: {
        'display': ['Playfair Display', 'Georgia', 'serif'],
        'retro': ['Special Elite', 'Courier New', 'monospace'],
      },
      animation: {
        'needle-swing': 'needleSwing 2s ease-in-out infinite',
        'pulse-ring': 'pulseRing 0.6s ease-out infinite',
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'float-up': 'floatUp 0.3s ease-out',
      },
      keyframes: {
        needleSwing: {
          '0%, 100%': { transform: 'rotate(-30deg)' },
          '50%': { transform: 'rotate(30deg)' },
        },
        pulseRing: {
          '0%': { transform: 'scale(1)', opacity: '0.6' },
          '100%': { transform: 'scale(2.5)', opacity: '0' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(205, 127, 50, 0.3)' },
          '100%': { boxShadow: '0 0 20px rgba(205, 127, 50, 0.6)' },
        },
        floatUp: {
          '0%': { transform: 'translateY(0)' },
          '100%': { transform: 'translateY(-2px)' },
        },
      },
    },
  },
  plugins: [],
}
