import {authorized,db,json,readJson,sameOrigin} from "./lib/server";
import {businessSaveSchema,businessGetSchema,emptyBusinessProfile,businessProfileSchema} from "./lib/business-profile";
export const saveBusinessSql="UPDATE settings SET data=jsonb_set(data,'{businessProfile}',$1::jsonb,true) WHERE id='business' AND jsonb_typeof(data)='object' AND md5(data::text)=$2 RETURNING id";
export default async(request:Request)=>{
 if(request.method!=="POST")return json({error:"Method not allowed"},405);if(!sameOrigin(request))return json({error:"Forbidden"},403);
 let body:unknown;try{body=await readJson(request,8192)}catch{return json({error:"Invalid request"},400)}
 const get=businessGetSchema.safeParse(body),save=businessSaveSchema.safeParse(body);if(!get.success&&!save.success)return json({error:"Invalid request"},400);
 try{const actor=await authorized(request,get.success?"settings.read":"settings.write");if(!actor)return json({error:"Forbidden"},403);
  if(get.success){const r=await db().query("SELECT data->'businessProfile' AS profile,md5(data::text) AS version FROM settings WHERE id='business'");if(!r.rowCount)return json({error:"Settings unavailable"},404);const raw=r.rows[0].profile;if(raw==null)return json({profile:emptyBusinessProfile(),version:r.rows[0].version});const parsed=businessProfileSchema.safeParse(raw);if(!parsed.success)return json({error:"Existing profile requires operator review"},409);return json({profile:parsed.data,version:r.rows[0].version})}
  const v=save.data!;const client=await db().connect();try{await client.query("BEGIN");const r=await client.query(saveBusinessSql,[JSON.stringify(v.profile),v.version]);if(!r.rowCount){await client.query("ROLLBACK");return json({error:"Settings changed or unavailable; reload"},409)}await client.query("INSERT INTO audit_logs(actor,action,record_id) VALUES($1,'settings.profile.update','business')",[actor]);await client.query("COMMIT");return json({ok:true})}catch(e){await client.query("ROLLBACK");throw e}finally{client.release()}
 }catch{console.error("business_profile_failed");return json({error:"Service unavailable"},503)}
};
