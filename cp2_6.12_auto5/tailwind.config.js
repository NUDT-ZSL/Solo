export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: { center: true },
    extend: {
      colors: {
        dark: {
          bg: '#0D1117',
          editor: '#1E1E1E',
          output: '#161B22',
          navbar: '#1E1E1E',
        },
        light: {
          bg: '#F6F8FA',
          editor: '#FFFFFF',
          output: '#F6F8FA',
          navbar: '#FFFFFF',
        },
        success: '#3FB950',
        error: '#F85149',
        warning: '#D29922',
        accent: '#58A6FF',
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
};
