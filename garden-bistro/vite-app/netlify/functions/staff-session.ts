import { json, sameOrigin, staffIdentity } from "./lib/server";
export default async (request:Request) => {
 if(request.method!=="POST")return json({error:"Method not allowed"},405);
 if(!sameOrigin(request))return json({error:"Forbidden"},403);
 try {const staff=await staffIdentity(request);return staff ? json({role:staff.role,permissions:staff.permissions}) : json({error:"Forbidden"},403)} catch {console.error("staff_session_failed");return json({error:"Service unavailable"},503)}
};
