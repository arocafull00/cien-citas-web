import { test, expect, type Page } from '@playwright/test';
import type { Snapshot } from '@/lib/types';
const photoUrl = 'https://fixture.example/couple-test/catalog/1/recuerdo.png';
const detail = {
  id: '1',
  isCustom: false,
  title: 'Picnic en el río de Valencia',
  description: 'Un picnic, cartitas y un paseo por el río.',
  category: 'Romántico' as const,
  difficulty: 'fácil',
  isCustomized: false,
  completed: true,
  completedAt: '2026-10-01T12:00:00Z',
  locationName: 'Jardín del Turia',
  locationLat: 39.47,
  locationLng: -0.37,
  notes: 'Nuestro primer picnic juntos.',
  coupleDateId: 'date-db',
  images: [{ id: 'image-1', url: photoUrl }],
};
const snapshot: Snapshot = {
  account: { id: 'db-user', clerkUserId: 'user-test', name: 'Ana', avatarUrl: null },
  couple: {
    id: 'couple-test',
    inviteCode: 'ABC123',
    createdAt: '2026-01-01',
    partner: { name: 'Luis', avatarUrl: null },
  },
  dates: [
    { ...detail, imageCount: 1, coverImageUrl: photoUrl },
    {
      ...detail,
      id: '2',
      title: 'Cena temática en casa',
      description: 'Cocinad platos de un país distinto.',
      category: 'En casa',
      completed: false,
      completedAt: null,
      imageCount: 0,
      coverImageUrl: null,
      coupleDateId: null,
    },
    {
      ...detail,
      id: '100',
      title: 'Una historia para siempre',
      description: 'Celebrad vuestra historia juntos.',
      category: 'Romántico',
      completed: false,
      completedAt: null,
      imageCount: 0,
      coverImageUrl: null,
      coupleDateId: null,
    },
  ],
  details: { '1': detail },
  profile: {
    user: {
      id: 'db-user',
      name: 'Ana',
      avatarUrl: null,
      createdAt: '2026-01-01',
      notifyPartnerActivity: true,
    },
    couple: { id: 'couple-test', joinedAt: '2026-01-01', partnerName: 'Luis' },
    stats: { totalCompleted: 1, categoriesCompleted: 1, daysActive: 3 },
  },
  achievements: [
    {
      id: 'primera_cita',
      title: 'La primera de muchas',
      description: 'Habéis completado vuestra primera cita.',
      iconName: 'heart',
      unlocked: true,
      unlockedAt: '2026-10-01',
    },
  ],
  updatedAt: '2026-10-04T12:00:00Z',
};
async function prepare(page: Page) {
  await page.goto('/offline');
  await page.evaluate(async (snapshot) => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller)
      await new Promise<void>((resolve) =>
        navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), {
          once: true,
        }),
      );
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('100citas-offline-v1', 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const tx = db.transaction(['snapshots', 'meta'], 'readwrite');
    tx.objectStore('snapshots').put(snapshot, 'user-test:couple-test');
    tx.objectStore('meta').put('user-test:couple-test', 'active');
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
    const cache = await caches.open('100citas-photos-v1-user-test:couple-test');
    const image = await fetch('/images/onboarding/memory.jpg');
    const blob = await image.blob();
    await cache.put(
      '/api/media?url=' + encodeURIComponent(snapshot.details['1'].images[0].url),
      new Response(blob, {
        headers: { 'Content-Type': 'image/jpeg', 'x-citas-cached-at': String(Date.now()) },
      }),
    );
  }, snapshot);
  await page.reload();
  await expect(page.getByRole('heading', { name: '1 citas completadas' })).toBeVisible();
}
test('sin datos guardados muestra una alternativa clara', async ({ page }) => {
  await page.goto('/offline');
  await expect(page.getByRole('heading', { name: 'Tu diario te espera' })).toBeVisible();
});
test('manifest e iconos permiten instalar la app', async ({ request }) => {
  const manifest = await (await request.get('/manifest.webmanifest')).json();
  expect(manifest.display).toBe('standalone');
  expect(manifest.icons.some((icon: { purpose: string }) => icon.purpose === 'maskable')).toBe(
    true,
  );
  for (const icon of manifest.icons) expect((await request.get(icon.src)).status()).toBe(200);
});
test('las API privadas rechazan una sesión ausente', async ({ request }) => {
  for (const path of ['/api/account', '/api/dates', '/api/couples/me', '/api/places?q=Valencia'])
    expect((await request.get(path)).status()).toBe(401);
});
test('buscar y filtrar funciona sobre recuerdos guardados', async ({ page }) => {
  await prepare(page);
  await page.getByRole('searchbox').fill('picnic');
  await expect(page.locator('.date-card')).toHaveCount(1);
  await page.getByRole('searchbox').fill('');
  await page.getByRole('button', { name: 'Pendientes', exact: true }).click();
  await expect(page.locator('.date-card')).toHaveCount(2);
  await page.getByRole('button', { name: 'En casa', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Cena temática en casa' })).toBeVisible();
});
test('el listado conserva dos columnas y cabe en un móvil estrecho', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await prepare(page);
  await page.evaluate(() => document.fonts.ready);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const columns = await page
    .locator('.virtual-date-row')
    .first()
    .evaluate((el) => getComputedStyle(el).gridTemplateColumns.split(' ').length);
  expect(columns).toBe(2);
  for (const card of await page.locator('.date-card').all())
    expect(
      await card.evaluate(
        (el) =>
          el.querySelector('.category-pill')!.getBoundingClientRect().bottom <=
            el.getBoundingClientRect().bottom && el.getBoundingClientRect().right <= innerWidth,
      ),
    ).toBe(true);
  await page.screenshot({ path: 'test-results/offline-feed-mobile.png', fullPage: true });
});
test('en pantalla grande mantiene únicamente la columna móvil', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await prepare(page);
  expect(await page.locator('.app-shell').evaluate((el) => el.getBoundingClientRect().width)).toBe(
    480,
  );
});
test('una recarga de un detalle funciona sin conexión y muestra la foto cacheada', async ({
  page,
  context,
}) => {
  await prepare(page);
  await context.setOffline(true);
  await page.goto('/date/1');
  await expect(page.getByRole('heading', { name: 'Picnic en el río de Valencia' })).toBeVisible();
  await expect(page.getByText('Nuestro primer picnic juntos.')).toBeVisible();
  await expect(page.locator('.hero-background')).toHaveJSProperty('complete', true);
  await expect(page.locator('.hero-background')).not.toHaveJSProperty('naturalWidth', 0);
  await expect(page.getByRole('link', { name: 'Editar nuestro recuerdo' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Marcar como pendiente' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Abrir foto 1', exact: true }).scrollIntoViewIfNeeded();
  await expect(page.locator('.photo-gallery img')).toBeVisible();
  await page.screenshot({ path: 'test-results/offline-detail-mobile.png', fullPage: true });
});
test('el visor abre fotos y devuelve el foco al cerrar', async ({ page, context }) => {
  await prepare(page);
  await context.setOffline(true);
  await page.goto('/offline?date=1');
  const button = page.getByRole('button', { name: 'Abrir foto 1', exact: true });
  await button.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Cerrar visor' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(button).toBeFocused();
});
test('un detalle no consultado muestra aviso offline', async ({ page, context }) => {
  await prepare(page);
  await context.setOffline(true);
  await page.goto('/date/2');
  await expect(
    page.getByRole('heading', { name: 'Este recuerdo aún no está guardado' }),
  ).toBeVisible();
});
test('perfil y logros guardados están disponibles offline', async ({ page, context }) => {
  await prepare(page);
  await context.setOffline(true);
  await page.goto('/profile');
  await expect(page.getByRole('heading', { name: 'Ana & Luis' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'La primera de muchas' })).toBeVisible();
});
test('los enlaces del diario navegan entre recuerdos y perfil sin conexión', async ({
  page,
  context,
}) => {
  await prepare(page);
  await context.setOffline(true);
  await page.getByRole('link', { name: /Picnic en el río/ }).click();
  await expect(page.getByText('Nuestro primer picnic juntos.')).toBeVisible();
  await page.getByRole('link', { name: 'Nosotros', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Ana & Luis' })).toBeVisible();
});
test('un cierre de sesión en otra pestaña borra recuerdos y fotos', async ({ page }) => {
  await prepare(page);
  await page.evaluate(async () => {
    const channel = new BroadcastChannel('100citas-session');
    channel.postMessage('logout');
    channel.close();
  });
  await expect(page.getByRole('heading', { name: 'Tu diario te espera' })).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        async () =>
          (await caches.keys()).filter((key) => key.startsWith('100citas-photos-v1-')).length,
      ),
    )
    .toBe(0);
});
test('login mantiene el onboarding y el acceso con Google', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: '100 citas antes de casarse' })).toBeVisible();
  await page.getByRole('button', { name: 'Saltar', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Continuar con Google' })).toBeVisible();
  await page.screenshot({ path: 'test-results/login-mobile.png', fullPage: true });
});
