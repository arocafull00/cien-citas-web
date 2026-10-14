import { build } from 'esbuild';
import postcss from 'postcss';
import tailwindcss from '@tailwindcss/postcss';
import { readFile, writeFile } from 'node:fs/promises';
await build({
  entryPoints: ['src/offline-entry.tsx'],
  bundle: true,
  minify: true,
  outfile: 'public/offline-ui.js',
  platform: 'browser',
  jsx: 'automatic',
  define: {
    'process.env.NODE_ENV': JSON.stringify(
      process.argv.includes('--dev') ? 'development' : 'production',
    ),
  },
});
const css = (await readFile('src/app/globals.css', 'utf8')).replace(
  "@import 'leaflet/dist/leaflet.css';",
  '',
);
const compiled = await postcss([tailwindcss({ base: process.cwd() })]).process(css, {
  from: 'src/app/globals.css',
});
await writeFile('public/offline-ui.css', compiled.css);
const fonts = `@font-face{font-family:Lora;src:url('/fonts/Lora/static/Lora-Regular.ttf')}@font-face{font-family:Lora;src:url('/fonts/Lora/static/Lora-Bold.ttf');font-weight:700}@font-face{font-family:Lora;src:url('/fonts/Lora/static/Lora-Italic.ttf');font-style:italic}@font-face{font-family:SourceSans;src:url('/fonts/SourceSans3-Regular.ttf')}@font-face{font-family:SourceSans;src:url('/fonts/SourceSans3-SemiBold.ttf');font-weight:600}:root{--font-lora:Lora;--font-sans:SourceSans}`;
await writeFile(
  'public/offline.html',
  `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#fcf9f4"><meta name="color-scheme" content="light"><title>Recuerdos guardados · 100 Citas</title><link rel="manifest" href="/manifest.webmanifest"><link rel="apple-touch-icon" href="/icons/apple-touch-icon.png"><link rel="stylesheet" href="/offline-ui.css"><style>${fonts}</style></head><body><main id="offline-root"></main><script src="/offline-ui.js" defer></script></body></html>`,
);
