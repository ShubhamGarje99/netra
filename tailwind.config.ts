import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./scenes/**/*.{js,ts,jsx,tsx,mdx}",
    "./dashboard/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Tactical dark ops palette — Redesign
        void:     "#0A0A0F",   // near space black-blue
        surface:  "#0F111A",   // dark panel
        panel:    "#161A25",   // slightly lighter panel
        border:   "#1F2433",   // subtle border
        signal:   "#FFFFFF",   // crisp text
        pulse:    "#00FFB2",   // electric teal (main accent)
        violet:   "#7C3AED",   // violet secondary
        ops:      "#00FFB2",   // operational teal instead of green
        critical: "#FF3B3B",   // alert red
        high:     "#FF7700",   // warning orange
        medium:   "#F5C542",   // caution yellow
        dim:      "#888888",   // muted text
        noise:    "#1F2433",   // border alias
        static:   "#0F111A",   // compat alias
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        mono:    ["var(--font-mono)", "monospace"],
        sans:    ["var(--font-sans)", "sans-serif"],
      },
      fontSize: {
        "10xl": ["10rem", { lineHeight: "0.88", letterSpacing: "-0.04em" }],
        "9xl":  ["8rem",  { lineHeight: "0.88", letterSpacing: "-0.04em" }],
      },
    },
  },
  plugins: [],
};

export default config;
