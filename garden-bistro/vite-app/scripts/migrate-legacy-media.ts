import { Client, type QueryResult } from "pg";
import { randomUUID } from "node:crypto";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { copyLegacyImage, inspectLegacyImage, type LegacyImage, type MigrationAdapter } from "./legacy-media-lib";
import { publicMediaUrl } from "../netlify/functions/lib/media";

async function main(){
 const args=process.argv.slice(2);if(args.length!==1 || !["--dry-run","--execute"].includes(args[0]))throw new Error("Specify exactly --dry-run or --execute");
 const execute=args[0]==="--execute";const sourceUrl=process.env.SOURCE_DATABASE_URL;if(!sourceUrl)throw new Error("SOURCE_DATABASE_URL required");
 const source=new Client({connectionString:sourceUrl});let target:Client|undefined;let sourceConnected=false,targetConnected=false,locked=false;
 let copied=0,verified=0,examined=0;
 try {
  await source.connect();sourceConnected=true;await source.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
  let adapter:MigrationAdapter|undefined;
  if(execute){
   if(process.env.MIGRATION_PUBLIC_MEDIA_APPROVED!=="yes")throw new Error("Explicit public media approval required");
   const {DATABASE_URL:targetUrl,R2_ACCOUNT_ID:account,R2_ACCESS_KEY_ID:accessKeyId,R2_SECRET_ACCESS_KEY:secretAccessKey,R2_BUCKET_NAME:bucket,R2_PUBLIC_BASE_URL:base,MIGRATION_UPLOADER_ID:uploader}=process.env;
   if(!targetUrl||!account||!/^[a-f0-9]{32}$/i.test(account)||!accessKeyId||!secretAccessKey||!bucket||!base||!uploader||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uploader))throw new Error("Target/R2 variables or uploader are missing or invalid");
   publicMediaUrl(base,`media/${randomUUID()}.webp`);
   target=new Client({connectionString:targetUrl});await target.connect();targetConnected=true;await target.query("SELECT pg_advisory_lock(714299)");locked=true;
   const targetClient=target;const s3=new S3Client({region:"auto",endpoint:`https://${account}.r2.cloudflarestorage.com`,credentials:{accessKeyId,secretAccessKey}});
   adapter={
    lookup:async id=>{const r=await targetClient.query("SELECT m.source_sha256,m.source_size,g.object_key FROM gb_legacy_media_map m JOIN gb_media g ON g.id=m.media_id WHERE m.legacy_id=$1",[id]);return r.rows[0]??null},
    readObject:async key=>{publicMediaUrl(base,key);const r=await s3.send(new GetObjectCommand({Bucket:bucket,Key:key}));if(!r.Body || !r.ContentLength || r.ContentLength>5*1024*1024)throw new Error("R2 object missing or invalid size");return r.Body.transformToByteArray()},
    upload:async (image,info)=>{const key=`media/${randomUUID()}.webp`;try{await s3.send(new PutObjectCommand({Bucket:bucket,Key:key,Body:image.bytes,ContentType:"image/webp",IfNoneMatch:"*",Metadata:{sha256:info.sha256}}));return key}catch(e){console.error("r2_upload_uncertain_reconcile_key",key);throw e}},
    record:async (image,info,key)=>{try{await targetClient.query("BEGIN");const r=await targetClient.query("INSERT INTO gb_media(object_key,public_url,alt_text,mime_type,size_bytes,width,height,sha256,uploader) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id",[key,publicMediaUrl(base,key),"Legacy image — description needed","image/webp",info.size,info.width,info.height,info.sha256,uploader]);await targetClient.query("INSERT INTO gb_legacy_media_map(legacy_id,source_sha256,source_size,media_id) VALUES($1,$2,$3,$4)",[image.id,info.sha256,info.size,r.rows[0].id]);await targetClient.query("INSERT INTO audit_logs(actor,action,record_id) VALUES($1,$2,$3)",[uploader,"media.legacy.copy",r.rows[0].id]);await targetClient.query("COMMIT")}catch(e){try{await targetClient.query("ROLLBACK")}catch{}console.error("r2_mapping_uncertain_reconcile_key",key);throw e}},
   };
  }
  let cursor:string|null=null;
  for(;;){const page:QueryResult<LegacyImage>=await source.query<LegacyImage>("SELECT id::text AS id,mime_type,bytes FROM images WHERE ($1::uuid IS NULL OR id>$1::uuid) ORDER BY id LIMIT 1",[cursor]);if(!page.rows.length)break;
   for(const image of page.rows){examined++;if(adapter){const result=await copyLegacyImage(image,adapter);if(result==="copied")copied++;else verified++}else await inspectLegacyImage(image);cursor=image.id}
  }
  await source.query("COMMIT");console.log(JSON.stringify({mode:execute?"execute":"dry-run",examined,copied,verifiedExisting:verified,sourceBytesDeleted:0,referencesChanged:0}));
 }finally{if(sourceConnected){try{await source.query("ROLLBACK")}catch{}await source.end()}if(targetConnected&&target){if(locked){try{await target.query("SELECT pg_advisory_unlock(714299)")}catch{}}await target.end()}}
}
main().catch(()=>{console.error("Legacy media migration failed. Source data was not deleted; inspect logs and reconcile any listed R2 object keys before retrying.");process.exitCode=1});
