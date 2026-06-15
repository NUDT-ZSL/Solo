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
        "aurora-dark": "#0a0e27",
        "aurora-deep": "#1a0533",
        "aurora-cyan": "#00d4ff",
        "aurora-pink": "#ff00ff",
        "aurora-green": "#00ff88",
        "emotion-blue": "#4FC3F7",
        "emotion-orange": "#FF8A65",
        "emotion-green": "#66BB6A",
        "emotion-gray": "#90A4AE",
        "emotion-red": "#EF5350",
        "emotion-pink": "#F06292",
        "emotion-purple": "#AB47BC",
        "emotion-yellow": "#FFD54F",
      },
      fontFamily: {
        orbitron: ["Orbitron", "sans-serif"],
        noto: ["Noto Sans SC", "sans-serif"],
      },
      animation: {
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        float: "float 3s ease-in-out infinite",
        "wave-pulse": "wave-pulse 1.5s ease-in-out infinite",
      },
      keyframes: {
        "pulse-glow": {
          "0%, 100%": { opacity: "1", boxShadow: "0 0 20px rgba(0, 212, 255, 0.5)" },
          "50%": { opacity: "0.8", boxShadow: "0 0 40px rgba(0, 212, 255, 0.8)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "wave-pulse": {
          "0%, 100%": { transform: "scaleY(1)", opacity: "1" },
          "50%": { transform: "scaleY(1.5)", opacity: "0.7" },
        },
      },
      backdropBlur: {
        xs: "2px",
      },
      boxShadow: {
        "glow-cyan": "0 0 20px rgba(0, 212, 255, 0.5), 0 0 60px rgba(0, 212, 255, 0.2)",
        "glow-pink": "0 0 20px rgba(255, 0, 255, 0.5), 0 0 60px rgba(255, 0, 255, 0.2)",
        "glow-green": "0 0 20px rgba(0, 255, 136, 0.5), 0 0 60px rgba(0, 255, 136, 0.2)",
      },
    },
  },
  plugins: [],
};
