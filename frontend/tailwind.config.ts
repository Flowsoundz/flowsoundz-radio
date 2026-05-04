import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#040711",
        panel: "#0f172a",
        accent: "#22d3ee",
      },
    },
  },
  plugins: [],
};

export default config;
