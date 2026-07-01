import type { Config } from "tailwindcss";
import defaultTheme from "tailwindcss/defaultTheme";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // Brand orange from switalk.com (== Tailwind orange). Aliased so the
        // accent is changed in one place, never by sweeping orange-* classes.
        brand: {
          50: "#FFF7ED",
          100: "#FFEDD5",
          200: "#FED7AA",
          500: "#F97316",
          600: "#EA580C",
          700: "#C2410C",
        },
        // Per-platform indicator dots (inbox list, channel chips) — taken
        // from the marketing site's channel row.
        channel: {
          whatsapp: "#22C55E",
          instagram: "#EC4899",
          messenger: "#0084FF",
          telegram: "#229ED9",
          email: "#64748B",
          webchat: "#8B5CF6",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", ...defaultTheme.fontFamily.sans],
      },
    },
  },
  plugins: [],
};
export default config;
