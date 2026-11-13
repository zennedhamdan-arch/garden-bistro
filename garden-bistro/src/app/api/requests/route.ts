import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { requestSchema } from "@/lib/validation";
import { rateLimit } from "@/lib/security";
import { sameOrigin } from "@/lib/auth";
export async function POST(req: Request) {
  if (!sameOrigin(req))
    return Response.json({ error: "Forbidden" }, { status: 403 });
  try {
    if (!(await rateLimit(req, "requests")))
      return Response.json({ error: "Please try later" }, { status: 429 });
    const parsed = requestSchema.safeParse(await req.json());
    if (!parsed.success)
      return Response.json(
        {
          error: "Invalid request",
          fields: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    const v = parsed.data;
    const reference =
      "GB-" +
      v.kind[0].toUpperCase() +
      "-" +
      randomBytes(5).toString("hex").toUpperCase();
    const r = await db().query(
      `INSERT INTO requests(reference,kind,locale,name,phone,email,details,idempotency_key) VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(idempotency_key) DO UPDATE SET idempotency_key=EXCLUDED.idempotency_key RETURNING reference`,
      [
        reference,
        v.kind,
        v.locale,
        v.name,
        v.phone,
        v.email,
        JSON.stringify({
          date: v.date,
          departure: v.departure,
          time: v.time,
          guests: v.guests,
          message: v.message,
          method: v.method,
          preference: v.preference,
          eventType: v.eventType,
        }),
        v.idempotencyKey,
      ],
    );
    return Response.json({ reference: r.rows[0].reference, status: "pending" });
  } catch {
    console.error("request_submission_failed");
    return Response.json(
      { error: "Service unavailable. Contact Garden Bistro directly." },
      { status: 503 },
    );
  }
}
