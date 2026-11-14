import { createHash } from "node:crypto";
import sharp from "sharp";
export type LegacyImage={id:string; mime_type:string; bytes:Buffer};
export type ImageInfo={sha256:string;size:number;width:number;height:number};
export async function inspectLegacyImage(image:LegacyImage):Promise<ImageInfo>{
 if(image.mime_type!=="image/webp"||!Buffer.isBuffer(image.bytes)||image.bytes.length===0||image.bytes.length>5*1024*1024)throw new Error("Invalid legacy image");
 const m=await sharp(image.bytes,{limitInputPixels:40_000_000,failOn:"error",animated:false}).metadata();
 if(m.format!=="webp"||!m.width||!m.height||(m.pages??1)>1)throw new Error("Invalid legacy image");
 // Decode the full image to verify it is not merely a valid header.
 await sharp(image.bytes,{limitInputPixels:40_000_000,failOn:"error"}).stats();
 return {sha256:createHash("sha256").update(image.bytes).digest("hex"),size:image.bytes.length,width:m.width,height:m.height};
}
export function verifyBytes(bytes:Uint8Array,info:ImageInfo){
 return bytes.byteLength===info.size && createHash("sha256").update(bytes).digest("hex")===info.sha256;
}
export type Existing={source_sha256:string;source_size:number;object_key:string};
export type MigrationAdapter={
 lookup:(id:string)=>Promise<Existing|null>;
 readObject:(key:string)=>Promise<Uint8Array>;
 upload:(image:LegacyImage,info:ImageInfo)=>Promise<string>;
 record:(image:LegacyImage,info:ImageInfo,key:string)=>Promise<void>;
};
/** Only write a mapping after a byte-for-byte readback; never remove source data. */
export async function copyLegacyImage(image:LegacyImage,adapter:MigrationAdapter):Promise<"verified-existing"|"copied">{
 const info=await inspectLegacyImage(image);const previous=await adapter.lookup(image.id);
 if(previous){if(previous.source_sha256!==info.sha256||Number(previous.source_size)!==info.size)throw new Error("Source does not match existing mapping");if(!verifyBytes(await adapter.readObject(previous.object_key),info))throw new Error("Existing R2 object failed verification");return "verified-existing"}
 const key=await adapter.upload(image,info);
 if(!verifyBytes(await adapter.readObject(key),info))throw new Error(`R2 object verification failed for ${key}; reconcile object manually`);
 await adapter.record(image,info,key);
 return "copied";
}
