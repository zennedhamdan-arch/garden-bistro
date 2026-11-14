import {Client} from "pg";
import {createHash} from "node:crypto";
import {S3Client,GetObjectCommand} from "@aws-sdk/client-s3";
import {publicMediaUrl} from "../netlify/functions/lib/media";
import {classifyReference,referenceInventorySql,referenceUpdateSql,type ReferenceRow} from "./legacy-reference-lib";
async function main(){
 const args=process.argv.slice(2);if(args.length!==1||!["--dry-run","--execute"].includes(args[0]))throw new Error("Specify --dry-run or --execute");const execute=args[0]==="--execute";
 const url=process.env.DATABASE_URL;if(!url)throw new Error("DATABASE_URL required");
 const client=new Client({connectionString:url});let connected=false,started=false;
 try{await client.connect();connected=true;await client.query(`BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ ${execute?"READ WRITE":"READ ONLY"}`);started=true;
  if(execute)await client.query("SELECT pg_advisory_xact_lock(714300)");
  const rows=(await client.query<ReferenceRow>(referenceInventorySql)).rows;const counts={total:rows.length,ready:0,already:0,unmapped:0,conflict:0,invalid:0,updated:0};for(const row of rows)counts[classifyReference(row)]++;
  if(!execute){await client.query("COMMIT");started=false;console.log(JSON.stringify({mode:"dry-run",...counts}));return}
  if(process.env.MIGRATION_REFERENCES_APPROVED!=="yes")throw new Error("Reference migration approval required");if(counts.unmapped||counts.conflict||counts.invalid)throw new Error("Unresolved mappings or conflicts; no references changed");
  const {R2_ACCOUNT_ID:account,R2_ACCESS_KEY_ID:accessKeyId,R2_SECRET_ACCESS_KEY:secretAccessKey,R2_BUCKET_NAME:bucket,R2_PUBLIC_BASE_URL:base,MIGRATION_ACTOR_ID:actor}=process.env;
  if(!account||!/^[a-f0-9]{32}$/i.test(account)||!accessKeyId||!secretAccessKey||!bucket||!base||!actor||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(actor))throw new Error("Target, R2 or actor configuration missing");
  const s3=new S3Client({region:"auto",endpoint:`https://${account}.r2.cloudflarestorage.com`,credentials:{accessKeyId,secretAccessKey}});const verified=new Set<string>();
  for(const row of rows){if(!row.object_key||!row.sha256||!row.source_size)throw new Error("Invalid mapped image");
   if(!verified.has(row.object_key)){publicMediaUrl(base,row.object_key);const object=await s3.send(new GetObjectCommand({Bucket:bucket,Key:row.object_key}));if(!object.Body||object.ContentLength!==row.source_size)throw new Error("R2 length mismatch");const bytes=await object.Body.transformToByteArray();if(bytes.length!==row.source_size||createHash("sha256").update(bytes).digest("hex")!==row.sha256)throw new Error("R2 digest mismatch");verified.add(row.object_key)}
   if(classifyReference(row)==="ready"){const changed=await client.query(referenceUpdateSql,[row.media_id,row.id,row.version,row.legacy_id]);if(!changed.rowCount)throw new Error("Content changed during migration");await client.query("INSERT INTO audit_logs(actor,action,record_id) VALUES($1,'content.legacy_media.link',$2)",[actor,row.id]);counts.updated++}
  }
  await client.query("COMMIT");started=false;console.log(JSON.stringify({mode:"execute",...counts,objectsVerified:verified.size,originalReferencesRetained:true}));
 }finally{if(started){try{await client.query("ROLLBACK")}catch{}}if(connected)await client.end()}
}
main().catch(()=>{console.error("Reference migration failed. The commit status may be uncertain; inspect the target and audit log before retrying.");process.exitCode=1});
