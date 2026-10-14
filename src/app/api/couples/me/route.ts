export const runtime = 'nodejs';
import { requireAuth } from '@/lib/auth-middleware';
import { db } from '@/db';
import { couples, users } from '@/db/schema';
import { eq, or } from 'drizzle-orm';

export async function GET(request: Request) {
  try {
    const { userId } = await requireAuth(request);

    const result = await db
      .select()
      .from(couples)
      .where(or(eq(couples.user1Id, userId), eq(couples.user2Id, userId)))
      .limit(1);

    if (result.length === 0) {
      return Response.json({ couple: null });
    }

    const couple = result[0];

    if (couple.user2Id === null) {
      return Response.json({ couple: null });
    }

    const partnerId = couple.user1Id === userId ? couple.user2Id : couple.user1Id;

    let partner: { name: string; avatarUrl: string | null } | null = null;

    if (partnerId) {
      const partnerResult = await db.select().from(users).where(eq(users.id, partnerId)).limit(1);

      if (partnerResult.length > 0) {
        partner = {
          name: partnerResult[0].name,
          avatarUrl: partnerResult[0].avatarUrl,
        };
      }
    }

    return Response.json({
      couple: {
        id: couple.id,
        inviteCode: couple.inviteCode,
        createdAt: couple.createdAt,
        partner,
      },
    });
  } catch (e) {
    if (e instanceof Response) return e;
    console.error(e);
    return Response.json({ error: 'Error interno' }, { status: 500 });
  }
}
