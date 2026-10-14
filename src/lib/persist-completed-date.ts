import { apiClient, isNetworkError } from '@/lib/api-client';
import type { DateDetail } from '@/store/dates-store';

export type CompletePatchPayload = {
  completed: true;
  completedAt: string;
  locationName: string | null;
  locationLat: number | null;
  locationLng: number | null;
  notes: string | null;
};

function matchesCompletedIntent(detail: DateDetail, payload: CompletePatchPayload): boolean {
  if (!detail.completed) {
    return false;
  }

  const intentAt = new Date(payload.completedAt).getTime();
  const savedAt = detail.completedAt ? new Date(detail.completedAt).getTime() : null;

  if (savedAt == null) {
    return false;
  }

  if (Math.abs(savedAt - intentAt) > 60_000) {
    return false;
  }

  if ((detail.locationName ?? null) !== payload.locationName) {
    return false;
  }

  if ((detail.notes ?? null) !== (payload.notes ?? null)) {
    return false;
  }

  if (payload.locationLat != null && payload.locationLng != null) {
    if (detail.locationLat == null || detail.locationLng == null) {
      return false;
    }

    const latMatch = Math.abs(detail.locationLat - payload.locationLat) < 0.0001;
    const lngMatch = Math.abs(detail.locationLng - payload.locationLng) < 0.0001;

    if (!latMatch || !lngMatch) {
      return false;
    }
  }

  return true;
}

export async function persistCompletedDate(
  dateId: string,
  existingCoupleDateId: string | undefined,
  payload: CompletePatchPayload,
): Promise<string> {
  try {
    if (!existingCoupleDateId) {
      const patchRes = await apiClient.patch<{ coupleDateId: string }>(
        `/api/dates/${dateId}`,
        payload,
      );
      return patchRes.coupleDateId;
    }

    await apiClient.patch(`/api/dates/${dateId}`, payload);
    return existingCoupleDateId;
  } catch (e) {
    if (!isNetworkError(e)) {
      throw e;
    }

    const { date: detail } = await apiClient.get<{ date: DateDetail }>(`/api/dates/${dateId}`);

    if (!matchesCompletedIntent(detail, payload) || !detail.coupleDateId) {
      throw e;
    }

    return detail.coupleDateId;
  }
}
