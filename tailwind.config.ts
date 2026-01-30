import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        yop: {
          purple: "#6d28d9",
          violet: "#7c3aed",
          indigo: "#4f46e5",
          blue: "#2563eb",
          navy: "#1e3a5f",
          black: "#0f172a",
          light: "#f8fafc",
          white: "#ffffff",
        },
      },
    },
  },
  plugins: [],
};
export default config;