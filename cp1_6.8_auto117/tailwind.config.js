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
        ocean: {
          deep: "#0A1628",
          mid: "#0F2240",
          surface: "#1A3A5C",
        },
        emotion: {
          calm: "#4FC3F7",
          excited: "#FF8F00",
          sad: "#7E57C2",
          curious: "#26A69A",
          nostalgic: "#FFB74D",
        },
      },
      fontFamily: {
        display: ['"ZCOOL XiaoWei"', 'serif'],
        body: ['"Noto Sans SC"', 'sans-serif'],
      },
      animation: {
        "float": "float 6s ease-in-out infinite",
        "float-delay": "float 6s ease-in-out 2s infinite",
        "pulse-wave": "pulseWave 2s ease-in-out infinite",
        "swim": "swim 3s ease-in-out forwards",
        "fade-out": "fadeOut 1s ease-out 2s forwards",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" },
        },
        pulseWave: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(79, 195, 247, 0.4)" },
          "50%": { boxShadow: "0 0 20px 8px rgba(79, 195, 247, 0.1)" },
        },
        swim: {
          "0%": { transform: "translate(0, 0) scale(0.5)", opacity: "0" },
          "10%": { opacity: "1", transform: "translate(10px, -5px) scale(1)" },
          "50%": { transform: "translate(40px, -20px) scale(1)" },
          "100%": { transform: "translate(60px, -10px) scale(0.8)", opacity: "0.6" },
        },
        fadeOut: {
          "0%": { opacity: "0.6", transform: "scale(0.8)" },
          "100%": { opacity: "0", transform: "scale(0.3)" },
        },
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [],
};
