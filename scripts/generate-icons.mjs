import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
const require = createRequire(import.meta.url);
const sharp = createRequire(require.resolve('next/package.json'))('sharp');
await mkdir('public/icons', { recursive: true });
for (const size of [192, 512])
  await sharp('public/images/icon.png')
    .resize(size, size)
    .png()
    .toFile(`public/icons/icon-${size}.png`);
await sharp('public/images/icon.png')
  .resize(180, 180)
  .png()
  .toFile('public/icons/apple-touch-icon.png');
await sharp('public/images/icon.png')
  .resize(450, 450)
  .extend({ top: 31, bottom: 31, left: 31, right: 31, extendWith: 'copy' })
  .png()
  .toFile('public/icons/maskable-512.png');
console.log('Iconos PWA generados desde el icono original.');
