import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        crt: {
          bg: "#0a0a0f",
          panel: "#0d0d14",
          input: "#06060b",
          amber: "#ffb000",
          "amber-dim": "#cc8800",
        },
        neon: {
          cyan: "#00ffff",
          green: "#39ff14",
          red: "#ff073a",
        },
      },
    },
  },
  plugins: [],
};
export default config;
