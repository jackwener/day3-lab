import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#F7931A",
        "primary-deep": "#EA580C",
        highlight: "#FFD600",
        bg: "#030304",
        card: "#0F1115",
        "card-hover": "#1A1D24",
        "text-primary": "#FFFFFF",
        "text-secondary": "#94A3B8",
        error: "#EF4444",
        success: "#22C55E",
      },
      fontFamily: {
        heading: ["var(--font-heading)", "sans-serif"],
        body: ["var(--font-body)", "PingFang SC", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      screens: {
        xs: "640px",
        sm: "640px",
        md: "768px",
        lg: "1024px",
        xl: "1280px",
      },
      boxShadow: {
        "glow-orange": "0 0 20px -5px rgba(234,88,12,0.5)",
        "glow-orange-strong": "0 0 30px -5px rgba(247,147,26,0.6)",
        "glow-gold": "0 0 20px rgba(255,214,0,0.3)",
        "glow-card": "0 0 50px -10px rgba(247,147,26,0.1)",
        "glow-input": "0 10px 20px -10px rgba(247,147,26,0.3)",
      },
      animation: {
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "float": "float 3s ease-in-out infinite",
        "shimmer": "shimmer 2s linear infinite",
        "fade-in": "fadeIn 0.5s ease-out",
        "slide-up": "slideUp 0.5s ease-out",
        "scale-in": "scaleIn 0.3s ease-out",
      },
      keyframes: {
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 20px -5px rgba(234,88,12,0.3)" },
          "50%": { boxShadow: "0 0 30px -5px rgba(247,147,26,0.6)" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-6px)" },
        },
        "shimmer": {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "fadeIn": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slideUp": {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "scaleIn": {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
      },
      maxWidth: {
        content: "1200px",
      },
    },
  },
  plugins: [],
};
export default config;
