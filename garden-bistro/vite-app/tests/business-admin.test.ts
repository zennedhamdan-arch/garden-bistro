import test from "node:test";
import assert from "node:assert/strict";
import {businessProfileSchema,businessSaveSchema,emptyBusinessProfile} from "../netlify/functions/lib/business-profile";
import {saveBusinessSql} from "../netlify/functions/staff-business";
import {auditQuery,auditSql} from "../netlify/functions/staff-audit";
import staffBusiness from "../netlify/functions/staff-business";
import staffAudit from "../netlify/functions/staff-audit";
import staffOverview from "../netlify/functions/staff-overview";

test("profile does not invent hours and rejects malformed public contact data",()=>{
 const blank=emptyBusinessProfile();assert.equal(businessProfileSchema.safeParse(blank).success,true);assert.ok(blank.hours.every(d=>d.closed===null));
 assert.equal(businessProfileSchema.safeParse({...blank,website:"javascript:alert(1)"}).success,false);
 assert.equal(businessProfileSchema.safeParse({...blank,whatsapp:"+123"}).success,false);
 assert.equal(businessProfileSchema.safeParse({...blank,hours:blank.hours.map((d,i)=>i===0?{...d,closed:false}:d)}).success,false);
 assert.equal(businessProfileSchema.safeParse({...blank,hours:blank.hours.map(d=>({...d,day:0}))}).success,false);
 assert.equal(businessSaveSchema.safeParse({action:"save",version:"wrong",profile:blank}).success,false);
});
test("profile saves preserve unrelated settings and reject stale writes",async()=>{
 const {PGlite}=await import("@electric-sql/pglite");const db=new PGlite();try{
  await db.exec(`CREATE TABLE settings(id text PRIMARY KEY,data jsonb NOT NULL);INSERT INTO settings VALUES('business','{"orderingEnabled":false,"other":{"preserve":true}}');`);
  const old=(await db.query<{version:string}>("SELECT md5(data::text) AS version FROM settings")).rows[0].version;const profile=emptyBusinessProfile();
  assert.equal((await db.query(saveBusinessSql,[JSON.stringify(profile),old])).rows.length,1);
  assert.equal((await db.query(saveBusinessSql,[JSON.stringify(profile),old])).rows.length,0);
  const result=(await db.query<{data:Record<string,unknown>}>("SELECT data FROM settings")).rows[0].data;assert.deepEqual(result.other,{preserve:true});assert.equal(result.orderingEnabled,false);assert.deepEqual(result.businessProfile,profile);
 }finally{await db.close()}
});
test("audit query filters action and validates pagination",async()=>{
 const {PGlite}=await import("@electric-sql/pglite");const db=new PGlite();try{
  await db.exec("CREATE TABLE audit_logs(id integer,actor text,action text,record_id text,created_at timestamptz);INSERT INTO audit_logs VALUES (1,'one','content.save','a',now()),(2,'two','staff.invite','b',now());");
  const result=await db.query<{action:string}>(auditSql,["staff",0]);assert.equal(result.rows.length,1);assert.equal(result.rows[0].action,"staff.invite");assert.equal(auditQuery.safeParse({offset:-1,search:""}).success,false);
 }finally{await db.close()}
});
test("profile, audit and dashboard endpoints reject foreign and anonymous access",async()=>{
 process.env.SITE_URL="https://example.org";delete process.env.SUPABASE_URL;delete process.env.SUPABASE_ANON_KEY;
 for(const [fn,body] of [[staffBusiness,{action:"get"}],[staffAudit,{offset:0,search:""}],[staffOverview,{}]] as const){const call=(origin:string)=>fn(new Request("https://example.org",{method:"POST",headers:{origin,"content-type":"application/json"},body:JSON.stringify(body)}));assert.equal((await call("https://example.org")).status,403);assert.equal((await call("https://foreign.example")).status,403)}
});
