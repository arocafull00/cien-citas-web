import type { MetadataRoute } from 'next';
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: '100 Citas antes de casarse',
    short_name: '100 Citas',
    lang: 'es',
    description: 'Vivid vuestra historia, una cita a la vez.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#fcf9f4',
    theme_color: '#884e4f',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
