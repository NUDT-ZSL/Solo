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
        primary: {
          DEFAULT: '#5B8C5A',
          dark: '#4A7348',
          light: '#6FA56E',
        },
        cream: {
          DEFAULT: '#F5F0E1',
          dark: '#E8E0CB',
        },
        earth: {
          DEFAULT: '#3D2B1F',
          light: '#5A4032',
        },
        category: {
          vegetable: '#5B8C5A',
          fruit: '#E8873B',
          meat: '#C04040',
          seafood: '#3B7CC0',
          drygoods: '#8B5A2B',
        }
      },
      borderRadius: {
        'card': '12px',
        'chip': '20px',
      },
      fontFamily: {
        display: ['Georgia', 'serif'],
      },
      backgroundImage: {
        'linen': "radial-gradient(circle, rgba(61,43,31,0.06) 1px, transparent 1px)",
      },
    },
  },
  plugins: [],
};
