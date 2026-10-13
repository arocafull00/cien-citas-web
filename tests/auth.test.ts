import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ auth: vi.fn(), currentUser: vi.fn(), select: vi.fn(), insert: vi.fn() }));
vi.mock('@clerk/nextjs/server', () => ({ auth: mocks.auth, currentUser: mocks.currentUser }));
vi.mock('@/db', () => ({ db: { select: mocks.select, insert: mocks.insert } }));
import { requireAuth, requireCouple } from '@/lib/auth-middleware';
const query = (result: unknown[]) => ({ from: () => ({ where: () => ({ limit: async () => result }) }) });
beforeEach(() => { mocks.auth.mockResolvedValue({ userId: 'user-clerk-existing' }); });
describe('autenticación compartida con Expo', () => {
  it('rechaza solicitudes sin sesión aunque adjunten un Bearer', async () => {
    mocks.auth.mockResolvedValue({ userId: null });
    await expect(requireAuth(new Request('https://app.example/api/dates', { headers: { Authorization: 'Bearer not-a-session' } }))).rejects.toMatchObject({ status: 401 });
    expect(mocks.select).not.toHaveBeenCalled();
  });
  it('reutiliza el registro existente de Clerk, sin crear otra cuenta', async () => {
    mocks.select.mockReturnValue(query([{ id: 'existing-db-id', clerkUserId: 'user-clerk-existing' }]));
    expect(await requireAuth()).toMatchObject({ userId: 'existing-db-id', clerkUserId: 'user-clerk-existing' });
    expect(mocks.insert).not.toHaveBeenCalled(); expect(mocks.currentUser).not.toHaveBeenCalled();
  });
  it('no permite consultar recuerdos antes de vincular una pareja', async () => {
    mocks.select.mockReturnValue(query([]));
    await expect(requireCouple('existing-db-id')).rejects.toMatchObject({ status: 403 });
  });
  it('identifica al otro miembro para ambos lados de la pareja', async () => {
    mocks.select.mockReturnValue(query([{ id: 'couple', user1Id: 'first', user2Id: 'second' }]));
    expect(await requireCouple('first')).toEqual({ coupleId: 'couple', partnerId: 'second' });
    expect(await requireCouple('second')).toEqual({ coupleId: 'couple', partnerId: 'first' });
  });
});
