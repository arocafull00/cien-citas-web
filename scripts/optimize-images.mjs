import sharp from 'sharp';
import { readdir, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
let before = 0;
let after = 0;
async function convert(source, target, resize, webp) {
  await sharp(resolve(source)).resize(resize).webp(webp).toFile(resolve(target));
  before += (await stat(resolve(source))).size;
  after += (await stat(resolve(target))).size;
}
for (let i = 1; i <= 5; i++) {
  await convert(
    `public/images/cards/${i}.png`,
    `public/images/cards/${i}.webp`,
    { width: 768, height: 768, fit: 'cover', withoutEnlargement: true },
    { lossless: true, effort: 6 },
  );
}
const photos = (await readdir('public/images/onboarding'))
  .filter((name) => /\.(png|jpe?g)$/.test(name))
  .map((name) => `public/images/onboarding/${name}`);
for (const source of [...photos, 'public/images/login-header.png']) {
  await convert(
    source,
    source.replace(/\.(png|jpe?g)$/, '.webp'),
    { width: 960, withoutEnlargement: true },
    { quality: 80, effort: 6 },
  );
}
console.log(
  JSON.stringify({
    originalBytes: before,
    optimizedBytes: after,
    reductionPercent: Math.round((1 - after / before) * 100),
  }),
);
