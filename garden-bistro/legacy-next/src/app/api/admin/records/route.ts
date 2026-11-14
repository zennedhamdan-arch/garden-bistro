import { actor } from "@/lib/auth";
import { authorized, sameOrigin } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
export async function POST(req: Request) {
  if (
    !sameOrigin(req) ||
    !((await authorized("orders")) || (await authorized("requests")))
  )
    return new Response(null, { status: 403 });
  try {
    const v = z
      .object({
        id: z.uuid(),
        table: z.enum(["orders", "requests"]),
        status: z.string(),
      })
      .parse(await req.json());
    if (!(await authorized(v.table)))
      return new Response(null, { status: 403 });
    const allowed =
      v.table === "orders"
        ? [
            "pending",
            "accepted",
            "preparing",
            "ready_for_pickup",
            "out_for_delivery",
            "completed",
            "cancelled",
          ]
        : ["pending", "confirmed", "declined", "alternative_proposed"];
    if (!allowed.includes(v.status))
      return Response.json({ error: "Invalid status" }, { status: 400 });
    const c = await db().connect();
    try {
      await c.query("BEGIN");
      const r = await c.query(
        `UPDATE ${v.table} SET status=$1,updated_at=now() WHERE id=$2 RETURNING id`,
        [v.status, v.id],
      );
      if (!r.rowCount) throw new Error();
      if (v.table === "orders")
        await c.query(
          "INSERT INTO order_status_history(order_id,status) VALUES($1,$2)",
          [v.id, v.status],
        );
      await c.query(
        "INSERT INTO audit_logs(actor,action,record_id) VALUES($1,$2,$3)",
        [await actor(), `${v.table}.${v.status}`, v.id],
      );
      await c.query("COMMIT");
      return Response.json({ ok: true });
    } catch (e) {
      await c.query("ROLLBACK");
      throw e;
    } finally {
      c.release();
    }
  } catch {
    return Response.json({ error: "Update failed" }, { status: 400 });
  }
}
