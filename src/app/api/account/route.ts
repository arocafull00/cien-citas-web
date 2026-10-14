import { requireAuth } from '@/lib/auth-middleware';
import { handleApiError } from '@/lib/db-errors';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
export async function GET(request: Request) {
  try {
    const { userId } = await requireAuth(request);
    const [account] = await db
      .select({
        id: users.id,
        clerkUserId: users.clerkUserId,
        name: users.name,
        avatarUrl: users.avatarUrl,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    return Response.json({ account });
  } catch (error) {
    return handleApiError(error);
  }
}
