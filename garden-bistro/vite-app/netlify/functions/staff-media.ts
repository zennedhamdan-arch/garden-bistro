import { z } from "zod";
import { publicMediaUrl } from "./lib/media";
import { authorized, db, json, readJson, sameOrigin } from "./lib/server";
const list=z.object({action:z.literal("list"),offset:z.number().int().min(0).max(100000)}).strict();
const update=z.object({action:z.literal("update"),id:z.uuid(),alt:z.string().trim().min(1).max(250)}).strict();
export default async (request:Request) => {
 if(request.method!=="POST")return json({error:"Method not allowed"},405);
 if(!sameOrigin(request))return json({error:"Forbidden"},403);
 let payload:unknown;try{payload=await readJson(request,2048)}catch{return json({error:"Invalid request"},400)}
 const listing=list.safeParse(payload),editing=update.safeParse(payload);
 if(!listing.success&&!editing.success)return json({error:"Invalid request"},400);
 try {
  const actor=await authorized(request,listing.success?"media.read":"media.write");if(!actor)return json({error:"Forbidden"},403);
  if(listing.success){const base=process.env.R2_PUBLIC_BASE_URL;if(!base)throw new Error("Missing public media URL");const result=await db().query("SELECT id,object_key,alt_text,mime_type,size_bytes,width,height,created_at FROM gb_media ORDER BY created_at DESC,id LIMIT 50 OFFSET $1",[listing.data.offset]);return json({items:result.rows.map(({object_key,...row})=>({...row,public_url:publicMediaUrl(base,object_key)}))})}
  const v=editing.data!;const c=await db().connect();try{await c.query("BEGIN");const result=await c.query("UPDATE gb_media SET alt_text=$1 WHERE id=$2 RETURNING id",[v.alt,v.id]);if(!result.rowCount){await c.query("ROLLBACK");return json({error:"Not found"},404)}await c.query("INSERT INTO audit_logs(actor,action,record_id) VALUES($1,$2,$3)",[actor,"media.alt.update",v.id]);await c.query("COMMIT");return json({ok:true})}catch(e){await c.query("ROLLBACK");throw e}finally{c.release()}
 }catch{console.error("staff_media_failed");return json({error:"Service unavailable"},503)}
};
