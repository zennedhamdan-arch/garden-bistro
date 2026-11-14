import { z } from "zod";
import { db, json } from "./lib/server";
import { publicMediaUrl } from "./lib/media";
const querySchema=z.object({kind:z.enum(["page","menu","room","faq","gallery"]),locale:z.enum(["en","fr","sw"]),slug:z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(120).optional()}).strict();
// Select only deliberately public fields from published rows; never return raw JSON metadata.
export const publicContentSql=`SELECT c.id,c.title,c.description,c.price,c.data->>'category' AS category,
  c.data->'soldOut'='true'::jsonb AS sold_out,m.object_key,COALESCE(NULLIF(c.data->>'alt',''),m.alt_text) AS alt_text
  FROM content c LEFT JOIN gb_media m ON m.id::text=c.data->>'r2MediaId'
  WHERE c.published=true AND c.kind=$1 AND c.locale=$2 AND ($3::text IS NULL OR c.slug=$3)
  ORDER BY c.sort_order,c.title,c.id LIMIT 500`;
export default async (request:Request)=>{
 if(request.method!=="GET")return json({error:"Method not allowed"},405);
 const params=new URL(request.url).searchParams;
 if([...params.keys()].some(k=>!["kind","locale","slug"].includes(k)) || ["kind","locale","slug"].some(k=>params.getAll(k).length>1))return json({error:"Invalid request"},400);
 const parsed=querySchema.safeParse({kind:params.get("kind"),locale:params.get("locale"),...(params.has("slug")?{slug:params.get("slug")}:{})});if(!parsed.success)return json({error:"Invalid request"},400);
 try {const v=parsed.data;const result=await db().query(publicContentSql,[v.kind,v.locale,v.slug??null]);const base=process.env.R2_PUBLIC_BASE_URL;
  const items=result.rows.map(r=>{let image:null|{url:string;alt:string}=null;if(base&&r.object_key&&typeof r.alt_text==="string"&&r.alt_text.trim()){try{image={url:publicMediaUrl(base,r.object_key),alt:r.alt_text}}catch{console.error("invalid_public_media_key")}}return {id:r.id,title:r.title,description:r.description,price:r.price,category:typeof r.category==="string"?r.category:null,soldOut:r.sold_out===true,image}});
  return json({items});
 }catch{console.error("public_content_failed");return json({error:"Content unavailable"},503)}
};
