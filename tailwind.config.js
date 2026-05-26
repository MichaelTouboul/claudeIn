/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        agent: {
          cyan: "#06b6d4",
          blue: "#3b82f6",
          green: "#22c55e",
          yellow: "#eab308",
          orange: "#f97316",
          red: "#ef4444",
          purple: "#a855f7",
          pink: "#ec4899",
        },
      },
    },
  },
  plugins: [],
};
