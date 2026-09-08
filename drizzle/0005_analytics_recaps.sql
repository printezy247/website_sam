CREATE TABLE "recaps" (
	"id" text PRIMARY KEY NOT NULL,
	"week_start" text NOT NULL,
	"text_ms" text NOT NULL,
	"text_en" text NOT NULL,
	"stats" jsonb,
	"model" text,
	"posted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "recaps_week_start_unique" UNIQUE("week_start")
);
--> statement-breakpoint
CREATE TABLE "visits" (
	"id" text PRIMARY KEY NOT NULL,
	"day" text NOT NULL,
	"campaign" text DEFAULT '(direct)' NOT NULL,
	"path" text NOT NULL,
	"hits" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "campaign" text;--> statement-breakpoint
CREATE UNIQUE INDEX "visits_day_campaign_path_uq" ON "visits" USING btree ("day","campaign","path");