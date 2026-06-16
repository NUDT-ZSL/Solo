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
        garden: {
          bg: '#F1F8E9',
          card: '#FFFFFF',
          title: '#33691E',
          text: '#4E342E',
          nav: '#2E7D32',
          border: '#66BB6A',
          focus: '#81C784',
          normal: '#C8E6C9',
          nearHarvest: '#FFF9C4',
          needsWater: '#FFCDD2',
          water: '#42A5F5',
          waterLight: '#64B5F6',
          waterDark: '#1E88E5',
          level1: '#8BC34A',
          level2: '#4CAF50',
          level3: '#388E3C',
        }
      },
      fontFamily: {
        display: ['"Playfair Display"', 'serif'],
        body: ['"Noto Sans SC"', 'sans-serif'],
      },
      keyframes: {
        dropFall: {
          '0%': { transform: 'translateY(-20px)', opacity: '0' },
          '30%': { opacity: '1' },
          '100%': { transform: 'translateY(60px)', opacity: '0' },
        },
        floatUp: {
          '0%': { transform: 'translateY(0)' },
          '100%': { transform: 'translateY(-6px)' },
        }
      },
      animation: {
        'drop-fall': 'dropFall 0.3s ease-in forwards',
        'float-up': 'floatUp 0.3s ease forwards',
      }
    },
  },
  plugins: [],
};
