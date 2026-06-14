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
        primary: "#f59e0b",
        secondary: "#1e293b",
        background: "#f8fafc",
        textMain: "#1f2937",
        textSecondary: "#64748b",
        matchPerfect: "#22c55e",
        matchPartial: "#eab308",
        matchLittle: "#ef4444",
      },
      keyframes: {
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "star-bounce": {
          "0%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.2)" },
          "100%": { transform: "scale(1)" },
        },
      },
      animation: {
        "fade-in-up": "fade-in-up 0.4s ease-out forwards",
        "star-bounce": "star-bounce 0.3s ease-out",
      },
    },
  },
  plugins: [],
};
