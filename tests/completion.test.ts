import { describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ patch: vi.fn(), get: vi.fn() }));
vi.mock('@/lib/api-client', () => ({
  apiClient: mocks,
  isNetworkError: (e: Error) => e.message === 'network',
}));
import { persistCompletedDate } from '@/lib/persist-completed-date';
describe('guardar un recuerdo con respuesta perdida', () => {
  const payload = {
    completed: true as const,
    completedAt: '2026-10-04T10:00:00Z',
    notes: 'Un día bonito',
    locationName: 'Turia',
    locationLat: 39.47,
    locationLng: -0.37,
  };
  it('reconoce un guardado confirmado aunque se pierda la respuesta PATCH', async () => {
    mocks.patch.mockRejectedValue(new Error('network'));
    mocks.get.mockResolvedValue({ date: { ...payload, coupleDateId: 'saved-id' } });
    expect(await persistCompletedDate('1', undefined, payload)).toBe('saved-id');
    expect(mocks.patch).toHaveBeenCalledTimes(1);
  });
  it('no presenta como guardado un recuerdo diferente al enviado', async () => {
    mocks.patch.mockRejectedValue(new Error('network'));
    mocks.get.mockResolvedValue({
      date: { ...payload, notes: 'Otro recuerdo', coupleDateId: 'saved-id' },
    });
    await expect(persistCompletedDate('1', undefined, payload)).rejects.toThrow('network');
  });
});
