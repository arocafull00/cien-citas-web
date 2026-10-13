ALTER TABLE "users" RENAME COLUMN "neon_auth_id" TO "clerk_user_id";--> statement-breakpoint
ALTER TABLE "users" RENAME CONSTRAINT "users_neon_auth_id_unique" TO "users_clerk_user_id_unique";
