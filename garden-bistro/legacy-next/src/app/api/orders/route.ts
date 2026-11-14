import { randomBytes } from "node:crypto";
import { db, settings } from "@/lib/db";
import { orderSchema, calculateTotal } from "@/lib/validation";
import { sameOrigin } from "@/lib/auth";
import { rateLimit } from "@/lib/security";
export async function POST(req: Request) {
  if (!sameOrigin(req))
    return Response.json({ error: "Forbidden" }, { status: 403 });
  try {
    if (!(await rateLimit(req, "orders")))
      return Response.json({ error: "Please try later" }, { status: 429 });
    const v = orderSchema.parse(await req.json());
    const s = await settings();
    if (
      !s.orderingEnabled ||
      !s.paymentInstructions?.[v.locale] ||
      !s[v.fulfilment + "Enabled"]
    )
      return Response.json({ error: "Ordering unavailable" }, { status: 409 });
    if (v.fulfilment === "delivery" && v.address.trim().length < 5)
      return Response.json({ error: "Address required" }, { status: 400 });
    const c = await db().connect();
    try {
      await c.query("BEGIN");
      const existing = await c.query(
        "SELECT reference FROM orders WHERE idempotency_key=$1",
        [v.idempotencyKey],
      );
      if (existing.rowCount) {
        await c.query("ROLLBACK");
        return Response.json({ reference: existing.rows[0].reference });
      }
      const ids = v.items.map((i) => i.id);
      if (new Set(ids).size !== ids.length) throw new Error("Duplicate items");
      const rows = (
        await c.query(
          "SELECT * FROM content WHERE id=ANY($1::uuid[]) AND kind='menu' AND locale=$2 AND published=true FOR SHARE",
          [ids, v.locale],
        )
      ).rows;
      const snapshots = v.items.map((i) => {
        const item = rows.find((r) => r.id === i.id);
        if (!item || item.price === null || item.data.soldOut)
          throw new Error("Item unavailable");
        return { ...i, price: item.price, name: item.title };
      });
      let fee = 0;
      if (v.fulfilment === "delivery") {
        const zone = s.deliveryZones?.find(
          (z: { id: string; enabled: boolean }) => z.id === v.zone && z.enabled,
        );
        if (!zone) throw new Error("Zone unavailable");
        fee = zone.fee;
      }
      const totals = calculateTotal(snapshots, fee);
      if (totals.subtotal < (s.minimumOrder ?? 0))
        throw new Error("Minimum order");
      const reference = "GB-O-" + randomBytes(5).toString("hex").toUpperCase();
      const r = await c.query(
        "INSERT INTO orders(reference,locale,name,phone,fulfilment,details,subtotal,fee,total,idempotency_key) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id",
        [
          reference,
          v.locale,
          v.name,
          v.phone,
          v.fulfilment,
          JSON.stringify({
            address: v.address,
            message: v.message,
            zone: v.zone,
            paymentInstructions: s.paymentInstructions[v.locale],
          }),
          totals.subtotal,
          fee,
          totals.total,
          v.idempotencyKey,
        ],
      );
      for (const i of snapshots)
        await c.query(
          "INSERT INTO order_items(order_id,menu_item_id,name,quantity,unit_price) VALUES($1,$2,$3,$4,$5)",
          [r.rows[0].id, i.id, i.name, i.quantity, i.price],
        );
      await c.query(
        "INSERT INTO order_status_history(order_id,status) VALUES($1,$2)",
        [r.rows[0].id, "pending"],
      );
      await c.query("COMMIT");
      return Response.json({ reference, status: "pending", ...totals });
    } catch {
      await c.query("ROLLBACK");
      return Response.json(
        {
          error:
            "Order could not be submitted. Refresh the menu and review your order.",
        },
        { status: 409 },
      );
    } finally {
      c.release();
    }
  } catch {
    return Response.json(
      { error: "Service unavailable or invalid request" },
      { status: 503 },
    );
  }
}
