import { createHash } from "node:crypto";
import { db } from "./db";
export async function rateLimit(request: Request, scope: string, limit = 8) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const key = createHash("sha256")
    .update(scope + ip)
    .digest("hex");
  const r = await db().query(
    `INSERT INTO rate_limits(key,count) VALUES($1,1) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN rate_limits.window_start < now()-interval '15 minutes' THEN 1 ELSE rate_limits.count+1 END,window_start=CASE WHEN rate_limits.window_start < now()-interval '15 minutes' THEN now() ELSE rate_limits.window_start END RETURNING count`,
    [key],
  );
  return r.rows[0].count <= limit;
}
