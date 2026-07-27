import type { Config } from 'tailwindcss'

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        sand: '#FBF3E6',
        indigo: '#2C3A63',
        marigold: '#E8A33D',
        ink: '#2A2420',
        sage: '#5B8C5A',
        coral: '#E0685A',
      },
      fontFamily: {
        display: ['Fredoka', 'sans-serif'],
        sans: ['Inter', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
} satisfies Config
