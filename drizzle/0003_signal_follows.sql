CREATE TABLE "signal_follows" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"signal_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "signal_follows" ADD CONSTRAINT "signal_follows_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signal_follows" ADD CONSTRAINT "signal_follows_signal_id_signals_id_fk" FOREIGN KEY ("signal_id") REFERENCES "public"."signals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "signal_follows_user_signal_uq" ON "signal_follows" USING btree ("user_id","signal_id");