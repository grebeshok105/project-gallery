/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: "#0b0d12",
          soft: "#11141b",
          card: "#161a23",
          hover: "#1d222d",
        },
        line: "#262c38",
        accent: {
          DEFAULT: "#4f8ff7",
          soft: "#7dabf8",
          dim: "#2b5cae",
        },
        ok: "#3ecf8e",
        warn: "#ffb454",
        danger: "#ff5c7c",
      },
      fontFamily: {
        sans: ["Inter", "Segoe UI", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Consolas", "monospace"],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(79,143,247,0.25), 0 8px 40px -12px rgba(79,143,247,0.35)",
        card: "0 4px 24px -8px rgba(0,0,0,0.5)",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.4s ease-out",
      },
    },
  },
  plugins: [],
};
