import { createClient } from "@supabase/supabase-js";
import { db, json, readJson, sameOrigin, staffIdentity, limit } from "./lib/server";
import { staffList, staffInvite, staffChange } from "./lib/staff-schema";
export default async (request:Request) => {
 if(request.method!=="POST")return json({error:"Method not allowed"},405);
 if(!sameOrigin(request))return json({error:"Forbidden"},403);
 let body:unknown;try{body=await readJson(request)}catch{return json({error:"Invalid request"},400)}
 const list=staffList.safeParse(body),invite=staffInvite.safeParse(body),change=staffChange.safeParse(body);
 if(!list.success&&!invite.success&&!change.success)return json({error:"Invalid request"},400);
 try {
  const staff=await staffIdentity(request);if(!staff || staff.role!=="owner" || !staff.permissions.includes("staff.manage"))return json({error:"Forbidden"},403);
  if(list.success){const r=await db().query("SELECT auth_user_id,role,active,permissions,created_at FROM gb_staff_access ORDER BY created_at DESC LIMIT 200");return json({staff:r.rows})}
  if(change.success){const v=change.data;if(v.id===staff.id)return json({error:"Cannot change own access"},403);
   const c=await db().connect();try{await c.query("BEGIN");const r=await c.query("UPDATE gb_staff_access SET role=$1,active=$2,permissions=$3 WHERE auth_user_id=$4 AND role<>'owner' RETURNING auth_user_id",[v.role,v.active,v.permissions,v.id]);if(!r.rowCount){await c.query("ROLLBACK");return json({error:"Not found or protected"},404)}await c.query("INSERT INTO audit_logs(actor,action,record_id) VALUES($1,$2,$3)",[staff.id,"staff.access.update",v.id]);await c.query("COMMIT");return json({ok:true})}catch(e){await c.query("ROLLBACK");throw e}finally{c.release()}}
  if(!invite.success)return json({error:"Invalid request"},400);
  if(!(await limit(request,"staff-invite")))return json({error:"Please try later"},429);
  const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY,site=process.env.SITE_URL;
  if(!url||!key||!site)throw new Error("Missing configuration");
  const auth=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data,error}=await auth.auth.admin.inviteUserByEmail(invite.data.email,{redirectTo:`${new URL(site).origin}/en/staff`});
  if(error || !data.user)return json({error:"Invitation failed"},400);
  // Invitation may succeed while the database write fails; that account has no
  // staff access until this mapping is deliberately created and audited.
  const c=await db().connect();try{await c.query("BEGIN");await c.query("INSERT INTO gb_staff_access(auth_user_id,role,permissions) VALUES($1,$2,$3)",[data.user.id,invite.data.role,invite.data.permissions]);await c.query("INSERT INTO audit_logs(actor,action,record_id) VALUES($1,$2,$3)",[staff.id,"staff.invite",data.user.id]);await c.query("COMMIT");return json({ok:true})}catch(e){await c.query("ROLLBACK");console.error("invite_without_staff_access",data.user.id);throw e}finally{c.release()}
 }catch{console.error("staff_management_failed");return json({error:"Service unavailable"},503)}
};
