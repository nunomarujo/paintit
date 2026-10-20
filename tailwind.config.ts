import type { Config } from 'tailwindcss';

// Linguagem visual do protótipo v05 (docs/referencia): fundo quente, petróleo,
// sálvia e linhas suaves. "tinta" é a cor da marca; "slate" foi ajustado aos
// cinzentos esverdeados do protótipo, para que os componentes existentes o sigam.
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        serif: ['var(--font-serif)', 'Georgia', 'serif'],
        sans: ['var(--font-inter)', 'ui-sans-serif', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      colors: {
        tinta: {
          50: '#eef3ed',
          100: '#dce6d9',
          200: '#c6d6c4',
          500: '#458b81',
          600: '#173f42',
          700: '#24565a',
          900: '#12302a',
        },
        slate: {
          50: '#f6f5f0',
          100: '#f0f2ee',
          200: '#e1e5de',
          300: '#d4dcd3',
          400: '#9aa59f',
          500: '#62716c',
          600: '#55635e',
          700: '#2c3d41',
          900: '#172c35',
        },
        amber: {
          50: '#faf3e5',
          100: '#faf0dc',
          200: '#eee1c5',
          700: '#805b20',
          800: '#775b2c',
        },
        sage: '#e9eee8',
        terracota: '#c4572f',
        paper: '#f6f5f0',
      },
      borderRadius: {
        xl: '10px',
        '2xl': '16px',
      },
    },
  },
  plugins: [],
};

export default config;
