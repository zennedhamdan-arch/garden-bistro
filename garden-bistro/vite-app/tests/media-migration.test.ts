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
