import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ requireAuth: vi.fn(), requireCouple: vi.fn(), select: vi.fn() }));
vi.mock('@/lib/auth-middleware', () => ({
  requireAuth: mocks.requireAuth,
  requireCouple: mocks.requireCouple,
}));
vi.mock('@/db', () => ({ db: { select: mocks.select } }));
import { PATCH } from '@/app/api/dates/[id]/route';
import { parseDatePatch } from '@/lib/date-validation';
import { parseCatalogDateId } from '@/lib/date-id';

const now = Date.parse('2026-10-15T12:00:00Z');

beforeEach(() => {
  mocks.requireAuth.mockResolvedValue({ userId: 'user-a' });
  mocks.requireCouple.mockResolvedValue({ coupleId: 'couple-a', partnerId: 'user-b' });
});

describe('validación de citas', () => {
  it('acepta un recuerdo completo', () => {
    expect(
      parseDatePatch(
        {
          completed: true,
          completedAt: '2026-10-14T20:00:00.000Z',
          locationName: 'Turia',
          locationLat: 39.47,
          locationLng: -0.37,
          notes: 'Un día bonito',
        },
        now,
      ).error,
    ).toBeUndefined();
  });

  it('rechaza fechas inválidas o futuras', () => {
    expect(parseDatePatch({ completedAt: 'ayer' }, now).error).toBe('Fecha inválida');
    expect(parseDatePatch({ completedAt: '2026-10-20T00:00:00Z' }, now).error).toBe(
      'La fecha no puede ser futura',
    );
  });

  it('rechaza tipos y valores fuera de rango', () => {
    expect(parseDatePatch({ completed: 'sí' }, now).error).toBeDefined();
    expect(parseDatePatch({ locationLat: 120 }, now).error).toBe('Coordenadas inválidas');
    expect(parseDatePatch({ notes: 'x'.repeat(10001) }, now).error).toBeDefined();
    expect(parseDatePatch({ title: 5 }, now).error).toBe('Título inválido');
  });

  it('solo acepta identificadores numéricos del catálogo', () => {
    expect(parseCatalogDateId('12')).toBe(12);
    expect(parseCatalogDateId('12abc')).toBeNull();
    expect(parseCatalogDateId('-1')).toBeNull();
  });

  it('responde 400 sin tocar la base de datos ante datos inválidos', async () => {
    const context = { params: Promise.resolve({ id: '1' }) };
    const invalidJson = new Request('https://app.example/api/dates/1', {
      method: 'PATCH',
      body: '{',
    });
    expect((await PATCH(invalidJson, context)).status).toBe(400);
    const badDate = new Request('https://app.example/api/dates/1', {
      method: 'PATCH',
      body: JSON.stringify({ completed: true, completedAt: 'mañana' }),
    });
    expect((await PATCH(badDate, context)).status).toBe(400);
    expect(mocks.select).not.toHaveBeenCalled();
  });
});
