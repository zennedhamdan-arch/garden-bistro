import {z} from "zod";
import {authorized,db,json,readJson,sameOrigin} from "./lib/server";
export const auditQuery=z.object({offset:z.number().int().min(0).max(100000).default(0),search:z.string().trim().max(120).default("")}).strict();
export const auditSql="SELECT id,actor,action,record_id,created_at FROM audit_logs WHERE ($1='' OR position(lower($1) in lower(action))>0) ORDER BY created_at DESC,id DESC LIMIT 50 OFFSET $2";
export default async(request:Request)=>{
 if(request.method!=="POST")return json({error:"Method not allowed"},405);if(!sameOrigin(request))return json({error:"Forbidden"},403);
 let body:unknown;try{body=await readJson(request,2048)}catch{return json({error:"Invalid request"},400)}const v=auditQuery.safeParse(body);if(!v.success)return json({error:"Invalid request"},400);
 try{if(!await authorized(request,"audit.read"))return json({error:"Forbidden"},403);const r=await db().query(auditSql,[v.data.search,v.data.offset]);return json({items:r.rows})}catch{console.error("staff_audit_failed");return json({error:"Service unavailable"},503)}
};
