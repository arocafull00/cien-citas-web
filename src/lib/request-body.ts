export async function readJsonObject(request: Request): Promise<Record<string, unknown>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw Response.json({ error: 'Cuerpo de la petición no válido' }, { status: 400 });
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw Response.json({ error: 'Cuerpo de la petición no válido' }, { status: 400 });
  }
  return body as Record<string, unknown>;
}
