import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        ocean: '#0d1b2a',
        'dark-bg': '#0a0e1a',
        'accent-blue': '#4a9eff',
        'accent-amber': '#ffa726',
        'text-secondary': '#8899aa',
        border: '#2a3a4a',
      },
    },
  },
  plugins: [],
};

export default config;
