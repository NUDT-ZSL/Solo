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
        earth: {
          warm: '#F5E6C8',
          brown: '#3E2723',
          wheat: '#D4A373',
          wheatHover: '#E0B97E',
          cream: '#FFF8E7',
        },
        emotion: {
          serene: '#6ECB63',
          noisy: '#FF6B6B',
          melancholy: '#5C6BC0',
          cheerful: '#FFD93D',
          mysterious: '#AB47BC',
          leisurely: '#26A69A',
          tense: '#EF5350',
          warm: '#FF8A65',
          ethereal: '#42A5F5',
          nostalgic: '#8D6E63',
        },
      },
      fontFamily: {
        display: ['Playfair Display', 'serif'],
        body: ['Noto Sans SC', 'sans-serif'],
      },
      borderRadius: {
        'map': '16px',
      },
      boxShadow: {
        'map': 'rgba(0,0,0,0.1) 0px 4px 12px',
      },
      transitionTimingFunction: {
        'earth': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      animation: {
        'ripple': 'ripple 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards',
        'wave': 'wave 1.2s ease-in-out infinite',
      },
      keyframes: {
        ripple: {
          '0%': { transform: 'scale(0)', opacity: '0.6' },
          '100%': { transform: 'scale(1)', opacity: '0' },
        },
        wave: {
          '0%, 100%': { transform: 'scaleY(0.5)' },
          '50%': { transform: 'scaleY(1)' },
        },
      },
    },
  },
  plugins: [],
};
