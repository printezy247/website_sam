import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as { sql?: ReturnType<typeof postgres> };
/** First non-empty of the usual Railway names, so a differently named reference still connects. */
export const dbUrl = [process.env.DATABASE_URL, process.env.DATABASE_PRIVATE_URL, process.env.DATABASE_PUBLIC_URL].find((v) => v && v.trim()) ?? "postgres://postgres:postgres@localhost:5432/sam";
const url = dbUrl;
const sql = globalForDb.sql ?? postgres(url, { max: 10, prepare: false, onnotice: () => {} });
if (process.env.NODE_ENV !== "production") globalForDb.sql = sql;

export const db = drizzle(sql, { schema });
export { schema };
