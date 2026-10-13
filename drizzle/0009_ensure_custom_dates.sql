CREATE TABLE IF NOT EXISTS "custom_dates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"couple_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"category" text NOT NULL DEFAULT 'Sorpresa',
	"difficulty" text NOT NULL DEFAULT 'fácil',
	"completed" boolean DEFAULT false NOT NULL,
	"completed_at" timestamp,
	"location_name" text,
	"location_lat" numeric(10, 7),
	"location_lng" numeric(10, 7),
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "custom_date_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"custom_date_id" uuid NOT NULL,
	"url" text NOT NULL,
	"uploaded_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "custom_dates" ADD COLUMN IF NOT EXISTS "category" text;
--> statement-breakpoint
ALTER TABLE "custom_dates" ADD COLUMN IF NOT EXISTS "difficulty" text;
--> statement-breakpoint
UPDATE "custom_dates" SET "category" = 'Sorpresa' WHERE "category" IS NULL;
--> statement-breakpoint
UPDATE "custom_dates" SET "difficulty" = 'fácil' WHERE "difficulty" IS NULL;
--> statement-breakpoint
ALTER TABLE "custom_dates" ALTER COLUMN "category" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "custom_dates" ALTER COLUMN "difficulty" SET NOT NULL;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "custom_dates" ADD CONSTRAINT "custom_dates_couple_id_couples_id_fk" FOREIGN KEY ("couple_id") REFERENCES "public"."couples"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "custom_date_images" ADD CONSTRAINT "custom_date_images_custom_date_id_custom_dates_id_fk" FOREIGN KEY ("custom_date_id") REFERENCES "public"."custom_dates"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
