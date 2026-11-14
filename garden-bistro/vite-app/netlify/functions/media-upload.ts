import { randomUUID, createHash } from "node:crypto";
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { authorized, db, json, sameOrigin } from "./lib/server";
import { maxUploadBytes, normalizeImage, publicMediaUrl } from "./lib/media";
export default async (request:Request) => {
  if(request.method!=="POST")return json({error:"Method not allowed"},405);
  if(!sameOrigin(request))return json({error:"Forbidden"},403);
  try {
    const actor=await authorized(request,"media.write"); if(!actor)return json({error:"Forbidden"},403);
    const {R2_ACCOUNT_ID:account,R2_ACCESS_KEY_ID:accessKeyId,R2_SECRET_ACCESS_KEY:secretAccessKey,R2_BUCKET_NAME:bucket,R2_PUBLIC_BASE_URL:publicBase}=process.env;
    if(!account || !/^[a-f0-9]{32}$/i.test(account) || !accessKeyId || !secretAccessKey || !bucket || !publicBase)throw new Error("R2 not configured");
    const base=new URL(publicBase); if(base.protocol!=="https:" || base.username || base.password || base.search || base.hash)throw new Error("Invalid public base URL");
    if(!request.headers.get("content-type")?.startsWith("multipart/form-data"))return json({error:"Invalid content type"},415);
    const length=Number(request.headers.get("content-length")); if(!Number.isFinite(length)||length<=0||length>maxUploadBytes+65536)return json({error:"Invalid upload size"},413);
    const form=await request.formData();const file=form.get("file");const alt=form.get("alt");
    if(!(file instanceof File)||typeof alt!=="string"||alt.trim().length<1||alt.length>250||file.size>maxUploadBytes)return json({error:"Invalid upload"},400);
    let image; try{image=await normalizeImage(Buffer.from(await file.arrayBuffer()),file.type)}catch{return json({error:"Invalid image"},400)}
    const key=`media/${randomUUID()}.webp`; const url=publicMediaUrl(publicBase,key); const sha256=createHash("sha256").update(image.bytes).digest("hex");
    const s3=new S3Client({region:"auto",endpoint:`https://${account}.r2.cloudflarestorage.com`,credentials:{accessKeyId,secretAccessKey}});
    await s3.send(new PutObjectCommand({Bucket:bucket,Key:key,Body:image.bytes,ContentType:"image/webp"}));
    let commitAttempted=false;
    try {
      const object=await s3.send(new GetObjectCommand({Bucket:bucket,Key:key}));
      if(!object.Body || object.ContentLength!==image.bytes.length)throw new Error("Upload verification failed");
      const downloaded=await object.Body.transformToByteArray();
      if(createHash("sha256").update(downloaded).digest("hex")!==sha256)throw new Error("Upload verification failed");
      const c=await db().connect();try{await c.query("BEGIN");const result=await c.query("INSERT INTO gb_media(object_key,public_url,alt_text,mime_type,size_bytes,width,height,sha256,uploader) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id",[key,url,alt.trim(),"image/webp",image.bytes.length,image.width,image.height,sha256,actor]);await c.query("INSERT INTO audit_logs(actor,action,record_id) VALUES($1,$2,$3)",[actor,"media.upload",result.rows[0].id]);commitAttempted=true;await c.query("COMMIT");return json({id:result.rows[0].id,url},201)}catch(e){await c.query("ROLLBACK");throw e}finally{c.release()}
    } catch(e) {if(commitAttempted){console.error("r2_commit_uncertain_reconcile_before_cleanup",key)}else{try{await s3.send(new DeleteObjectCommand({Bucket:bucket,Key:key}))}catch{console.error("orphaned_r2_object",key)}}throw e}
  } catch {console.error("media_upload_failed");return json({error:"Service unavailable"},503)}
};
