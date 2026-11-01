import type { Config } from 'tailwindcss';

// Paleta v5, decidida pelo promotor a 01/11/2026 (canvas "Quem Pinta — landing v5"):
// marinho #14213d (texto, marca), cobalto #2d5bff (ação, estado ativo), lima #c6f432 (só
// destaque sobre marinho), névoa #f1f4f7 (fundos), azul-pálido #e8edff (superfícies de
// seleção). "tinta" guarda o nome para não reescrever 177 ficheiros: o que mudou foi o valor.
// `terracota` ficou a apontar para o cobalto pela mesma razão — a página pública usava-a nos CTA.
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'ui-sans-serif', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      colors: {
        tinta: {
          50: '#f1f4f7',
          100: '#e8edff',
          200: '#d6deff',
          // 300, 400 e 800 faltavam, e 14 sítios do código usavam-nos: o Tailwind não gera a classe,
          // a cor não pinta nada e o estado de rato não acontece. Encontrado na auditoria visual de
          // 26/10/2026 — entre os afectados estava o ponto da fase em curso no ecrã do dia.
          300: '#b8c4ff',
          400: '#8aa3ff',
          500: '#4f75ff',
          600: '#2d5bff',
          700: '#2449d1',
          800: '#1b3bb0',
          900: '#14213d',
        },
        slate: {
          50: '#f1f4f7',
          100: '#eef1f5',
          200: '#dde3ea',
          300: '#c9d2dc',
          400: '#6b7684', // era #9aa59f, que dava 2,33:1 sobre o fundo creme e reprovava AA
          500: '#5a6478',
          600: '#475467',
          700: '#1f2f4d',
          900: '#14213d',
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
        sage: '#e8edff',
        lima: '#c6f432',
        terracota: '#2d5bff', // escurecido de #c4572f: branco por cima passa de 4,42:1 para 5,98:1 (WCAG AA)
        paper: '#f1f4f7',
      },
      /*
       * Escala de cantos fechada em dois raios (28/10/2026). Havia oito — 4, 6, 8, 9, 10, 11, 16px
       * e a pílula — e quatro deles (8, 9, 10, 11) são indistinguíveis a olho mas obrigam a
       * escolher. Em vez de reescrever 350 className, os degraus intermédios passam a resolver
       * para os dois que valem:
       *   8px  — o que se toca: botões, campos, pastilhas, itens de lista
       *   16px — o que contém: cartões, painéis, diálogos
       *   full — pílulas e pontos
       * Ver regra 17 do CLAUDE.md.
       */
      borderRadius: {
        DEFAULT: '8px',
        md: '8px',
        lg: '8px',
        xl: '8px',
        '2xl': '16px',
        '3xl': '16px',
      },
    },
  },
  plugins: [],
};

export default config;
