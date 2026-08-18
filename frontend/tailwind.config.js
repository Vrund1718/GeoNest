/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        sand: {
          DEFAULT: '#FBF3E6',
          50: '#FDFAF3',
          100: '#FBF3E6',
          200: '#F3E5CB',
        },
        indigo: {
          DEFAULT: '#2C3A63',
          50: '#EEF1F8',
          100: '#D9DFEF',
          200: '#AEB9D9',
          300: '#7A8ABB',
          400: '#4E5F92',
          500: '#354573',
          600: '#2C3A63',
          700: '#223052',
          800: '#1B2744',
          900: '#141D35',
        },
        marigold: {
          DEFAULT: '#E8A33D',
          50: '#FCF3E2',
          100: '#F7E2B9',
          500: '#E8A33D',
          600: '#D28B27',
        },
        ink: {
          DEFAULT: '#2A2420',
          50: '#F4F2F0',
          100: '#E3DFDB',
          600: '#3A322C',
          700: '#2A2420',
        },
        sage: {
          DEFAULT: '#5B8C5A',
          500: '#5B8C5A',
        },
        coral: {
          DEFAULT: '#E0685A',
          500: '#E0685A',
        },
        brand: {
          50: '#eef8ff',
          100: '#d9edff',
          200: '#bce0ff',
          300: '#8dcbff',
          400: '#55aeff',
          500: '#2d8dff',
          600: '#176ef5',
          700: '#1359dd',
          800: '#164ab2',
          900: '#18418c',
        },
        accent: {
          500: '#ff8a3d',
          600: '#f16f20',
        },
        surface: {
          50: '#f9fafb',
          100: '#f3f4f6',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['"Fredoka"', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(16,24,40,.04), 0 1px 3px rgba(16,24,40,.06)',
        pop: '0 10px 30px rgba(16,24,40,.08)',
        paper: '0 30px 60px -20px rgba(44, 58, 99, 0.25), 0 18px 36px -18px rgba(44, 58, 99, 0.2)',
        insetSoft: 'inset 0 1px 0 rgba(255,255,255,0.25)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      animation: {
        'float-slow': 'float 8s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
    },
  },
  plugins: [],
};
