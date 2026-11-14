import { randomBytes } from "node:crypto";
import { db, json, limit, readJson, sameOrigin } from "./lib/server";
import { orderSchema } from "./lib/validation";
import { businessOrderSettings, priceOrder } from "./lib/order";
export default async (request:Request)=>{
 if(request.method!=="POST")return json({error:"Method not allowed"},405);
 if(!sameOrigin(request))return json({error:"Forbidden"},403);
 // An independently configured, explicit owner-approved gate is required in
 // addition to the existing business settings. It defaults to disabled.
 if(process.env.ORDERING_APPROVED!=="true")return json({error:"Ordering unavailable"},409);
 let payload:unknown;try{payload=await readJson(request,16384)}catch{return json({error:"Invalid request"},400)}
 const parsed=orderSchema.safeParse(payload);if(!parsed.success)return json({error:"Invalid request"},400);const v=parsed.data;
 try {
  if(!(await limit(request,"orders")))return json({error:"Please try later"},429);
  const c=await db().connect();try{
   await c.query("BEGIN");
   // Serialize concurrent retries of the same idempotency key before lookup.
   await c.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))",[v.idempotencyKey]);
   const existing=await c.query("SELECT reference,status,subtotal,fee,total FROM orders WHERE idempotency_key=$1",[v.idempotencyKey]);
   if(existing.rowCount){await c.query("COMMIT");return json(existing.rows[0])}
   const settingRows=await c.query("SELECT data FROM settings WHERE id='business' FOR SHARE");
   const settingResult=businessOrderSettings.safeParse(settingRows.rows[0]?.data);if(!settingResult.success)throw new Error("Invalid settings");const s=settingResult.data;
   if(!s.orderingEnabled || !s[v.fulfilment+"Enabled" as "pickupEnabled"|"deliveryEnabled"] || !s.paymentInstructions[v.locale]?.trim())throw new Error("Ordering unavailable");
   if(v.fulfilment==="delivery"&&v.address.trim().length<5)throw new Error("Address required");
   const ids=v.items.map(i=>i.id);const result=await c.query("SELECT id,title,price,data FROM content WHERE id=ANY($1::uuid[]) AND kind='menu' AND locale=$2 AND published=true FOR SHARE",[ids,v.locale]);
   const zone=v.fulfilment==="delivery"?s.deliveryZones.find(z=>z.id===v.zone&&z.enabled):undefined;if(v.fulfilment==="delivery"&&!zone)throw new Error("Zone unavailable");
   const calculated=priceOrder(v.items,result.rows,zone?.fee??0,s.minimumOrder);const reference=`GB-O-${randomBytes(5).toString("hex").toUpperCase()}`;
   const order=await c.query("INSERT INTO orders(reference,locale,name,phone,fulfilment,details,subtotal,fee,total,idempotency_key) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id",[reference,v.locale,v.name,v.phone,v.fulfilment,JSON.stringify({address:v.address,message:v.message,zone:v.zone,paymentInstructions:s.paymentInstructions[v.locale]}),calculated.subtotal,calculated.fee,calculated.total,v.idempotencyKey]);
   for(const item of calculated.snapshots)await c.query("INSERT INTO order_items(order_id,menu_item_id,name,quantity,unit_price) VALUES($1,$2,$3,$4,$5)",[order.rows[0].id,item.id,item.name,item.quantity,item.price]);
   await c.query("INSERT INTO order_status_history(order_id,status) VALUES($1,'pending')",[order.rows[0].id]);await c.query("COMMIT");return json({reference,status:"pending",subtotal:calculated.subtotal,fee:calculated.fee,total:calculated.total});
  }catch(e){await c.query("ROLLBACK");console.error("order_transaction_failed");return json({error:"Order could not be submitted. Refresh the menu and review your order."},409)}finally{c.release()}
 }catch{console.error("order_submission_failed");return json({error:"Service unavailable"},503)}
};
