DO $neon_to_clerk$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'neon_auth_id'
  ) THEN
    ALTER TABLE "public"."users" RENAME COLUMN "neon_auth_id" TO "clerk_user_id";
  END IF;
END $neon_to_clerk$;
