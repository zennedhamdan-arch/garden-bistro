import { db,json } from "./lib/server";
import { businessOrderSettings } from "./lib/order";
export default async (request:Request)=>{
 if(request.method!=="GET")return json({error:"Method not allowed"},405);
 const params=new URL(request.url).searchParams,locale=params.get("locale");
 if(!locale||!["en","fr","sw"].includes(locale)||[...params.keys()].some(k=>k!=="locale")||params.getAll("locale").length!==1)return json({error:"Invalid request"},400);
 if(process.env.ORDERING_APPROVED!=="true")return json({enabled:false});
 try{const row=await db().query("SELECT data FROM settings WHERE id='business'");const parsed=businessOrderSettings.safeParse(row.rows[0]?.data);if(!parsed.success)return json({enabled:false});const s=parsed.data;const instructions=s.paymentInstructions[locale]?.trim();
  if(!s.orderingEnabled||!instructions||(!s.pickupEnabled&&!s.deliveryEnabled))return json({enabled:false});
  const zones=s.deliveryZones.filter(z=>z.enabled&&z.name?.trim()).map(z=>({id:z.id,name:z.name!,fee:z.fee}));
  if(!s.pickupEnabled && (!s.deliveryEnabled || zones.length===0))return json({enabled:false});
  return json({enabled:true,pickupEnabled:s.pickupEnabled,deliveryEnabled:s.deliveryEnabled&&zones.length>0,minimumOrder:s.minimumOrder,paymentInstructions:instructions,zones});
 }catch{console.error("order_options_failed");return json({error:"Service unavailable"},503)}
};
