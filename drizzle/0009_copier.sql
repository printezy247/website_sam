CREATE TABLE "copier_links" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"license_id" text,
	"mt5_account" text,
	"broker" text,
	"currency" text,
	"enabled" boolean DEFAULT true NOT NULL,
	"risk_mode" text DEFAULT 'percent' NOT NULL,
	"lot_fixed" numeric(8, 2) DEFAULT '0.01' NOT NULL,
	"risk_percent" numeric(5, 2) DEFAULT '1.00' NOT NULL,
	"max_lot" numeric(8, 2) DEFAULT '1.00' NOT NULL,
	"expiry_minutes" integer DEFAULT 240 NOT NULL,
	"symbol_suffix" text DEFAULT '' NOT NULL,
	"last_seen_at" timestamp,
	"last_error" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "copier_trades" (
	"id" text PRIMARY KEY NOT NULL,
	"link_id" text NOT NULL,
	"signal_id" text NOT NULL,
	"action" text NOT NULL,
	"ticket" text,
	"lots" numeric(8, 2),
	"price" numeric(12, 3),
	"status" text NOT NULL,
	"detail" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "copier_links" ADD CONSTRAINT "copier_links_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "copier_links" ADD CONSTRAINT "copier_links_license_id_licenses_id_fk" FOREIGN KEY ("license_id") REFERENCES "public"."licenses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "copier_trades" ADD CONSTRAINT "copier_trades_link_id_copier_links_id_fk" FOREIGN KEY ("link_id") REFERENCES "public"."copier_links"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "copier_trades" ADD CONSTRAINT "copier_trades_signal_id_signals_id_fk" FOREIGN KEY ("signal_id") REFERENCES "public"."signals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "copier_links_user_idx" ON "copier_links" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "copier_trades_link_idx" ON "copier_trades" USING btree ("link_id");--> statement-breakpoint
CREATE INDEX "copier_trades_sig_idx" ON "copier_trades" USING btree ("signal_id");