/** @type {import('tailwindcss').Config} */

// PUBLIC_INTERFACE
/**
 * Tailwind configuration using the "Heritage Brown" theme.
 * Colors:
 * - primary: #92400E
 * - secondary: #FEF3C7
 * - success: #059669
 * - error: #DC2626
 * - background: #FFFBEB
 * - surface: #FFFFFF
 * - text: #111827
 */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#92400E",
        secondary: "#FEF3C7",
        success: "#059669",
        error: "#DC2626",
        text: "#111827",
        background: "#FFFBEB",
        surface: "#FFFFFF"
      },
      boxShadow: {
        soft: "0 2px 8px rgba(0,0,0,0.06)"
      }
    }
  },
  plugins: []
};
