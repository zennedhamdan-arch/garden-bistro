/** Read-only pre-migration inventory. Identifiers are fixed in source, never user input. */
const tables = ["settings", "content", "requests", "orders", "order_items", "order_status_history", "images", "users", "user_roles", "audit_logs", "rate_limits", "schema_migrations"] as const;
type QueryResult = { rows: Record<string, unknown>[] };
export type Query = (sql: string, params?: unknown[]) => Promise<QueryResult>;
export async function collectInventory(query: Query) {
  const relationResult = await query("SELECT table_name FROM information_schema.tables WHERE table_schema = current_schema() AND table_name = ANY($1::text[])", [[...tables]]);
  const present = new Set(relationResult.rows.map(r => String(r.table_name)));
  const counts: Record<string, number | null> = {};
  for (const table of tables) {
    if (!present.has(table)) { counts[table] = null; continue; }
    const result = await query(`SELECT count(*)::text AS count FROM "${table}"`);
    counts[table] = Number(result.rows[0].count);
  }
  const migrations = present.has("schema_migrations") ? (await query("SELECT name FROM schema_migrations ORDER BY name")).rows.map(r => String(r.name)) : [];
  const media = present.has("images") ? (await query("SELECT id::text AS id, octet_length(bytes) AS size, encode(sha256(bytes), 'hex') AS sha256 FROM images ORDER BY id")).rows : [];
  return { version: 1, counts, migrations, media };
}
