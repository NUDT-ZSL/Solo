/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: {
          primary: "#0f172a",
          secondary: "#1e293b",
          tertiary: "#334155",
        },
        text: {
          primary: "#e2e8f0",
          secondary: "#94a3b8",
        },
        accent: {
          blue: "#3b82f6",
          orange: "#f97316",
        },
        classYoga: "#e9d5ff",
        classStrength: "#fed7aa",
        classCycling: "#fecaca",
        classPilates: "#bfdbfe",
      },
      fontFamily: {
        sans: ["Outfit", "Source Sans 3", "system-ui", "sans-serif"],
      },
      transitionTimingFunction: {
        smooth: "cubic-bezier(0.4, 0, 0.2, 1)",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-out": {
          "0%": { opacity: "1" },
          "100%": { opacity: "0" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        "fade-out": "fade-out 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      },
    },
  },
  plugins: [],
};
