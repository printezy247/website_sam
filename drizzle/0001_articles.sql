CREATE TABLE "articles" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"topic_key" text NOT NULL,
	"category" text DEFAULT 'mindset' NOT NULL,
	"title_ms" text NOT NULL,
	"title_en" text NOT NULL,
	"excerpt_ms" text NOT NULL,
	"excerpt_en" text NOT NULL,
	"body_ms" text NOT NULL,
	"body_en" text NOT NULL,
	"read_minutes" integer DEFAULT 5 NOT NULL,
	"model" text,
	"published" boolean DEFAULT true NOT NULL,
	"published_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "articles_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE INDEX "articles_pub_idx" ON "articles" USING btree ("published_at");