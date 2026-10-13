export function isDbTimeoutError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  let current: unknown = error;
  for (let depth = 0; depth < 6; depth += 1) {
    if (!current || typeof current !== 'object') {
      break;
    }
    const record = current as Record<string, unknown>;
    if (record.code === 'ETIMEDOUT') {
      return true;
    }
    const message = typeof record.message === 'string' ? record.message : '';
    if (
      message.includes('Request timed out') ||
      message.includes('timed out') ||
      message.includes('Error connecting to database')
    ) {
      return true;
    }
    current = record.cause ?? record.sourceError;
  }

  return false;
}

export function dbUnavailableResponse(): Response {
  return Response.json(
    { error: 'Base de datos no disponible, reintenta en unos segundos' },
    { status: 503 },
  );
}

export function handleApiError(error: unknown): Response {
  if (error instanceof Response) {
    return error;
  }
  if (isDbTimeoutError(error)) {
    return dbUnavailableResponse();
  }
  console.error(error);
  return Response.json({ error: 'Error interno' }, { status: 500 });
}
