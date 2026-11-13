import { actor } from "@/lib/auth";
import { authorized, sameOrigin } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
const schema = z.object({
  id: z.uuid().optional(),
  kind: z.enum(["page", "room", "menu", "category", "faq", "gallery", "event"]),
  slug: z
    .string()
    .regex(/^[a-z0-9-]+$/)
    .max(100),
  locale: z.enum(["en", "fr", "sw"]),
  title: z.string().min(1).max(200),
  description: z.string().max(6000),
  price: z.number().int().min(0).nullable(),
  published: z.boolean(),
  data: z.record(z.string(), z.unknown()),
  sort_order: z.number().int().default(0),
});
export async function POST(req: Request) {
  if (!sameOrigin(req) || !(await authorized()))
    return new Response(null, { status: 403 });
  try {
    const body = await req.json();
    if (body.action === "settings") {
      const s = z
        .object({
          orderingEnabled: z.boolean(),
          pickupEnabled: z.boolean(),
          deliveryEnabled: z.boolean(),
          whatsappEnabled: z.boolean(),
          minimumOrder: z.number().int().nonnegative(),
          paymentInstructions: z.object({
            en: z.string().max(2000),
            fr: z.string().max(2000),
            sw: z.string().max(2000),
          }),
          deliveryZones: z.array(
            z.object({
              id: z.string(),
              name: z.string(),
              fee: z.number().int().nonnegative(),
              enabled: z.boolean(),
            }),
          ),
        })
        .parse(body.data);
      const c = await db().connect();
      try {
        await c.query("BEGIN");
        await c.query("UPDATE settings SET data=$1 WHERE id='business'", [
          JSON.stringify(s),
        ]);
        await c.query(
          "INSERT INTO audit_logs(actor,action,record_id) VALUES($1,$2,$3)",
          [await actor(), "settings.update", "business"],
        );
        await c.query("COMMIT");
      } catch (e) {
        await c.query("ROLLBACK");
        throw e;
      } finally {
        c.release();
      }
      return Response.json({ ok: true });
    }
    const v = schema.parse(body);
    if (
      v.kind === "page" &&
      ![
        "home",
        "hotel",
        "rooms",
        "restaurant",
        "menu",
        "order",
        "reservations",
        "events",
        "gallery",
        "about",
        "contact",
        "faq",
        "privacy",
        "terms",
        "policies",
      ].includes(v.slug)
    )
      return Response.json(
        { error: "Choose an existing public page slug." },
        { status: 400 },
      );
    if (v.data.imageId) {
      const id = z.uuid().parse(v.data.imageId);
      if (
        !(await db().query("SELECT id FROM images WHERE id=$1", [id])).rowCount
      )
        throw new Error("Image missing");
    }
    if (
      v.published &&
      v.kind === "gallery" &&
      (!v.data.imageId || typeof v.data.alt !== "string" || !v.data.alt.trim())
    )
      return Response.json(
        { error: "Upload an approved image and supply translated alt text." },
        { status: 400 },
      );
    const c = await db().connect();
    try {
      await c.query("BEGIN");
      const r = await c.query(
        `INSERT INTO content(id,kind,slug,locale,title,description,price,published,data,sort_order) VALUES(COALESCE($1,gen_random_uuid()),$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT(id) DO UPDATE SET kind=EXCLUDED.kind,slug=EXCLUDED.slug,locale=EXCLUDED.locale,title=EXCLUDED.title,description=EXCLUDED.description,price=EXCLUDED.price,published=EXCLUDED.published,data=EXCLUDED.data,sort_order=EXCLUDED.sort_order,updated_at=now() RETURNING id`,
        [
          v.id,
          v.kind,
          v.slug,
          v.locale,
          v.title,
          v.description,
          v.price,
          v.published,
          JSON.stringify(v.data),
          v.sort_order,
        ],
      );
      await c.query(
        "INSERT INTO audit_logs(actor,action,record_id) VALUES($1,$2,$3)",
        [await actor(), "content.save", r.rows[0].id],
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
    return Response.json(
      { error: "Unable to save. Check fields, JSON and unique slug." },
      { status: 400 },
    );
  }
}
export async function DELETE(req: Request) {
  if (!sameOrigin(req) || !(await authorized()))
    return new Response(null, { status: 403 });
  try {
    const { id } = z.object({ id: z.uuid() }).parse(await req.json());
    const c = await db().connect();
    try {
      await c.query("BEGIN");
      await c.query("DELETE FROM content WHERE id=$1", [id]);
      await c.query(
        "INSERT INTO audit_logs(actor,action,record_id) VALUES($1,$2,$3)",
        [await actor(), "content.delete", id],
      );
      await c.query("COMMIT");
    } catch (e) {
      await c.query("ROLLBACK");
      throw e;
    } finally {
      c.release();
    }
    return Response.json({ ok: true });
  } catch {
    return Response.json(
      { error: "Unable to delete; item may be referenced by orders." },
      { status: 400 },
    );
  }
}
