import { Pool } from "pg";
import { collectInventory } from "./inventory-lib";

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required; no connection was attempted.");
  const pool = new Pool({connectionString: process.env.DATABASE_URL, max: 1});
  const client = await pool.connect();
  try {
    // A consistent snapshot that cannot modify the source database.
    await client.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
    const inventory = await collectInventory((sql, params) => client.query(sql, params));
    await client.query("COMMIT");
    console.log(JSON.stringify(inventory, null, 2));
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}
main().catch(() => { console.error("Inventory failed. Verify database connectivity, permissions and schema; no changes were made."); process.exitCode = 1; });
