import { Pool } from "pg";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";

let pool: Pool | undefined;
export function db() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL missing");
  return pool ??= new Pool({ connectionString: process.env.DATABASE_URL, max: 3 });
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const configured = process.env.SITE_URL;
  if (!origin || !configured) return false;
  try { return new URL(configured).origin === origin; } catch { return false; }
}
export async function limit(request: Request, scope: string) {
  // Netlify supplies this header; absent IPs share one conservative bucket.
  const ip = request.headers.get("x-nf-client-connection-ip") || "unknown";
  const key = createHash("sha256").update(`${scope}:${ip}`).digest("hex");
  const r = await db().query(`INSERT INTO rate_limits(key,count) VALUES($1,1) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN rate_limits.window_start < now()-interval '15 minutes' THEN 1 ELSE rate_limits.count+1 END,window_start=CASE WHEN rate_limits.window_start < now()-interval '15 minutes' THEN now() ELSE rate_limits.window_start END RETURNING count`, [key]);
  return Number(r.rows[0].count) <= 8;
}
export async function authorized(request: Request, permission: string) {
  const token = /^Bearer (.+)$/.exec(request.headers.get("authorization") || "")?.[1];
  const url = process.env.SUPABASE_URL; const key = process.env.SUPABASE_ANON_KEY;
  if (!token || !url || !key) return null;
  const client = createClient(url, key, {auth:{persistSession:false, autoRefreshToken:false}});
  const {data, error} = await client.auth.getUser(token);
  if (error || !data.user) return null;
  const result = await db().query("SELECT 1 FROM gb_staff_access WHERE auth_user_id=$1 AND active=true AND $2=ANY(permissions)", [data.user.id, permission]);
  return result.rowCount ? data.user.id : null;
}
export function json(data: unknown, status=200) { return Response.json(data,{status,headers:{"Cache-Control":"no-store", "X-Content-Type-Options":"nosniff"}}); }
