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
        forest: {
          50: "#FAF8F0",
          100: "#F5F0E3",
          200: "#E8F5E0",
          300: "#D4EAC8",
          400: "#B8D9A8",
          500: "#7BA98F",
          600: "#5A8A6E",
          700: "#3D6B50",
          800: "#2D4F3A",
          900: "#1E3425",
        },
        warm: {
          50: "#FFF9F0",
          100: "#F5EDE0",
          200: "#E8D8C0",
          300: "#D4C0A0",
          400: "#B8A080",
          500: "#8B7355",
          600: "#6B5740",
          700: "#4D3F2E",
          800: "#3A2F22",
          900: "#28201A",
        },
        gold: {
          300: "#F0D68A",
          400: "#D4A843",
          500: "#C49530",
        },
      },
      backgroundImage: {
        "gradient-forest": "linear-gradient(135deg, #FAF8F0 0%, #E8F5E0 50%, #D4EAC8 100%)",
        "gradient-forest-dark": "linear-gradient(135deg, #F5F0E3 0%, #D4EAC8 50%, #B8D9A8 100%)",
        "gradient-card": "linear-gradient(135deg, rgba(255,255,255,0.6) 0%, rgba(232,245,224,0.4) 100%)",
      },
      boxShadow: {
        glass: "0 8px 32px rgba(139, 115, 85, 0.1)",
        "glass-hover": "0 16px 48px rgba(139, 115, 85, 0.18)",
        "glass-glow": "0 0 20px rgba(139, 115, 85, 0.15), 0 8px 32px rgba(139, 115, 85, 0.1)",
        "gold-glow": "0 0 24px rgba(212, 168, 67, 0.5), 0 0 48px rgba(212, 168, 67, 0.2)",
        "gold-pulse": "0 0 24px rgba(212, 168, 67, 0.6), 0 0 48px rgba(212, 168, 67, 0.3), 0 0 72px rgba(212, 168, 67, 0.1)",
        "resonance-glow": "0 0 30px rgba(123, 169, 143, 0.4), 0 0 60px rgba(123, 169, 143, 0.15)",
      },
      animation: {
        "float-in": "floatIn 0.6s ease-out forwards",
        "float-out": "floatOut 0.4s ease-in forwards",
        "resonance-pulse": "resonancePulse 0.8s ease-out forwards",
        "gold-pulse": "goldPulse 2s ease-in-out infinite",
        "gentle-bob": "gentleBob 3s ease-in-out infinite",
      },
      keyframes: {
        floatIn: {
          "0%": { transform: "translateY(60px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        floatOut: {
          "0%": { transform: "translateY(0)", opacity: "1" },
          "100%": { transform: "translateY(-40px)", opacity: "0" },
        },
        resonancePulse: {
          "0%": { transform: "scale(1)", opacity: "1" },
          "100%": { transform: "scale(1.5)", opacity: "0" },
        },
        goldPulse: {
          "0%, 100%": { boxShadow: "0 0 24px rgba(212, 168, 67, 0.5), 0 0 48px rgba(212, 168, 67, 0.2)" },
          "50%": { boxShadow: "0 0 32px rgba(212, 168, 67, 0.7), 0 0 64px rgba(212, 168, 67, 0.3)" },
        },
        gentleBob: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
      },
      fontFamily: {
        display: ['"ZCOOL XiaoWei"', "serif"],
        body: ['"Noto Sans SC"', "sans-serif"],
      },
    },
  },
  plugins: [],
}
