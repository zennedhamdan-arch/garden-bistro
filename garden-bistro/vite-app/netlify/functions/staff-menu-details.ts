import { z } from "zod";
import { authorized, db, json, readJson, sameOrigin } from "./lib/server";
export const menuDetailsSchema=z.object({id:z.uuid(),category:z.string().trim().max(120),soldOut:z.boolean()}).strict();
export const updateMenuSql = `UPDATE content SET data=jsonb_set(jsonb_set(COALESCE(data,'{}'::jsonb),'{category}',to_jsonb($1::text),true),'{soldOut}',to_jsonb($2::boolean),true),updated_at=now() WHERE id=$3 AND kind='menu' AND jsonb_typeof(data)='object' RETURNING id`;
export default async (request:Request)=>{
 if(request.method!=="POST")return json({error:"Method not allowed"},405);
 if(!sameOrigin(request))return json({error:"Forbidden"},403);
 let payload:unknown;try{payload=await readJson(request,2048)}catch{return json({error:"Invalid request"},400)}
 const parsed=menuDetailsSchema.safeParse(payload);if(!parsed.success)return json({error:"Invalid request"},400);
 try {
  const actor=await authorized(request,"content.menu.write");if(!actor)return json({error:"Forbidden"},403);
  const c=await db().connect();try{await c.query("BEGIN");const v=parsed.data;
   const result=await c.query(updateMenuSql,[v.category,v.soldOut,v.id]);
   if(!result.rowCount){await c.query("ROLLBACK");return json({error:"Not found or invalid metadata"},404)}
   await c.query("INSERT INTO audit_logs(actor,action,record_id) VALUES($1,$2,$3)",[actor,"content.menu.details.update",v.id]);await c.query("COMMIT");return json({ok:true});
  }catch(e){await c.query("ROLLBACK");throw e}finally{c.release()}
 }catch{console.error("menu_details_failed");return json({error:"Service unavailable"},503)}
};
