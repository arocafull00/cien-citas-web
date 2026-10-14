export const runtime = 'nodejs';
import { requireAuth } from '@/lib/auth-middleware';
import { db } from '@/db';
import { couples, inviteCodes } from '@/db/schema';
import { and, eq, isNotNull, isNull, or } from 'drizzle-orm';

function generateInviteCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => chars[b % chars.length])
    .join('');
}

export async function POST(request: Request) {
  try {
    const { userId } = await requireAuth(request);

    const pending = await db
      .select()
      .from(inviteCodes)
      .where(eq(inviteCodes.userId, userId))
      .limit(1);

    if (pending.length > 0) {
      return Response.json({ code: pending[0].code });
    }

    const bonded = await db
      .select()
      .from(couples)
      .where(
        and(
          or(eq(couples.user1Id, userId), eq(couples.user2Id, userId)),
          isNotNull(couples.user2Id),
        ),
      )
      .limit(1);

    if (bonded.length > 0) {
      return Response.json({ error: 'Ya tienes una pareja vinculada' }, { status: 409 });
    }

    await db.delete(couples).where(and(eq(couples.user1Id, userId), isNull(couples.user2Id)));

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const code = generateInviteCode();
      const onInvite = await db
        .select({ id: inviteCodes.id })
        .from(inviteCodes)
        .where(eq(inviteCodes.code, code))
        .limit(1);
      if (onInvite.length > 0) {
        continue;
      }
      const onCouple = await db
        .select({ id: couples.id })
        .from(couples)
        .where(eq(couples.inviteCode, code))
        .limit(1);
      if (onCouple.length > 0) {
        continue;
      }
      const [row] = await db.insert(inviteCodes).values({ userId, code }).returning();
      return Response.json({ code: row.code }, { status: 201 });
    }

    return Response.json({ error: 'Error interno' }, { status: 500 });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error(e);
    return Response.json({ error: 'Error interno' }, { status: 500 });
  }
}
