import { authorized, db, json, readJson, sameOrigin } from "./lib/server";
import {canTransition,orderListSchema,orderUpdateSchema} from "./lib/order-status";
export const listOrdersSql=`SELECT id,reference,locale,name,phone,fulfilment,details,subtotal,fee,total,status,created_at FROM orders WHERE ($1='' OR status=$1) AND ($2='' OR position(lower($2) in lower(reference || ' ' || name || ' ' || phone))>0) ORDER BY created_at DESC,id DESC LIMIT 50 OFFSET $3`;
export default async (request:Request)=>{
 if(request.method!=="POST")return json({error:"Method not allowed"},405);if(!sameOrigin(request))return json({error:"Forbidden"},403);
 let body:unknown;try{body=await readJson(request,2048)}catch{return json({error:"Invalid request"},400)}
 const list=orderListSchema.safeParse(body),update=orderUpdateSchema.safeParse(body);if(!list.success&&!update.success)return json({error:"Invalid request"},400);
 try{
  const actor=await authorized(request,list.success?"orders.read":"orders.write");if(!actor)return json({error:"Forbidden"},403);
  if(list.success){const v=list.data;const orders=await db().query(listOrdersSql,[v.status,v.search,v.offset]);const ids=orders.rows.map(r=>r.id);const items=ids.length?(await db().query("SELECT order_id,name,quantity,unit_price FROM order_items WHERE order_id=ANY($1::uuid[]) ORDER BY id",[ids])).rows:[];return json({orders:orders.rows.map(row=>({...row,items:items.filter(i=>i.order_id===row.id)}))})}
  const v=update.data!;const client=await db().connect();try{await client.query("BEGIN");const row=await client.query("SELECT status,fulfilment FROM orders WHERE id=$1 FOR UPDATE",[v.id]);
   if(!row.rowCount || row.rows[0].status!==v.expectedStatus){await client.query("ROLLBACK");return json({error:"Order changed or not found"},409)}
   if(!canTransition(v.expectedStatus,v.status,row.rows[0].fulfilment)){await client.query("ROLLBACK");return json({error:"Invalid status transition"},400)}
   await client.query("UPDATE orders SET status=$1,updated_at=now() WHERE id=$2",[v.status,v.id]);await client.query("INSERT INTO order_status_history(order_id,status) VALUES($1,$2)",[v.id,v.status]);await client.query("INSERT INTO audit_logs(actor,action,record_id) VALUES($1,$2,$3)",[actor,`order.status.${v.status}`,v.id]);await client.query("COMMIT");return json({ok:true});
  }catch(e){await client.query("ROLLBACK");throw e}finally{client.release()}
 }catch{console.error("staff_orders_failed");return json({error:"Service unavailable"},503)}
};
