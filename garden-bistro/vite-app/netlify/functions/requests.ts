import { randomBytes } from "node:crypto";
import { requestSchema } from "./lib/validation";
import { db, json, limit, sameOrigin } from "./lib/server";

export default async (request: Request) => {
  if (request.method !== "POST") return json({error:"Method not allowed"},405);
  if (!sameOrigin(request)) return json({error:"Forbidden"},403);
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) return json({error:"Invalid content type"},415);
  try {
    const body = await request.text();
    if (Buffer.byteLength(body, "utf8") > 8192) return json({error:"Request too large"},413);
    let input: unknown; try { input=JSON.parse(body); } catch { return json({error:"Invalid request"},400); }
    const parsed = requestSchema.safeParse(input);
    if (!parsed.success) return json({error:"Invalid request", fields:parsed.error.flatten().fieldErrors},400);
    if (!(await limit(request,"public-request"))) return json({error:"Please try later"},429);
    const v=parsed.data; const reference=`GB-${v.kind[0].toUpperCase()}-${randomBytes(5).toString("hex").toUpperCase()}`;
    const result=await db().query(`INSERT INTO requests(reference,kind,locale,name,phone,email,details,idempotency_key) VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(idempotency_key) DO UPDATE SET idempotency_key=EXCLUDED.idempotency_key RETURNING reference`, [reference,v.kind,v.locale,v.name,v.phone,v.email||null,JSON.stringify({date:v.date,departure:v.departure,time:v.time,guests:v.guests,message:v.message,method:v.method,preference:v.preference,eventType:v.eventType}),v.idempotencyKey]);
    return json({reference:result.rows[0].reference,status:"pending"});
  } catch { console.error("request_submission_failed"); return json({error:"Service unavailable"},503); }
};
