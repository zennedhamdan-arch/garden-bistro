import { cookies } from "next/headers";
import { verifyPassword, token, sameOrigin } from "@/lib/auth";
import { rateLimit } from "@/lib/security";
import { db } from "@/lib/db";
import { z } from "zod";
export async function POST(req: Request) {
  if (!sameOrigin(req))
    return Response.json({ error: "Forbidden" }, { status: 403 });
  try {
    if (!(await rateLimit(req, "login", 5)))
      return Response.json({ error: "Try later" }, { status: 429 });
    const v = z
      .object({ email: z.email(), password: z.string().max(200) })
      .parse(await req.json());
    let value = "",
      destination = "/admin/dashboard";
    if (
      v.email === process.env.ADMIN_EMAIL &&
      verifyPassword(v.password, process.env.ADMIN_PASSWORD_HASH ?? "")
    )
      value = token();
    else {
      const r = await db().query(
        "SELECT u.id,u.password_hash,r.role,r.permissions FROM users u JOIN user_roles r ON r.user_id=u.id WHERE lower(u.email)=lower($1) AND u.active=true",
        [v.email],
      );
      const user = r.rows[0];
      if (!user || !verifyPassword(v.password, user.password_hash))
        return Response.json({ error: "Invalid credentials" }, { status: 401 });
      value = token(user.id, user.role);
      if (user.role === "staff") {
        const first = user.permissions.find((p: string) =>
          ["orders", "requests"].includes(p),
        );
        if (!first)
          return Response.json(
            { error: "No assigned permissions" },
            { status: 403 },
          );
        destination =
          first === "orders" ? "/admin/orders" : "/admin/reservations";
      }
    }
    (await cookies()).set("gb_session", value, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 28800,
    });
    return Response.json({ ok: true, destination });
  } catch {
    return Response.json(
      { error: "Authentication not configured or invalid credentials" },
      { status: 503 },
    );
  }
}
