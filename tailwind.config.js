/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // near-black premium base (never pure #000)
        ink: {
          DEFAULT: "#0a0b0e",
          raised: "#101218",
          sunken: "#070809",
        },
        fg: {
          DEFAULT: "#f3f4f6",
          muted: "#a6adba",
          dim: "#6b7280",
          faint: "#454b57",
        },
        accent: {
          DEFAULT: "#6ea8fe",
          soft: "#9cc4ff",
          deep: "#2f6bd6",
        },
        ok: "#34d399",
        warn: "#f5b454",
        danger: "#fb7185",
        gold: "#e7b85c",
      },
      fontFamily: {
        sans: ["'Plus Jakarta Sans Variable'", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono Variable'", "ui-monospace", "monospace"],
      },
      borderRadius: {
        bezel: "1.75rem",
        core: "1.4rem",
      },
      transitionTimingFunction: {
        spring: "cubic-bezier(0.32, 0.72, 0, 1)",
      },
      boxShadow: {
        // soft, diffused, tinted to background hue (no harsh black)
        soft: "0 1px 2px rgba(0,0,0,0.4), 0 18px 50px -24px rgba(0,0,0,0.7)",
        lift: "0 1px 2px rgba(0,0,0,0.4), 0 30px 70px -28px rgba(0,0,0,0.8)",
        "inner-hi": "inset 0 1px 0 0 rgba(255,255,255,0.06)",
        "accent-glow": "0 14px 40px -16px rgba(110,168,254,0.55)",
      },
      keyframes: {
        "rise": {
          from: { opacity: "0", transform: "translateY(18px)", filter: "blur(6px)" },
          to: { opacity: "1", transform: "translateY(0)", filter: "blur(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.96)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
      },
      animation: {
        rise: "rise 0.7s cubic-bezier(0.32,0.72,0,1) both",
        "scale-in": "scale-in 0.4s cubic-bezier(0.32,0.72,0,1) both",
      },
    },
  },
  plugins: [],
};
