import { readFileSync, readdirSync } from "node:fs";
import { db } from "../src/lib/db";
async function main() {
  const c = await db().connect();
  try {
    await c.query("SELECT pg_advisory_lock(714298)");
    await c.query(
      "CREATE TABLE IF NOT EXISTS schema_migrations(name text PRIMARY KEY,applied_at timestamptz NOT NULL DEFAULT now())",
    );
    for (const name of readdirSync("migrations")
      .filter((f) => f.endsWith(".sql"))
      .sort()) {
      if (
        (
          await c.query("SELECT name FROM schema_migrations WHERE name=$1", [
            name,
          ])
        ).rowCount
      )
        continue;
      await c.query(readFileSync("migrations/" + name, "utf8"));
      await c.query("INSERT INTO schema_migrations(name) VALUES($1)", [name]);
      console.log("Applied " + name);
    }
  } finally {
    await c.query("SELECT pg_advisory_unlock(714298)");
    c.release();
    await db().end();
  }
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
