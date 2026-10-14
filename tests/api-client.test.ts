import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient, clearApiCache } from '@/lib/api-client';
import { beginContext, clearPrivateData } from '@/lib/offline';
import 'fake-indexeddb/auto';

const fetchMock = vi.fn();
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.stubGlobal('window', {});
  vi.stubGlobal('navigator', { onLine: true });
  vi.stubGlobal('fetch', fetchMock);
  clearApiCache();
  fetchMock.mockReset();
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('caché privada de navegación', () => {
  it('reutiliza el detalle y el perfil durante un minuto y después vuelve a pedirlos', async () => {
    fetchMock.mockImplementation(async () => Response.json({ version: fetchMock.mock.calls.length }));
    for (const path of ['/api/dates/1', '/api/profile/me', '/api/profile/achievements']) {
      const first = await apiClient.get(path);
      expect(await apiClient.get(path)).toEqual(first);
    }
    expect(fetchMock).toHaveBeenCalledTimes(3);
    vi.advanceTimersByTime(60_000);
    expect(await apiClient.get('/api/dates/1')).toEqual({ version: 4 });
  });

  it('comparte peticiones simultáneas y permite actualizar explícitamente', async () => {
    fetchMock.mockImplementation(async () => Response.json({ version: fetchMock.mock.calls.length }));
    const values = await Promise.all([apiClient.get('/api/dates'), apiClient.get('/api/dates')]);
    expect(values).toEqual([{ version: 1 }, { version: 1 }]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(await apiClient.get('/api/dates', { fresh: true })).toEqual({ version: 2 });
  });

  it.each(['patch', 'post', 'delete'] as const)('invalida las lecturas tras %s para mostrar los cambios al navegar', async method => {
    fetchMock.mockImplementation(async () => Response.json({ version: fetchMock.mock.calls.length }));
    await apiClient.get('/api/dates/1');
    await apiClient.get('/api/profile/achievements');
    if (method === 'delete') await apiClient.delete('/api/upload/image-1');
    else await apiClient[method]('/api/dates/1', { completed: true });
    expect(await apiClient.get('/api/dates/1')).toEqual({ version: 4 });
    expect(await apiClient.get('/api/profile/achievements')).toEqual({ version: 5 });
  });

  it('no usa datos antiguos al verificar un guardado cuya respuesta se perdió', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ completed: false }));
    await apiClient.get('/api/dates/1');
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    await expect(apiClient.patch('/api/dates/1', { completed: true })).rejects.toThrow();
    fetchMock.mockResolvedValueOnce(Response.json({ completed: true }));
    expect(await apiClient.get('/api/dates/1')).toEqual({ completed: true });
  });

  it('descarta la caché al cambiar de usuario o pareja y al borrar los recuerdos', async () => {
    fetchMock.mockImplementation(async () => Response.json({ version: fetchMock.mock.calls.length }));
    await apiClient.get('/api/dates/1');
    beginContext();
    expect(await apiClient.get('/api/dates/1')).toEqual({ version: 2 });
    // Storage cleanup also works outside a mounted browser UI.
    vi.stubGlobal('window', undefined);
    await clearPrivateData();
    vi.stubGlobal('window', {});
    expect(await apiClient.get('/api/dates/1')).toEqual({ version: 3 });
  });

  it('una respuesta de una sesión anterior no repuebla la caché de la nueva', async () => {
    let finish!: (response: Response) => void;
    fetchMock.mockImplementationOnce(() => new Promise<Response>(resolve => { finish = resolve; }));
    const previous = apiClient.get('/api/dates/1');
    beginContext();
    fetchMock.mockResolvedValueOnce(Response.json({ owner: 'new' }));
    expect(await apiClient.get('/api/dates/1')).toEqual({ owner: 'new' });
    finish(Response.json({ owner: 'previous' }));
    await previous;
    expect(await apiClient.get('/api/dates/1')).toEqual({ owner: 'new' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('no conserva errores y borra otras lecturas ante una sesión rechazada', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ dates: [] }));
    await apiClient.get('/api/dates');
    fetchMock.mockResolvedValueOnce(Response.json({ error: 'Sesión caducada' }, { status: 401 }));
    await expect(apiClient.get('/api/profile/me')).rejects.toThrow('Sesión caducada');
    fetchMock.mockResolvedValueOnce(Response.json({ user: 'new' }));
    expect(await apiClient.get('/api/profile/me')).toEqual({ user: 'new' });
    fetchMock.mockResolvedValueOnce(Response.json({ dates: ['updated'] }));
    expect(await apiClient.get('/api/dates')).toEqual({ dates: ['updated'] });
  });

  it('no comparte datos entre peticiones del servidor ni cachea búsquedas de lugares', async () => {
    fetchMock.mockImplementation(async () => Response.json({}));
    vi.stubGlobal('window', undefined);
    await apiClient.get('/api/dates'); await apiClient.get('/api/dates');
    vi.stubGlobal('window', {});
    await apiClient.get('/api/places?q=Turia'); await apiClient.get('/api/places?q=Turia');
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });
});
