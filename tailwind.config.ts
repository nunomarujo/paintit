import type { Config } from 'tailwindcss';

// Linguagem visual do protótipo v05 (docs/referencia): fundo quente, petróleo,
// sálvia e linhas suaves. "tinta" é a cor da marca; "slate" foi ajustado aos
// cinzentos esverdeados do protótipo, para que os componentes existentes o sigam.
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'ui-sans-serif', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      colors: {
        tinta: {
          50: '#eef3ed',
          100: '#dce6d9',
          200: '#c6d6c4',
          // 300, 400 e 800 faltavam, e 14 sítios do código usavam-nos: o Tailwind não gera a classe,
          // a cor não pinta nada e o estado de rato não acontece. Encontrado na auditoria visual de
          // 26/10/2026 — entre os afectados estava o ponto da fase em curso no ecrã do dia.
          300: '#a9c2a6',
          400: '#6ba398',
          500: '#458b81',
          600: '#173f42',
          700: '#24565a',
          800: '#1b4447',
          900: '#12302a',
        },
        slate: {
          50: '#f6f5f0',
          100: '#f0f2ee',
          200: '#e1e5de',
          300: '#d4dcd3',
          400: '#6b7873', // era #9aa59f, que dava 2,33:1 sobre o fundo creme e reprovava AA
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
        // Paleta da marca (ver :root em globals.css). Usada na página de planos e na barra lateral.
        marca: {
          ink: 'var(--ink)',
          'ink-soft': 'var(--ink-soft)',
          cream: 'var(--cream)',
          orange: 'var(--orange)',
          'orange-deep': 'var(--orange-deep)',
          border: 'var(--border)',
          muted: 'var(--muted)',
          tag: 'var(--tag-bg)',
          // Cores funcionais do caderno de desenho (26/10/2026): superfícies e estado, para além
          // dos 8 tokens de marca. `field` é o contorno de campos (border não tem contraste para
          // isso); `selected` nunca aparece só; `attention`/`error` seguem a regra 13 do CLAUDE.md.
          surface: 'var(--surface)',
          field: 'var(--field)',
          selected: 'var(--selected)',
          attention: 'var(--attention)',
          'attention-bg': 'var(--attention-bg)',
          error: 'var(--error)',
          'error-bg': 'var(--error-bg)',
          'info-bg': 'var(--info-bg)',
        },
        sage: '#e9eee8',
        terracota: '#a8441f', // escurecido de #c4572f: branco por cima passa de 4,42:1 para 5,98:1 (WCAG AA)
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
