/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: {
          50: "#FDFBF7",
          100: "#FAF5EB",
          200: "#F3E9D6",
          300: "#E8D7B9",
        },
        espresso: {
          700: "#4A3525",
          800: "#362417",
          900: "#23170E",
        },
        sunrise: {
          400: "#F59E0B",
          500: "#D97706",
          600: "#B45309",
        },
      },
      fontFamily: {
        sans: ["var(--font-prompt)", "sans-serif"],
      },
    },
  },
  plugins: [],
};
