CREATE TABLE "achievements" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"icon_set" text NOT NULL,
	"icon_name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "couple_achievements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"couple_id" uuid NOT NULL,
	"achievement_id" text NOT NULL,
	"unlocked_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "couple_achievement_unique" UNIQUE("couple_id","achievement_id")
);
--> statement-breakpoint
ALTER TABLE "couple_achievements" ADD CONSTRAINT "couple_achievements_couple_id_couples_id_fk" FOREIGN KEY ("couple_id") REFERENCES "public"."couples"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "couple_achievements" ADD CONSTRAINT "couple_achievements_achievement_id_achievements_id_fk" FOREIGN KEY ("achievement_id") REFERENCES "public"."achievements"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
INSERT INTO "achievements" ("id", "title", "description", "icon_set", "icon_name", "sort_order") VALUES
('primera_cita', 'Primera cita', 'Completasteis vuestra primera cita juntos.', 'material', 'favorite', 1),
('diez_citas', 'Diez aventuras', 'Diez citas completadas. El camino está tomando forma.', 'material', 'auto-awesome', 2),
('mitad', 'A mitad del camino', 'Cincuenta citas. La mitad de vuestra historia está escrita.', 'material', 'star', 3),
('el_final', 'La historia completa', 'Las 100 citas. Un legado que os pertenece para siempre.', 'material', 'workspace-premium', 4),
('foodies', 'Foodies', 'Cinco citas gastronómicas. Tenéis buen paladar.', 'material', 'restaurant', 5),
('aventureros', 'Aventureros', 'Cinco citas de aventura. Sois valientes.', 'material-community', 'hiking', 6),
('todas_categorias', 'Exploradores totales', 'Al menos una cita de cada categoría. Habéis probado de todo.', 'material', 'map', 7),
('con_fotos', 'Fotógrafos del amor', 'Diez citas con fotos. Vuestros recuerdos están bien guardados.', 'material', 'photo-camera', 8);