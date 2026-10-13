import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
export default defineConfig([
  ...nextVitals, ...nextTs,
  { rules: { '@next/next/no-img-element': 'off' } },
  globalIgnores(['.next/**', 'public/offline-ui.*', 'public/sw*', 'public/swe-worker*', 'next-env.d.ts', 'test-results/**', 'playwright-report/**']),
]);
