import type { Config } from 'tailwindcss'

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'chai-cup': '#A67B5B',
        'street-light': '#F5D27E',
        'monsoon-sky': '#5A889C',
        'kolkata-grey': '#F0F0F0',
        'ink-black': '#2D2D2D',
      },
      fontFamily: {
        display: ['"Poppins"', 'sans-serif'],
        body: ['"Noto Sans Devanagari"', '"Roboto"', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config
