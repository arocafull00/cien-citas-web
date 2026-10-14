export const runtime = 'nodejs';
import { requireAuth } from '@/lib/auth-middleware';
import { db } from '@/db';
import { couples, inviteCodes } from '@/db/schema';
import { eq, or } from 'drizzle-orm';

export async function POST(request: Request) {
  try {
    const { userId } = await requireAuth(request);
    const { inviteCode } = await request.json();

    if (!inviteCode) {
      return Response.json({ error: 'Código requerido' }, { status: 400 });
    }

    const normalized = String(inviteCode).toUpperCase();

    const alreadyInCouple = await db
      .select()
      .from(couples)
      .where(or(eq(couples.user1Id, userId), eq(couples.user2Id, userId)))
      .limit(1);

    if (alreadyInCouple.length > 0) {
      return Response.json({ error: 'Ya tienes una pareja vinculada' }, { status: 409 });
    }

    const inviteRows = await db
      .select()
      .from(inviteCodes)
      .where(eq(inviteCodes.code, normalized))
      .limit(1);

    if (inviteRows.length === 0) {
      return Response.json({ error: 'Código no encontrado' }, { status: 404 });
    }

    const inviteRow = inviteRows[0];

    if (inviteRow.userId === userId) {
      return Response.json({ error: 'No puedes unirte a tu propio código' }, { status: 400 });
    }

    const [couple] = await db
      .insert(couples)
      .values({
        user1Id: inviteRow.userId,
        user2Id: userId,
        inviteCode: inviteRow.code,
      })
      .returning();

    await db.delete(inviteCodes).where(eq(inviteCodes.id, inviteRow.id));

    return Response.json({ coupleId: couple.id });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error(e);
    return Response.json({ error: 'Error interno' }, { status: 500 });
  }
}
