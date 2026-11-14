export type ReferenceRow={id:string;legacy_id:string;existing_media_id:string|null;has_media_key:boolean;media_id:string|null;object_key:string|null;sha256:string|null;source_sha256:string|null;source_size:number|null;size_bytes:number|null;version:string};
export type ReferenceState="ready"|"already"|"unmapped"|"conflict"|"invalid";
export function classifyReference(row:ReferenceRow):ReferenceState {
 if(!row.media_id||!row.object_key)return "unmapped";
 if(row.source_sha256!==row.sha256||row.source_size!==row.size_bytes||!row.sha256||!/^[a-f0-9]{64}$/.test(row.sha256)||!row.source_size||row.source_size>5*1024*1024)return "invalid";
 if(!row.has_media_key)return "ready";
 return row.existing_media_id===row.media_id?"already":"conflict";
}
export const referenceInventorySql=`SELECT c.id::text,c.data->>'imageId' AS legacy_id,c.data->>'r2MediaId' AS existing_media_id,c.data ? 'r2MediaId' AS has_media_key,
 m.media_id::text,g.object_key,g.sha256,m.source_sha256,m.source_size,g.size_bytes,md5(c.data::text) AS version
 FROM content c LEFT JOIN gb_legacy_media_map m ON m.legacy_id::text=c.data->>'imageId'
 LEFT JOIN gb_media g ON g.id=m.media_id
 WHERE jsonb_typeof(c.data)='object' AND c.data ? 'imageId' ORDER BY c.id`;
export const referenceUpdateSql=`UPDATE content SET data=jsonb_set(data,'{r2MediaId}',to_jsonb($1::text),true),updated_at=now()
 WHERE id=$2 AND md5(data::text)=$3 AND data->>'imageId'=$4 AND NOT(data ? 'r2MediaId') RETURNING id`;
