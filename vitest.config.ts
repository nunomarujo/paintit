import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // O mesmo ficheiro vazio para o qual o Next resolve `server-only` no servidor, para que os
      // módulos de `src/lib` se possam testar aqui sem o pacote atirar o erro de componente cliente.
      'server-only': fileURLToPath(new URL('./node_modules/server-only/empty.js', import.meta.url)),
    },
  },
  test: { include: ['src/**/*.test.ts', 'supabase/tests/**/*.test.ts'],
    testTimeout: 30_000 },
});
