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
        gold: {
          DEFAULT: "#D4A843",
          50: "#FDF8EC",
          100: "#F9EDCC",
          200: "#F0D894",
          300: "#E6C15D",
          400: "#D4A843",
          500: "#B8892A",
          600: "#996D1F",
          700: "#7A5518",
          800: "#5C3F12",
          900: "#3E2A0C",
        },
        warm: {
          50: "#FAF7F2",
          100: "#F3EDE2",
          200: "#E8DFD0",
          300: "#D4C8B4",
          400: "#B0A28E",
          500: "#8C7E6A",
          600: "#6B5F4E",
          700: "#4D4438",
          800: "#3D3D3D",
          900: "#2A2520",
        },
      },
      fontFamily: {
        display: ['"Playfair Display"', "serif"],
        body: ['"Noto Sans SC"', "sans-serif"],
      },
      keyframes: {
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "modal-in": {
          "0%": { opacity: "0", transform: "scale(0.92)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "golden-pulse": {
          "0%": { boxShadow: "0 0 0 0 rgba(212, 168, 67, 0.6)" },
          "50%": { boxShadow: "0 0 24px 8px rgba(212, 168, 67, 0.3)" },
          "100%": { boxShadow: "0 0 0 0 rgba(212, 168, 67, 0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
      animation: {
        "fade-in-up": "fade-in-up 0.4s ease-out forwards",
        "modal-in": "modal-in 0.3s ease-out forwards",
        "golden-pulse": "golden-pulse 0.8s ease-out forwards",
        "fade-in": "fade-in 0.3s ease-out forwards",
      },
    },
  },
  plugins: [],
};
