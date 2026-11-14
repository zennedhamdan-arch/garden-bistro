import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  calculateTotal,
  requestSchema,
  orderSchema,
} from "../src/lib/validation";
import { hashPassword, verifyPassword, sameOrigin } from "../src/lib/auth";
import { messages, locales } from "../src/lib/i18n";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
const request = {
  kind: "reservation",
  locale: "fr",
  name: "Test Guest",
  phone: "+250786458663",
  email: "",
  date: "2099-01-01",
  time: "19:00",
  guests: 2,
  method: "whatsapp",
  website: "",
  idempotencyKey: randomUUID(),
};
test("reservation validation accepts valid request", () =>
  assert.equal(requestSchema.safeParse(request).success, true));
test("rejects spam, past dates and missing times", () => {
  for (const change of [
    { website: "spam" },
    { date: "2020-01-01" },
    { time: undefined },
    { guests: 0 },
    { phone: "abc" },
  ])
    assert.equal(
      requestSchema.safeParse({ ...request, ...change }).success,
      false,
    );
});
test("hotel departure must follow arrival", () => {
  assert.equal(
    requestSchema.safeParse({
      ...request,
      kind: "hotel",
      departure: "2098-01-01",
    }).success,
    false,
  );
  assert.equal(
    requestSchema.safeParse({
      ...request,
      kind: "hotel",
      departure: "2099-01-02",
    }).success,
    true,
  );
});
test("email contact requires email", () =>
  assert.equal(
    requestSchema.safeParse({ ...request, method: "email" }).success,
    false,
  ));
test("prices and fee calculated in integer RWF", () =>
  assert.deepEqual(
    calculateTotal(
      [
        { price: 3500, quantity: 2 },
        { price: 900, quantity: 1 },
      ],
      500,
    ),
    { subtotal: 7900, fee: 500, total: 8400 },
  ));
test("rejects negative prices, fractional or excessive quantities", () => {
  for (const i of [
    { price: -1, quantity: 1 },
    { price: 100, quantity: 1.5 },
    { price: 100, quantity: 51 },
  ])
    assert.throws(() => calculateTotal([i], 0));
});
test("order validation rejects empty basket", () =>
  assert.equal(
    orderSchema.safeParse({ ...request, items: [], fulfilment: "pickup" })
      .success,
    false,
  ));
test("salted password hashes reject wrong passwords", () => {
  const hash = hashPassword("testing-only-long-password");
  assert.equal(verifyPassword("testing-only-long-password", hash), true);
  assert.equal(verifyPassword("wrong", hash), false);
  assert.equal(verifyPassword("wrong", "bad"), false);
});
test("origin check rejects foreign and missing origins", () => {
  assert.equal(
    sameOrigin(
      new Request("https://garden.test/api", {
        headers: { origin: "https://evil.test" },
      }),
    ),
    false,
  );
  assert.equal(sameOrigin(new Request("https://garden.test/api")), false);
  assert.equal(
    sameOrigin(
      new Request("https://garden.test/api", {
        headers: { origin: "https://garden.test" },
      }),
    ),
    true,
  );
});
test("translation dictionaries have equivalent keys", () => {
  for (const l of locales)
    assert.deepEqual(
      Object.keys(messages[l]).sort(),
      Object.keys(messages.en).sort(),
    );
});
test("PostgreSQL migrations, constraints, pending defaults and idempotency", async () => {
  const db = new PGlite();
  try {
    await db.exec(readFileSync("migrations/001_initial.sql", "utf8"));
    await db.exec(readFileSync("migrations/002_images.sql", "utf8"));
    await db.exec(readFileSync("migrations/003_users.sql", "utf8"));
    const key = randomUUID();
    await db.query(
      "INSERT INTO requests(reference,kind,locale,name,phone,details,idempotency_key) VALUES('TEST','reservation','en','Test','12345678','{}',$1)",
      [key],
    );
    const result = await db.query<{ status: string }>(
      "SELECT status FROM requests WHERE reference='TEST'",
    );
    assert.equal(result.rows[0].status, "pending");
    await assert.rejects(() =>
      db.query(
        "INSERT INTO requests(reference,kind,locale,name,phone,details,idempotency_key) VALUES('TEST2','reservation','en','Test','12345678','{}',$1)",
        [key],
      ),
    );
    await assert.rejects(() =>
      db.query("UPDATE requests SET status='invalid'"),
    );
    const settings = await db.query<{ data: { orderingEnabled: boolean } }>(
      "SELECT data FROM settings",
    );
    assert.equal(settings.rows[0].data.orderingEnabled, false);
    await db.query(
      "INSERT INTO content(kind,slug,locale,title) VALUES('room','test','en','Test draft')",
    );
    const publicRooms = await db.query(
      "SELECT * FROM content WHERE published=true",
    );
    assert.equal(publicRooms.rows.length, 0);
  } finally {
    await db.close();
  }
});
