import { Pool } from "pg";
const globalDb = globalThis as unknown as { pool?: Pool };
export function db() {
  if (!process.env.DATABASE_URL) throw new Error("Database is not configured");
  return (globalDb.pool ??= new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
  }));
}
export type Content = {
  id: string;
  kind: string;
  slug: string;
  locale: string;
  title: string;
  description: string;
  price: number | null;
  published: boolean;
  data: Record<string, unknown>;
};
export async function content(
  locale: string,
  kind?: string,
): Promise<Content[]> {
  if (!process.env.DATABASE_URL) return [];
  const r = await db().query(
    "SELECT * FROM content WHERE published=true AND locale=$1" +
      (kind ? " AND kind=$2" : "") +
      " ORDER BY sort_order,title",
    kind ? [locale, kind] : [locale],
  );
  return r.rows;
}
export async function settings() {
  if (!process.env.DATABASE_URL) return {};
  return (
    (await db().query("SELECT data FROM settings WHERE id='business'")).rows[0]
      ?.data ?? {}
  );
}
