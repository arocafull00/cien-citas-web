import sharp from 'sharp';
import { stat } from 'node:fs/promises';
import { resolve } from 'node:path';
let before = 0; let after = 0;
for (let i = 1; i <= 5; i++) {
  const source = resolve(`public/images/cards/${i}.png`);
  const target = resolve(`public/images/cards/${i}.webp`);
  await sharp(source).resize({ width: 768, height: 768, fit: 'cover', withoutEnlargement: true }).webp({ lossless: true, effort: 6 }).toFile(target);
  before += (await stat(source)).size; after += (await stat(target)).size;
}
console.log(JSON.stringify({ originalBytes: before, thumbnailBytes: after, reductionPercent: Math.round((1 - after / before) * 100) }));
