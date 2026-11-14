import {db,json,sameOrigin,staffIdentity} from "./lib/server";
export const overviewRequestsSql="SELECT count(*)::int AS pending FROM requests WHERE status='pending'";
export const overviewOrdersSql="SELECT count(*)::int AS pending FROM orders WHERE status='pending'";
export default async(request:Request)=>{
 if(request.method!=="POST")return json({error:"Method not allowed"},405);if(!sameOrigin(request))return json({error:"Forbidden"},403);
 try{const staff=await staffIdentity(request);if(!staff||!staff.permissions.includes("dashboard.read"))return json({error:"Forbidden"},403);
  const metrics:{pendingRequests:number|null;pendingOrders:number|null}={pendingRequests:null,pendingOrders:null};
  if(staff.permissions.includes("requests.read"))metrics.pendingRequests=(await db().query(overviewRequestsSql)).rows[0].pending;
  if(staff.permissions.includes("orders.read"))metrics.pendingOrders=(await db().query(overviewOrdersSql)).rows[0].pending;
  return json({metrics});
 }catch{console.error("staff_overview_failed");return json({error:"Service unavailable"},503)}
};
