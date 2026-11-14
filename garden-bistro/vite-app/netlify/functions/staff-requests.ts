import { z } from "zod";
import { authorized, db, json, sameOrigin } from "./lib/server";
const update = z.object({id:z.uuid(), status:z.enum(["pending","confirmed","declined","alternative_proposed"])}).strict();
export default async (request:Request) => {
  if (request.method !== "POST") return json({error:"Method not allowed"},405);
  if (!sameOrigin(request)) return json({error:"Forbidden"},403);
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) return json({error:"Invalid content type"},415);
  try {
    const text=await request.text(); if(Buffer.byteLength(text)>2048) return json({error:"Request too large"},413);
    let payload:unknown; try{payload=JSON.parse(text)}catch{return json({error:"Invalid request"},400)}
    if (typeof payload !== "object" || payload === null) return json({error:"Invalid request"},400);
    const action=(payload as Record<string,unknown>).action;
    if (action !== "list" && action !== "update") return json({error:"Invalid request"},400);
    const actor=await authorized(request, action === "list" ? "requests.read" : "requests.write");
    if(!actor) return json({error:"Forbidden"},403);
    if(action==="list") {
      const rows=await db().query("SELECT id,reference,kind,locale,name,phone,email,details,status,created_at FROM requests ORDER BY created_at DESC LIMIT 100");
      return json({requests:rows.rows});
    }
    const {action: _action, ...fields}=payload as Record<string,unknown>;
    const parsed=update.safeParse(fields); if(!parsed.success)return json({error:"Invalid request"},400);
    const client=await db().connect();
    try {
      await client.query("BEGIN");
      const changed=await client.query("UPDATE requests SET status=$1,updated_at=now() WHERE id=$2 RETURNING id",[parsed.data.status,parsed.data.id]);
      if(!changed.rowCount){await client.query("ROLLBACK");return json({error:"Not found"},404)}
      await client.query("INSERT INTO audit_logs(actor,action,record_id) VALUES($1,$2,$3)",[actor,`request.status.${parsed.data.status}`,parsed.data.id]);
      await client.query("COMMIT"); return json({ok:true});
    } catch(e){await client.query("ROLLBACK");throw e} finally {client.release()}
  } catch {console.error("staff_requests_failed");return json({error:"Service unavailable"},503)}
};
