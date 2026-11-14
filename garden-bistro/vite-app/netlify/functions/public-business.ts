import {db,json} from "./lib/server";
import {businessProfileSchema} from "./lib/business-profile";
export default async(request:Request)=>{
 if(request.method!=="GET")return json({error:"Method not allowed"},405);
 try{const r=await db().query("SELECT data->'businessProfile' AS profile FROM settings WHERE id='business'");const parsed=businessProfileSchema.safeParse(r.rows[0]?.profile);if(!parsed.success||!parsed.data.published)return json({profile:null});return json({profile:parsed.data})}catch{console.error("public_business_failed");return json({error:"Service unavailable"},503)}
};
