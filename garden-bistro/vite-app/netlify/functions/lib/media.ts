import sharp from "sharp";
export const maxUploadBytes=5*1024*1024;
const formats = new Map([["image/jpeg","jpeg"],["image/png","png"],["image/webp","webp"]]);
export async function normalizeImage(buffer:Buffer,mime:string) {
  if(!formats.has(mime) || buffer.length===0 || buffer.length>maxUploadBytes) throw new Error("Invalid image");
  const image=sharp(buffer,{limitInputPixels:40_000_000,failOn:"error",animated:false});
  const metadata=await image.metadata();
  if(metadata.format!==formats.get(mime) || !metadata.width || !metadata.height || (metadata.pages ?? 1)>1) throw new Error("Invalid image");
  const output=await image.rotate().resize({width:2400,height:2400,fit:"inside",withoutEnlargement:true}).webp({quality:82}).toBuffer({resolveWithObject:true});
  return {bytes:output.data,width:output.info.width,height:output.info.height};
}
export function publicMediaUrl(baseValue:string,key:string) {
  const base=new URL(baseValue);
  if(base.protocol!=="https:" || base.username || base.password || base.search || base.hash || !/^media\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$/i.test(key)) throw new Error("Invalid public media location");
  return `${base.toString().replace(/\/+$/,"")}/${key}`;
}
