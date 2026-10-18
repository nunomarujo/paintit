import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        tinta: {
          50: '#f3f7f6',
          100: '#dcebe7',
          500: '#2f7d6d',
          600: '#256658',
          700: '#1e5247',
          900: '#12302a',
        },
      },
    },
  },
  plugins: [],
};

export default config;
