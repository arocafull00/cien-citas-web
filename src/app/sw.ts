import { Serwist, NetworkOnly } from 'serwist';
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist';
declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}
declare const self: ServiceWorkerGlobalScope;
const sw: Serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  precacheOptions: {
    plugins: [
      {
        cachedResponseWillBeUsed: async ({ request, cachedResponse }) => {
          if (request.destination === 'document' && cachedResponse) {
            // Cached responses carry /offline as response.url; strip it so fragments survive navigation.
            return new Response(await cachedResponse.text(), {
              status: cachedResponse.status,
              headers: cachedResponse.headers,
            });
          }
          return cachedResponse;
        },
      },
    ],
  },
  skipWaiting: false,
  clientsClaim: true,
  runtimeCaching: [
    {
      matcher: () => true,
      handler: new NetworkOnly({
        plugins: [
          {
            handlerDidError: async ({ request }): Promise<Response | undefined> => {
              if (request.destination !== 'document') return;
              const cached = await sw.matchPrecache('/offline');
              if (!cached) return;
              const route = JSON.stringify(request.url).replace(/</g, '\\u003c');
              return new Response(
                (await cached.text()).replace(
                  '<head>',
                  `<head><script>window.__100citasOfflineUrl=${route}</script>`,
                ),
                { headers: { 'Content-Type': 'text/html; charset=utf-8' } },
              );
            },
          },
        ],
      }),
    },
  ],
});
sw.addEventListeners();
