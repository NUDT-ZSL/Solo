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
        cream: "#FAF8F5",
        "warm-gray": "#E8E6E1",
        "warm-yellow": "#F5C542",
        "cool-blue": "#6BA3D6",
        "neutral-dot": "#C8C8C8",
        "soft-amber": "#D4A843",
        "deep-night": "#3A4A6B",
      },
      fontFamily: {
        serif: ['"Noto Serif SC"', 'Georgia', 'serif'],
        display: ['"ZCOOL XiaoWei"', 'serif'],
      },
      borderRadius: {
        glass: "16px",
      },
      backdropBlur: {
        glass: "12px",
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-in-out",
        "float-particle": "floatParticle 20s infinite ease-in-out",
        "pulse-glow": "pulseGlow 3s infinite ease-in-out",
        "slide-up": "slideUp 0.4s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        floatParticle: {
          "0%, 100%": { transform: "translateY(0) translateX(0)" },
          "25%": { transform: "translateY(-20px) translateX(10px)" },
          "50%": { transform: "translateY(-10px) translateX(-5px)" },
          "75%": { transform: "translateY(-30px) translateX(15px)" },
        },
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 8px rgba(245,197,66,0.3)" },
          "50%": { boxShadow: "0 0 20px rgba(245,197,66,0.6)" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
