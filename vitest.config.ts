import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('.', import.meta.url));
export default defineConfig({
  resolve: {
    alias: { '@/db': `${root}db`, '@': `${root}src`, 'server-only': `${root}tests/server-only.ts` },
  },
  test: { include: ['tests/**/*.test.ts'], environment: 'node', clearMocks: true },
});
