import { z } from "zod";
import { authorized, db, json, readJson, sameOrigin } from "./lib/server";
const status=z.enum(["pending","confirmed","declined","alternative_proposed"]);
export const listSchema=z.object({action:z.literal("list"),kind:z.enum(["","reservation","hotel","event"]).default(""),status:z.union([z.literal(""),status]).default(""),search:z.string().trim().max(120).default(""),offset:z.number().int().min(0).max(100000).default(0)}).strict();
export const updateSchema=z.object({action:z.literal("update"),id:z.uuid(),status,expectedStatus:status}).strict();
export const listSql=`SELECT id,reference,kind,locale,name,phone,email,details,status,created_at FROM requests
 WHERE ($1='' OR kind=$1) AND ($2='' OR status=$2)
 AND ($3='' OR position(lower($3) in lower(reference || ' ' || name || ' ' || phone))>0)
 ORDER BY created_at DESC,id DESC LIMIT 50 OFFSET $4`;
export const updateSql="UPDATE requests SET status=$1,updated_at=now() WHERE id=$2 AND status=$3 RETURNING id";
export default async (request:Request) => {
 if(request.method!=="POST")return json({error:"Method not allowed"},405);
 if(!sameOrigin(request))return json({error:"Forbidden"},403);
 let payload:unknown;try{payload=await readJson(request,2048)}catch{return json({error:"Invalid request"},400)}
 const list=listSchema.safeParse(payload),update=updateSchema.safeParse(payload);
 if(!list.success&&!update.success)return json({error:"Invalid request"},400);
 try {
  const actor=await authorized(request,list.success?"requests.read":"requests.write");if(!actor)return json({error:"Forbidden"},403);
  if(list.success){const v=list.data;const rows=await db().query(listSql,[v.kind,v.status,v.search,v.offset]);return json({requests:rows.rows})}
  const v=update.data!;const client=await db().connect();try{await client.query("BEGIN");const changed=await client.query(updateSql,[v.status,v.id,v.expectedStatus]);if(!changed.rowCount){await client.query("ROLLBACK");return json({error:"Request changed or not found; refresh the list"},409)}await client.query("INSERT INTO audit_logs(actor,action,record_id) VALUES($1,$2,$3)",[actor,`request.status.${v.status}`,v.id]);await client.query("COMMIT");return json({ok:true})}catch(e){await client.query("ROLLBACK");throw e}finally{client.release()}
 }catch{console.error("staff_requests_failed");return json({error:"Service unavailable"},503)}
};
