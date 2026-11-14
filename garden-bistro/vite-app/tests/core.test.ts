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
