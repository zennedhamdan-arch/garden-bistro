import { authorized, db, json, readJson, sameOrigin } from "./lib/server";
import { contentListSchema, contentSaveSchema, contentPermission } from "./lib/content-schema";
export default async (request:Request) => {
 if(request.method!=="POST")return json({error:"Method not allowed"},405);
 if(!sameOrigin(request))return json({error:"Forbidden"},403);
 let payload:unknown;try{payload=await readJson(request)}catch{return json({error:"Invalid request"},400)}
 const list=contentListSchema.safeParse(payload),save=contentSaveSchema.safeParse(payload);
 if(!list.success&&!save.success)return json({error:"Invalid request"},400);
 const kind=list.success?list.data.kind:save.data!.kind;
 try {
  const actor=await authorized(request,contentPermission(kind,list.success?"read":"write"));
  if(!actor)return json({error:"Forbidden"},403);
  if(list.success){const v=list.data;const r=await db().query("SELECT id,kind,locale,slug,title,description,price,published,sort_order,data FROM content WHERE kind=$1 AND locale=$2 ORDER BY sort_order,title,id LIMIT 50 OFFSET $3",[v.kind,v.locale,v.offset]);return json({items:r.rows})}
  const v=save.data!;const client=await db().connect();
  try {await client.query("BEGIN");let result;
   if(v.id){result=await client.query("UPDATE content SET slug=$1,title=$2,description=$3,price=$4,published=$5,sort_order=$6,updated_at=now() WHERE id=$7 AND kind=$8 AND locale=$9 RETURNING id",[v.slug,v.title,v.description,v.price,v.published,v.sort_order,v.id,v.kind,v.locale]);if(!result.rowCount){await client.query("ROLLBACK");return json({error:"Not found"},404)}}
   else {result=await client.query("INSERT INTO content(kind,locale,slug,title,description,price,published,sort_order) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id",[v.kind,v.locale,v.slug,v.title,v.description,v.price,v.published,v.sort_order])}
   await client.query("INSERT INTO audit_logs(actor,action,record_id) VALUES($1,$2,$3)",[actor,`content.${v.kind}.${v.id?"update":"create"}`,result.rows[0].id]);await client.query("COMMIT");return json({id:result.rows[0].id});
  }catch(e){await client.query("ROLLBACK");throw e}finally{client.release()}
 }catch{console.error("staff_content_failed");return json({error:"Service unavailable or conflicting content"},503)}
};
