import {
  pgTable, text, timestamp, integer, boolean, primaryKey, jsonb, numeric, uniqueIndex, index,
} from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "next-auth/adapters";

// ---- Auth.js tables (names required by @auth/drizzle-adapter) ----
export const users = pgTable("user", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
  role: text("role").notNull().default("member"), // member | admin
  locale: text("locale").notNull().default("ms"),
  telegramId: text("telegram_id").unique(),
  tgUsername: text("tg_username"),
  referralCode: text("referral_code").unique().$defaultFn(() => crypto.randomUUID().slice(0, 8)),
  referredBy: text("referred_by"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
export const accounts = pgTable("account", {
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").$type<AdapterAccountType>().notNull(),
  provider: text("provider").notNull(),
  providerAccountId: text("providerAccountId").notNull(),
  refresh_token: text("refresh_token"),
  access_token: text("access_token"),
  expires_at: integer("expires_at"),
  token_type: text("token_type"),
  scope: text("scope"),
  id_token: text("id_token"),
  session_state: text("session_state"),
}, (t) => [primaryKey({ columns: [t.provider, t.providerAccountId] })]);
export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});
export const verificationTokens = pgTable("verificationToken", {
  identifier: text("identifier").notNull(),
  token: text("token").notNull(),
  expires: timestamp("expires", { mode: "date" }).notNull(),
}, (t) => [primaryKey({ columns: [t.identifier, t.token] })]);

// ---- Membership ----
export const entitlements = pgTable("entitlements", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tierKey: text("tier_key").notNull(),
  source: text("source").notNull(), // ib | stripe | crypto | manual
  externalId: text("external_id").unique(), // stripe sub id / invoice id / ib_account id
  startsAt: timestamp("starts_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at"),
  status: text("status").notNull().default("active"), // active | expired | cancelled
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [index("ent_user_idx").on(t.userId)]);

export const ibAccounts = pgTable("ib_accounts", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  telegramId: text("telegram_id"),
  broker: text("broker").notNull().default("HFM"),
  region: text("region").notNull().default("my"),
  accountNo: text("account_no").notNull(),
  fullName: text("full_name"),
  balanceUsd: numeric("balance_usd", { precision: 12, scale: 2 }),
  screenshotPath: text("screenshot_path"),
  status: text("status").notNull().default("pending"), // pending | verified | rejected
  depositUsd: numeric("deposit_usd", { precision: 12, scale: 2 }),
  verifiedAt: timestamp("verified_at"),
  note: text("note"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [uniqueIndex("ib_account_no_idx").on(t.broker, t.accountNo)]);

export const products = pgTable("products", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  slug: text("slug").notNull().unique(),
  type: text("type").notNull(), // tv_indicator | mt5_indicator | ebook | copier
  name: text("name").notNull(),
  description: text("description"),
  priceCents: integer("price_cents").notNull(),
  billing: text("billing").notNull().default("one_time"), // one_time | monthly | lifetime
  tierIncluded: text("tier_included"), // tier key that includes it, or null
  stripePriceId: text("stripe_price_id"),
  filePath: text("file_path"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const orders = pgTable("orders", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  productId: text("product_id").references(() => products.id),
  tierKey: text("tier_key"),
  provider: text("provider").notNull(), // stripe | crypto
  externalId: text("external_id").unique(),
  amountCents: integer("amount_cents").notNull(),
  currency: text("currency").notNull().default("usd"),
  status: text("status").notNull().default("pending"), // pending | paid | failed | refunded
  meta: jsonb("meta"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const licenses = pgTable("licenses", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  productId: text("product_id").notNull().references(() => products.id),
  mt5Account: text("mt5_account"),
  activations: integer("activations").notNull().default(0),
  maxActivations: integer("max_activations").notNull().default(2),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const tvAccessRequests = pgTable("tv_access_requests", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tvUsername: text("tv_username").notNull(),
  productId: text("product_id").references(() => products.id),
  status: text("status").notNull().default("pending"), // pending | granted | rejected
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---- Signals ----
export const signals = pgTable("signals", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  instrument: text("instrument").notNull().default("XAUUSD"),
  side: text("side").notNull(), // buy | sell
  entry: numeric("entry", { precision: 12, scale: 3 }).notNull(),
  sl: numeric("sl", { precision: 12, scale: 3 }).notNull(),
  tp1: numeric("tp1", { precision: 12, scale: 3 }),
  tp2: numeric("tp2", { precision: 12, scale: 3 }),
  tp3: numeric("tp3", { precision: 12, scale: 3 }),
  note: text("note"),
  status: text("status").notNull().default("running"), // running | tp1 | tp2 | tp3 | sl | be | closed
  resultPips: numeric("result_pips", { precision: 10, scale: 1 }),
  resultR: numeric("result_r", { precision: 6, scale: 2 }),
  visibility: text("visibility").notNull().default("pro"), // public | free | pro | elite
  newsLockout: boolean("news_lockout").notNull().default(false),
  telegramMessageIds: jsonb("telegram_message_ids").$type<Record<string, number>>(),
  publishedAt: timestamp("published_at").notNull().defaultNow(),
  closedAt: timestamp("closed_at"),
}, (t) => [index("signals_pub_idx").on(t.publishedAt)]);

export const signalEvents = pgTable("signal_events", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  signalId: text("signal_id").notNull().references(() => signals.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // update | tp1 | tp2 | tp3 | sl | be | close
  text: text("text"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---- Telegram / growth ----
export const telegramAccounts = pgTable("telegram_accounts", {
  telegramId: text("telegram_id").primaryKey(),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  username: text("username"),
  firstName: text("first_name"),
  languageCode: text("language_code"),
  campaign: text("campaign"),
  state: jsonb("state").$type<Record<string, unknown>>(),
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
  lastSeenAt: timestamp("last_seen_at").notNull().defaultNow(),
});

export const inviteLinks = pgTable("invite_links", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  telegramId: text("telegram_id").notNull(),
  chatId: text("chat_id").notNull(),
  link: text("link").notNull(),
  used: boolean("used").notNull().default(false),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const broadcasts = pgTable("broadcasts", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  segment: jsonb("segment").$type<{ tiers?: string[]; locales?: string[]; campaign?: string }>(),
  textMs: text("text_ms").notNull(),
  textEn: text("text_en").notNull(),
  scheduledAt: timestamp("scheduled_at"),
  sentAt: timestamp("sent_at"),
  sentCount: integer("sent_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const campaigns = pgTable("campaigns", {
  code: text("code").primaryKey(),
  source: text("source"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---- Education ----
export const articles = pgTable("articles", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  slug: text("slug").notNull().unique(),
  topicKey: text("topic_key").notNull(),
  category: text("category").notNull().default("mindset"), // mindset | risk | strategy | execution | tools
  titleMs: text("title_ms").notNull(),
  titleEn: text("title_en").notNull(),
  excerptMs: text("excerpt_ms").notNull(),
  excerptEn: text("excerpt_en").notNull(),
  bodyMs: text("body_ms").notNull(), // markdown
  bodyEn: text("body_en").notNull(), // markdown
  readMinutes: integer("read_minutes").notNull().default(5),
  model: text("model"),
  published: boolean("published").notNull().default(true),
  publishedAt: timestamp("published_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [index("articles_pub_idx").on(t.publishedAt)]);
