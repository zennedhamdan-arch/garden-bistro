import test from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import {copyLegacyImage,inspectLegacyImage,verifyBytes,type LegacyImage,type MigrationAdapter,type Existing} from "../scripts/legacy-media-lib";

async function fixture():Promise<LegacyImage>{return {id:"11111111-1111-4111-8111-111111111111",mime_type:"image/webp",bytes:await sharp({create:{width:7,height:5,channels:3,background:"green"}}).webp().toBuffer()}}
test("legacy copy verifies bytes, records mapping, and re-verifies on retry without uploading",async()=>{
 const image=await fixture();const original=Buffer.from(image.bytes);const objects=new Map<string,Uint8Array>();let record:Existing|null=null;let uploads=0;
 const adapter:MigrationAdapter={lookup:async()=>record,upload:async(i)=>{uploads++;objects.set("media/item.webp",Buffer.from(i.bytes));return "media/item.webp"},readObject:async key=>objects.get(key)!,record:async(_i,info,key)=>{record={source_sha256:info.sha256,source_size:info.size,object_key:key}}};
 assert.equal(await copyLegacyImage(image,adapter),"copied");assert.equal(await copyLegacyImage(image,adapter),"verified-existing");assert.equal(uploads,1);assert.deepEqual(image.bytes,original);
 objects.set("media/item.webp",Buffer.from("corrupt"));await assert.rejects(copyLegacyImage(image,adapter),/verification/);assert.equal(uploads,1);
});
test("legacy copy never records failed readback or changed source mappings",async()=>{
 const image=await fixture();let records=0;const info=await inspectLegacyImage(image);
 const adapter:MigrationAdapter={lookup:async()=>null,upload:async()=>"media/bad.webp",readObject:async()=>Buffer.from("bad"),record:async()=>{records++}};
 await assert.rejects(copyLegacyImage(image,adapter),/verification/);assert.equal(records,0);
 adapter.lookup=async()=>({source_sha256:"0".repeat(64),source_size:info.size,object_key:"media/bad.webp"});await assert.rejects(copyLegacyImage(image,adapter),/Source does not match/);assert.equal(records,0);
 assert.equal(verifyBytes(image.bytes,info),true);assert.equal(verifyBytes(Buffer.from("bad"),info),false);
 await assert.rejects(inspectLegacyImage({...image,mime_type:"image/png"}));
});
test("legacy mapping migration is additive and denies direct authenticated access",async()=>{
 const {PGlite}=await import("@electric-sql/pglite");const {readFile}=await import("node:fs/promises");const db=new PGlite();
 try{await db.exec("CREATE ROLE anon; CREATE ROLE authenticated; CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY); CREATE TABLE images(id uuid PRIMARY KEY, bytes bytea); INSERT INTO images VALUES ('11111111-1111-4111-8111-111111111111',decode('616263','hex'));");
  await db.exec(await readFile("migrations/002_media_PROPOSED.sql","utf8"));await db.exec(await readFile("migrations/005_legacy_media_map_PROPOSED.sql","utf8"));
  const row=await db.query<{hex:string}>("SELECT encode(bytes,'hex') AS hex FROM images");assert.equal(row.rows[0].hex,"616263");await db.exec("SET ROLE authenticated");await assert.rejects(db.query("SELECT * FROM gb_legacy_media_map"));await db.exec("RESET ROLE");
 }finally{await db.close()}
});

test("legacy references are linked additively and refuse conflicting or stale data",async()=>{
 const {PGlite}=await import("@electric-sql/pglite");const {referenceInventorySql,referenceUpdateSql,classifyReference}=await import("../scripts/legacy-reference-lib");const db=new PGlite();const legacy="11111111-1111-4111-8111-111111111111",media="22222222-2222-4222-8222-222222222222",content="33333333-3333-4333-8333-333333333333",sha="a".repeat(64);
 try{
  await db.exec(`CREATE TABLE content(id uuid PRIMARY KEY,data jsonb,updated_at timestamptz);CREATE TABLE gb_legacy_media_map(legacy_id uuid,media_id uuid,source_sha256 text,source_size integer);CREATE TABLE gb_media(id uuid,object_key text,sha256 text,size_bytes integer);INSERT INTO gb_media VALUES ('${media}','media/44444444-4444-4444-8444-444444444444.webp','${sha}',10);INSERT INTO gb_legacy_media_map VALUES ('${legacy}','${media}','${sha}',10);INSERT INTO content VALUES ('${content}','{"imageId":"${legacy}","alt":"Original alt","other":true}',now());`);
  const result=await db.query<import("../scripts/legacy-reference-lib").ReferenceRow>(referenceInventorySql);const row=result.rows[0];assert.equal(classifyReference(row),"ready");
  assert.equal((await db.query(referenceUpdateSql,[media,content,row.version,legacy])).rows.length,1);
  assert.equal((await db.query(referenceUpdateSql,[media,content,row.version,legacy])).rows.length,0);
  const data=(await db.query<{data:Record<string,unknown>}>("SELECT data FROM content")).rows[0].data;assert.deepEqual(data,{imageId:legacy,r2MediaId:media,alt:"Original alt",other:true});
  assert.equal(classifyReference((await db.query<import("../scripts/legacy-reference-lib").ReferenceRow>(referenceInventorySql)).rows[0]),"already");
  await db.query("UPDATE content SET data=jsonb_set(data,'{r2MediaId}',to_jsonb('other'::text))");assert.equal(classifyReference((await db.query<import("../scripts/legacy-reference-lib").ReferenceRow>(referenceInventorySql)).rows[0]),"conflict");
  await db.query("UPDATE gb_media SET sha256=$1",["b".repeat(64)]);assert.equal(classifyReference((await db.query<import("../scripts/legacy-reference-lib").ReferenceRow>(referenceInventorySql)).rows[0]),"invalid");
 }finally{await db.close()}
});
