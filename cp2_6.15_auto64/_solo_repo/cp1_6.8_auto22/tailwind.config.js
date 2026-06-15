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
        wall: {
          bg: '#1a1a2e',
          deep: '#16213e',
          dark: '#0f0f23',
        },
        neon: {
          blue: '#4a00e0',
          purple: '#8e2de2',
          pink: '#e040fb',
          cyan: '#00e5ff',
        },
        warm: {
          orange: '#FF6B35',
          yellow: '#F7C948',
          red: '#ff4757',
        },
        cool: {
          teal: '#4ECDC4',
          slate: '#556270',
          blue: '#74b9ff',
        },
        dark: {
          navy: '#2C3E50',
          violet: '#8E44AD',
          indigo: '#4a00e0',
        },
      },
      fontFamily: {
        display: ['"ZCOOL XiaoWei"', 'serif'],
        body: ['"Noto Sans SC"', 'sans-serif'],
      },
      animation: {
        'float-slow': 'floatSlow 8s ease-in-out infinite',
        'float-medium': 'floatMedium 6s ease-in-out infinite',
        'float-fast': 'floatFast 4s ease-in-out infinite',
        'glow-pulse': 'glowPulse 3s ease-in-out infinite',
        'spark-burst': 'sparkBurst 0.6s ease-out forwards',
        'flame-rise': 'flameRise 1s ease-out forwards',
        'fly-away': 'flyAway 0.8s ease-in forwards',
        'fade-in-up': 'fadeInUp 0.5s ease-out forwards',
        'star-twinkle': 'starTwinkle 4s ease-in-out infinite',
      },
      keyframes: {
        floatSlow: {
          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
          '50%': { transform: 'translateY(-12px) rotate(1.5deg)' },
        },
        floatMedium: {
          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
          '50%': { transform: 'translateY(-8px) rotate(-1deg)' },
        },
        floatFast: {
          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
          '50%': { transform: 'translateY(-5px) rotate(0.8deg)' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 8px rgba(142,45,226,0.4), 0 0 16px rgba(74,0,224,0.2)' },
          '50%': { boxShadow: '0 0 16px rgba(142,45,226,0.6), 0 0 32px rgba(74,0,224,0.4)' },
        },
        sparkBurst: {
          '0%': { transform: 'scale(0)', opacity: '1' },
          '100%': { transform: 'scale(2.5)', opacity: '0' },
        },
        flameRise: {
          '0%': { transform: 'translateY(0) scale(1)', opacity: '1' },
          '100%': { transform: 'translateY(-80px) scale(0.3)', opacity: '0' },
        },
        flyAway: {
          '0%': { transform: 'translateY(0) scale(1)', opacity: '1' },
          '100%': { transform: 'translateY(-120px) scale(0.5)', opacity: '0' },
        },
        fadeInUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        starTwinkle: {
          '0%, 100%': { opacity: '0.3' },
          '50%': { opacity: '1' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};
