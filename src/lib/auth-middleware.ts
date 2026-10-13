import 'server-only';
import { auth, currentUser } from '@clerk/nextjs/server';
import { db } from '@/db';
import { users, couples } from '@/db/schema';
import { eq, or, and, isNotNull } from 'drizzle-orm';

export async function requireAuth(request?: Request) {
  void request;
  const session = await auth();
  if (!session.userId) throw Response.json({ error: 'No autorizado' }, { status: 401 });
  let [user] = await db.select().from(users).where(eq(users.clerkUserId, session.userId)).limit(1);
  if (!user) {
    const identity = await currentUser();
    if (!identity) throw Response.json({ error: 'No autorizado' }, { status: 401 });
    const email = identity.emailAddresses.find(e => e.id === identity.primaryEmailAddressId)?.emailAddress || '';
    const name = identity.fullName || identity.firstName || email.split('@')[0] || 'Mi historia';
    const created = await db.insert(users).values({ clerkUserId: session.userId, name, avatarUrl: identity.imageUrl })
      .onConflictDoNothing({ target: users.clerkUserId }).returning();
    user = created[0] || (await db.select().from(users).where(eq(users.clerkUserId, session.userId)).limit(1))[0];
  }
  return { userId: user.id, clerkUserId: session.userId, email: '' };
}

export async function requireCouple(userId: string) {
  const [couple] = await db.select().from(couples).where(and(
    or(eq(couples.user1Id, userId), eq(couples.user2Id, userId)), isNotNull(couples.user2Id),
  )).limit(1);
  if (!couple) throw Response.json({ error: 'No tienes pareja vinculada' }, { status: 403 });
  return { coupleId: couple.id, partnerId: couple.user1Id === userId ? couple.user2Id : couple.user1Id };
}
