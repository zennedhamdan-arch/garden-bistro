import test from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { collectInventory } from "../scripts/inventory-lib";

test("inventory counts existing data and fingerprints media without changing records", async () => {
  const db = new PGlite();
  try {
    await db.exec("CREATE TABLE content(id integer); INSERT INTO content VALUES (1), (2); CREATE TABLE images(id uuid, bytes bytea); INSERT INTO images VALUES ('11111111-1111-4111-8111-111111111111', decode('616263','hex')); CREATE TABLE schema_migrations(name text); INSERT INTO schema_migrations VALUES ('001_initial.sql');");
    const result = await collectInventory(async (sql, params) => db.query(sql, params));
    assert.equal(result.counts.content, 2);
    assert.equal(result.counts.orders, null);
    assert.deepEqual(result.migrations, ["001_initial.sql"]);
    assert.equal(result.media[0].size, 3);
    assert.equal(result.media[0].sha256, "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    assert.equal((await db.query<{ n: number }>("SELECT count(*)::int AS n FROM content")).rows[0].n, 2);
  } finally { await db.close(); }
});
