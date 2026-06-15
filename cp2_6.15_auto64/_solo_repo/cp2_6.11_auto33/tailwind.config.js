/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'warm-cream': '#F5F0E8',
        'warm-gray': '#E8DDD0',
        'dark-graphite': '#2B2B2B',
        'warm-orange': '#D48B60',
        'accent-gold': '#C5A55A',
        'export-indigo': '#4F46E5',
        'export-lavender': '#A78BFA',
      },
      fontFamily: {
        serif: ['Playfair Display', 'Noto Serif SC', 'Georgia', 'serif'],
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      boxShadow: {
        'warm-soft': '0 8px 32px rgba(74, 63, 53, 0.08)',
        'warm-hover': '0 8px 20px rgba(0, 0, 0, 0.15)',
      },
    },
  },
  plugins: [],
};
