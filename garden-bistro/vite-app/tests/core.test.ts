import test from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { requestSchema } from "../netlify/functions/lib/validation";
import { normalizeImage, maxUploadBytes } from "../netlify/functions/lib/media";
import requests from "../netlify/functions/requests";
import staff from "../netlify/functions/staff-requests";
import media from "../netlify/functions/media-upload";

const tomorrow=new Date(Date.now()+2*86400000).toISOString().slice(0,10);
const request={kind:"reservation",locale:"en",name:"Test Guest",phone:"+250788000000",date:tomorrow,time:"18:00",guests:2,method:"phone",website:"",idempotencyKey:"11111111-1111-4111-8111-111111111111"};
test("request validation rejects missing time, honeypot and bad hotel dates",()=>{
 assert.equal(requestSchema.safeParse(request).success,true);
 assert.equal(requestSchema.safeParse({...request,time:undefined}).success,false);
 assert.equal(requestSchema.safeParse({...request,website:"spam"}).success,false);
 assert.equal(requestSchema.safeParse({...request,kind:"hotel",departure:tomorrow}).success,false);
 assert.equal(requestSchema.safeParse({...request,method:"email",email:""}).success,false);
});
test("image validation checks real bytes, MIME and size",async()=>{
 const png=await sharp({create:{width:2,height:3,channels:3,background:"red"}}).png().toBuffer();
 const result=await normalizeImage(png,"image/png");assert.equal(result.width,2);assert.equal(result.height,3);
 assert.equal((await sharp(result.bytes).metadata()).format,"webp");
 await assert.rejects(normalizeImage(png,"image/jpeg"));
 await assert.rejects(normalizeImage(Buffer.from("not an image"),"image/png"));
 await assert.rejects(normalizeImage(Buffer.alloc(maxUploadBytes+1),"image/png"));
});
test("functions reject foreign origins and unsupported methods before accessing services",async()=>{
 process.env.SITE_URL="https://example.org";
 for(const fn of [requests,staff,media]) {
  assert.equal((await fn(new Request("https://example.org/api",{method:"POST",headers:{origin:"https://evil.example","content-type":"application/json"},body:"{}"}))).status,403);
  assert.equal((await fn(new Request("https://example.org/api",{method:"GET"}))).status,405);
 }
});
test("invalid and malformed public requests do not reach database",async()=>{
 process.env.SITE_URL="https://example.org";
 const call=(body:string)=>requests(new Request("https://example.org",{method:"POST",headers:{origin:"https://example.org","content-type":"application/json"},body}));
 assert.equal((await call("{" )).status,400);
 assert.equal((await call(JSON.stringify({...request,website:"spam"}))).status,400);
});

test("proposed migrations retain existing rows and deny direct staff access",async()=>{
 const {PGlite}=await import("@electric-sql/pglite"); const {readFile}=await import("node:fs/promises");
 const db=new PGlite();
 try {
  await db.exec("CREATE ROLE anon; CREATE ROLE authenticated; CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY); CREATE TABLE content(id integer PRIMARY KEY, title text); INSERT INTO content VALUES (1, 'Original');");
  await db.exec(await readFile("migrations/001_staff_access_PROPOSED.sql","utf8"));
  await db.exec(await readFile("migrations/002_media_PROPOSED.sql","utf8"));
  assert.equal((await db.query<{title:string}>("SELECT title FROM content WHERE id=1")).rows[0].title,"Original");
  await db.exec("SET ROLE authenticated");
  await assert.rejects(db.query("SELECT * FROM gb_staff_access"));
  await assert.rejects(db.query("SELECT * FROM gb_media"));
  await db.exec("RESET ROLE");
 } finally {await db.close()}
});

test("content validation rejects cross-kind or unsafe fields and requires explicit granular permission",async()=>{
 const {contentSaveSchema,contentPermission}=await import("../netlify/functions/lib/content-schema");
 const item={action:"save",kind:"menu",locale:"en",slug:"seasonal-dish",title:"Seasonal dish",description:"",price:1000,published:false,sort_order:0};
 assert.equal(contentSaveSchema.safeParse(item).success,true);
 assert.equal(contentSaveSchema.safeParse({...item,slug:"../unsafe"}).success,false);
 assert.equal(contentSaveSchema.safeParse({...item,price:-1}).success,false);
 assert.equal(contentSaveSchema.safeParse({...item,data:{admin:true}}).success,false);
 assert.equal(contentPermission("menu","write"),"content.menu.write");
});
test("staff invite validation rejects owner assignment and unknown or duplicated permissions",async()=>{
 const {staffInvite,staffChange}=await import("../netlify/functions/lib/staff-schema");
 const input={action:"invite",email:"person@example.org",role:"editor",permissions:["content.page.read"]};
 assert.equal(staffInvite.safeParse(input).success,true);
 assert.equal(staffInvite.safeParse({...input,role:"owner"}).success,false);
 assert.equal(staffInvite.safeParse({...input,permissions:["all"]}).success,false);
 assert.equal(staffInvite.safeParse({...input,permissions:["requests.read","requests.read"]}).success,false);
 assert.equal(staffChange.safeParse({action:"change",id:"bad",role:"editor",active:true,permissions:[]}).success,false);
});
test("new staff functions reject anonymous calls and foreign origins",async()=>{
 const functions=[(await import("../netlify/functions/staff-content")).default,(await import("../netlify/functions/staff-management")).default,(await import("../netlify/functions/staff-session")).default];
 process.env.SITE_URL="https://example.org";delete process.env.SUPABASE_URL;delete process.env.SUPABASE_ANON_KEY;
 const payloads=[{action:"list",kind:"menu",locale:"en"},{action:"list"},{}];
 for(let i=0;i<functions.length;i++){
  const invoke=(origin:string)=>functions[i](new Request("https://example.org",{method:"POST",headers:{origin,"content-type":"application/json"},body:JSON.stringify(payloads[i])}));
  assert.equal((await invoke("https://example.org")).status,403);
  assert.equal((await invoke("https://evil.example")).status,403);
 }
});

test("public media paths reject non-HTTPS origins and path traversal",async()=>{
 const {publicMediaUrl}=await import("../netlify/functions/lib/media");
 const key="media/11111111-1111-4111-8111-111111111111.webp";
 assert.equal(publicMediaUrl("https://media.example.org/public/",key),"https://media.example.org/public/"+key);
 assert.throws(()=>publicMediaUrl("http://media.example.org",key));
 assert.throws(()=>publicMediaUrl("https://media.example.org", "media/../private.webp"));
 assert.throws(()=>publicMediaUrl("https://user:password@media.example.org",key));
});
test("menu metadata update preserves unrelated fields and cannot change other content kinds",async()=>{
 const {PGlite}=await import("@electric-sql/pglite");const {updateMenuSql,menuDetailsSchema}=await import("../netlify/functions/staff-menu-details");
 const db=new PGlite();const menu="11111111-1111-4111-8111-111111111111",room="22222222-2222-4222-8222-222222222222";
 try{
  await db.exec(`CREATE TABLE content(id uuid PRIMARY KEY,kind text,data jsonb,updated_at timestamptz); INSERT INTO content VALUES ('${menu}','menu','{"imageId":"keep-me","labels":["original"]}',now()), ('${room}','room','{"category":"old"}',now());`);
  assert.equal((await db.query(updateMenuSql,["Specials",true,menu])).rows.length,1);
  const result=await db.query<{data:Record<string,unknown>}>('SELECT data FROM content WHERE id=$1',[menu]);
  assert.deepEqual(result.rows[0].data,{imageId:"keep-me",labels:["original"],category:"Specials",soldOut:true});
  assert.equal((await db.query(updateMenuSql,["Wrong",true,room])).rows.length,0);
  assert.equal(menuDetailsSchema.safeParse({id:menu,category:"x".repeat(121),soldOut:false}).success,false);
 } finally {await db.close()}
});
test("media and menu management endpoints reject foreign and anonymous calls",async()=>{
 const media=(await import("../netlify/functions/staff-media")).default;const menu=(await import("../netlify/functions/staff-menu-details")).default;
 process.env.SITE_URL="https://example.org";delete process.env.SUPABASE_URL;delete process.env.SUPABASE_ANON_KEY;
 for(const [fn,body] of [[media,{action:"list",offset:0}],[menu,{id:"11111111-1111-4111-8111-111111111111",category:"a",soldOut:false}]] as const){
  const call=(origin:string)=>fn(new Request("https://example.org",{method:"POST",headers:{origin,"content-type":"application/json"},body:JSON.stringify(body)}));
  assert.equal((await call("https://example.org")).status,403);assert.equal((await call("https://evil.example")).status,403);
 }
});

test("public projection excludes drafts and raw metadata while joining only mapped public media",async()=>{
 const {PGlite}=await import("@electric-sql/pglite");const {publicContentSql}=await import("../netlify/functions/public-content");
 const db=new PGlite();
 try {
  await db.exec(`CREATE TABLE content(id uuid PRIMARY KEY,kind text,locale text,slug text,title text,description text,price integer,published boolean,sort_order integer,data jsonb); CREATE TABLE gb_media(id uuid PRIMARY KEY,object_key text,alt_text text);
  INSERT INTO gb_media VALUES ('33333333-3333-4333-8333-333333333333','media/44444444-4444-4444-8444-444444444444.webp','A photo');
  INSERT INTO content VALUES ('11111111-1111-4111-8111-111111111111','menu','en','dish','Dish','Description',2000,true,0,'{"category":"Food","soldOut":true,"r2MediaId":"33333333-3333-4333-8333-333333333333","privateFlag":"secret"}'),('22222222-2222-4222-8222-222222222222','menu','en','draft','Draft','Private',1000,false,1,'{}');`);
  const result=await db.query<Record<string,unknown>>(publicContentSql,["menu","en",null]);assert.equal(result.rows.length,1);assert.equal(result.rows[0].title,"Dish");assert.equal(result.rows[0].sold_out,true);assert.equal(result.rows[0].object_key,"media/44444444-4444-4444-8444-444444444444.webp");assert.equal("data" in result.rows[0],false);assert.equal("privateFlag" in result.rows[0],false);
  assert.equal((await db.query(publicContentSql,["menu","en","draft"])).rows.length,0);
 }finally{await db.close()}
});
test("public content input is allowlisted and fails closed without a database",async()=>{
 const publicContent=(await import("../netlify/functions/public-content")).default;
 assert.equal((await publicContent(new Request("https://example.org/?kind=requests&locale=en"))).status,400);
 assert.equal((await publicContent(new Request("https://example.org/?kind=menu&locale=en&locale=fr"))).status,400);
 assert.equal((await publicContent(new Request("https://example.org/?kind=menu&locale=en",{method:"POST"}))).status,405);
});
test("request queue filters data and rejects stale status updates",async()=>{
 const {PGlite}=await import("@electric-sql/pglite");const {listSql,updateSql,listSchema,updateSchema}=await import("../netlify/functions/staff-requests");const db=new PGlite();
 try{
  await db.exec(`CREATE TABLE requests(id uuid PRIMARY KEY,reference text,kind text,locale text,name text,phone text,email text,details jsonb,status text,created_at timestamptz,updated_at timestamptz); INSERT INTO requests VALUES ('11111111-1111-4111-8111-111111111111','GB-R-1','reservation','en','Guest','1234567',null,'{}','pending',now(),now()), ('22222222-2222-4222-8222-222222222222','GB-H-2','hotel','en','Other','7654321',null,'{}','pending',now(),now());`);
  assert.equal((await db.query(listSql,["hotel","pending","Other",0])).rows.length,1);
  assert.equal((await db.query(updateSql,["confirmed","11111111-1111-4111-8111-111111111111","pending"])).rows.length,1);
  assert.equal((await db.query(updateSql,["declined","11111111-1111-4111-8111-111111111111","pending"])).rows.length,0);
  assert.equal(listSchema.safeParse({action:"list",offset:-1}).success,false);
  assert.equal(updateSchema.safeParse({action:"update",id:"11111111-1111-4111-8111-111111111111",status:"confirmed"}).success,false);
 }finally{await db.close()}
});

test("proposed request RLS isolates anonymous, unassigned and authorized staff",async()=>{
 const {PGlite}=await import("@electric-sql/pglite");const {readFile}=await import("node:fs/promises");const db=new PGlite();
 const staff="11111111-1111-4111-8111-111111111111",other="22222222-2222-4222-8222-222222222222";
 try{
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY); CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; INSERT INTO auth.users VALUES ('${staff}'),('${other}'); CREATE TABLE public.requests(id uuid PRIMARY KEY); INSERT INTO requests VALUES ('33333333-3333-4333-8333-333333333333');`);
  await db.exec(await readFile("migrations/001_staff_access_PROPOSED.sql","utf8"));await db.exec(await readFile("migrations/003_request_read_rls_PROPOSED.sql","utf8"));
  await db.query("INSERT INTO gb_staff_access(auth_user_id,role,permissions) VALUES($1,'editor',ARRAY['requests.read'])",[staff]);
  await db.exec("SET ROLE anon");await assert.rejects(db.query("SELECT * FROM requests"));await db.exec("RESET ROLE");
  await db.exec("SET ROLE authenticated");await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)",[other]);assert.equal((await db.query("SELECT * FROM requests")).rows.length,0);
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)",[staff]);assert.equal((await db.query("SELECT * FROM requests")).rows.length,1);
  await assert.rejects(db.query("UPDATE gb_staff_access SET permissions=ARRAY['staff.manage']"));await db.exec("RESET ROLE");
  await db.query("UPDATE gb_staff_access SET active=false WHERE auth_user_id=$1",[staff]);await db.exec("SET ROLE authenticated");assert.equal((await db.query("SELECT * FROM requests")).rows.length,0);await db.exec("RESET ROLE");
 }finally{await db.close()}
});
