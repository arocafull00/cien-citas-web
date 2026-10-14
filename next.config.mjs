import withSerwistInit from '@serwist/next';
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';

const offlineAssets = [
  'offline-ui.js',
  'offline-ui.css',
  ...readdirSync('public/images/cards')
    .filter((name) => name.endsWith('.webp'))
    .map((name) => `images/cards/${name}`),
  'fonts/Lora/static/Lora-Regular.woff2',
  'fonts/Lora/static/Lora-Bold.woff2',
  'fonts/Lora/static/Lora-Italic.woff2',
  'fonts/SourceSans3-Regular.woff2',
  'fonts/SourceSans3-SemiBold.woff2',
];
const assetEntries = offlineAssets.map((path) => ({
  url: `/${path}`,
  revision: createHash('sha256')
    .update(readFileSync(`public/${path}`))
    .digest('hex'),
}));

const withSerwist = withSerwistInit({
  swSrc: 'src/app/sw.ts',
  swDest: 'public/sw.js',
  disable: process.env.NODE_ENV !== 'production',
  additionalPrecacheEntries: [
    { url: '/offline', revision: process.env.VERCEL_GIT_COMMIT_SHA || String(Date.now()) },
    ...assetEntries,
  ],
});

export default withSerwist({
  experimental: { staleTimes: { dynamic: 60 } },
  async headers() {
    return [
      { source: '/api/:path*', headers: [{ key: 'Cache-Control', value: 'private, no-store' }] },
      {
        source: '/sw.js',
        headers: [{ key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' }],
      },
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
});
