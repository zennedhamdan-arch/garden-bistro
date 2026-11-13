import { actor } from "@/lib/auth";
import { authorized, sameOrigin, hashPassword } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
export async function POST(req: Request) {
  if (!sameOrigin(req) || !(await authorized()))
    return new Response(null, { status: 403 });
  try {
    const v = z
      .object({
        id: z.uuid().optional(),
        email: z.email(),
        password: z.string().min(14).max(200).optional(),
        role: z.enum(["administrator", "staff"]),
        permissions: z.array(z.enum(["orders", "requests"])),
        active: z.boolean(),
      })
      .parse(await req.json());
    if (!v.id && !v.password) throw new Error("Password required");
    const c = await db().connect();
    try {
      await c.query("BEGIN");
      const r = await c.query(
        "INSERT INTO users(id,email,password_hash,active) VALUES(COALESCE($1,gen_random_uuid()),$2,$3,$4) ON CONFLICT(id) DO UPDATE SET email=EXCLUDED.email,active=EXCLUDED.active,password_hash=CASE WHEN $5 THEN EXCLUDED.password_hash ELSE users.password_hash END RETURNING id",
        [
          v.id,
          v.email.toLowerCase(),
          v.password ? hashPassword(v.password) : "",
          v.active,
          !!v.password,
        ],
      );
      await c.query(
        "INSERT INTO user_roles(user_id,role,permissions) VALUES($1,$2,$3) ON CONFLICT(user_id) DO UPDATE SET role=EXCLUDED.role,permissions=EXCLUDED.permissions",
        [r.rows[0].id, v.role, v.permissions],
      );
      await c.query(
        "INSERT INTO audit_logs(actor,action,record_id) VALUES($1,$2,$3)",
        [await actor(), "user.save", r.rows[0].id],
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
      {
        error:
          "Save failed. Email must be unique; new passwords need 14 characters.",
      },
      { status: 400 },
    );
  }
}
