import test from "node:test";
import assert from "node:assert/strict";
import {businessOrderSettings,priceOrder} from "../netlify/functions/lib/order";
import orders from "../netlify/functions/orders";
const id="11111111-1111-4111-8111-111111111111";
const item={id,title:"Dish",price:1000,data:{}};
test("prices are derived from server menu and validated with integer fees and minimum",()=>{
 assert.deepEqual(priceOrder([{id,quantity:2}],[item],300,1000),{snapshots:[{id,quantity:2,price:1000,name:"Dish"}],subtotal:2000,fee:300,total:2300});
 assert.throws(()=>priceOrder([{id,quantity:1},{id,quantity:1}],[item],0,0));
 assert.throws(()=>priceOrder([{id,quantity:1}],[{...item,data:{soldOut:true}}],0,0));
 assert.throws(()=>priceOrder([{id,quantity:1}],[],0,0));
 assert.throws(()=>priceOrder([{id,quantity:1}],[item],0,2000));
 assert.throws(()=>priceOrder([{id,quantity:1}],[item],-1,0));
 assert.equal(businessOrderSettings.safeParse({orderingEnabled:true,deliveryZones:[{id:"x",fee:-10,enabled:true}]}).success,false);
});
test("orders remain closed without an explicit owner-approved server switch",async()=>{
 process.env.SITE_URL="https://example.org";delete process.env.ORDERING_APPROVED;
 const response=await orders(new Request("https://example.org",{method:"POST",headers:{origin:"https://example.org","content-type":"application/json"},body:"{}"}));assert.equal(response.status,409);
 const foreign=await orders(new Request("https://example.org",{method:"POST",headers:{origin:"https://evil.example"}}));assert.equal(foreign.status,403);
});

test("order submission requires explicit matching displayed prices and fees",async()=>{
 const {confirmedOrderSchema}=await import("../netlify/functions/orders");
 const order={locale:"en",name:"Guest",phone:"+250788000000",fulfilment:"pickup",address:"",message:"",zone:"",website:"",idempotencyKey:id,expectedFee:0,items:[{id,quantity:1,expectedUnitPrice:1000}]};
 assert.equal(confirmedOrderSchema.safeParse(order).success,true);
 assert.equal(confirmedOrderSchema.safeParse({...order,expectedFee:undefined}).success,false);
 assert.equal(confirmedOrderSchema.safeParse({...order,items:[{id,quantity:1}]}).success,false);
 assert.throws(()=>priceOrder([{id,quantity:1,expectedUnitPrice:999}],[item],0,0));
});
test("staff order transitions enforce the fulfillment and terminal states",async()=>{
 const {canTransition,orderUpdateSchema}=await import("../netlify/functions/lib/order-status");
 assert.equal(canTransition("pending","accepted","pickup"),true);
 assert.equal(canTransition("pending","completed","pickup"),false);
 assert.equal(canTransition("preparing","out_for_delivery","pickup"),false);
 assert.equal(canTransition("preparing","out_for_delivery","delivery"),true);
 assert.equal(canTransition("completed","pending","pickup"),false);
 assert.equal(orderUpdateSchema.safeParse({action:"update",id,status:"pending",expectedStatus:"unknown"}).success,false);
});
test("settings validation rejects invalid or duplicate delivery zones",async()=>{
 const {settingsSaveSchema}=await import("../netlify/functions/staff-settings");
 const settings={action:"save",expectedHash:"0".repeat(32),orderingEnabled:false,pickupEnabled:true,deliveryEnabled:false,minimumOrder:0,paymentInstructions:{en:"",fr:"",sw:""},deliveryZones:[{id:"zone-a",name:"Zone A",fee:0,enabled:true}]};
 assert.equal(settingsSaveSchema.safeParse(settings).success,true);
 assert.equal(settingsSaveSchema.safeParse({...settings,deliveryZones:[settings.deliveryZones[0],settings.deliveryZones[0]]}).success,false);
 assert.equal(settingsSaveSchema.safeParse({...settings,deliveryZones:[{...settings.deliveryZones[0],fee:-1}]}).success,false);
 assert.equal(settingsSaveSchema.safeParse({...settings,orderingEnabled:"true"}).success,false);
});
test("admin orders and settings reject anonymous and foreign requests",async()=>{
 const functions=[(await import("../netlify/functions/staff-orders")).default,(await import("../netlify/functions/staff-settings")).default];process.env.SITE_URL="https://example.org";delete process.env.SUPABASE_URL;delete process.env.SUPABASE_ANON_KEY;
 for(const [i,fn] of functions.entries()){const body=i?{action:"get"}:{action:"list"};const call=(origin:string)=>fn(new Request("https://example.org",{method:"POST",headers:{origin,"content-type":"application/json"},body:JSON.stringify(body)}));assert.equal((await call("https://example.org")).status,403);assert.equal((await call("https://evil.example")).status,403)}
});
test("public order options remain closed when approval is absent",async()=>{
 const opts=(await import("../netlify/functions/order-options")).default;delete process.env.ORDERING_APPROVED;
 const r=await opts(new Request("https://example.org/?locale=en"));assert.deepEqual(await r.json(),{enabled:false});
 assert.equal((await opts(new Request("https://example.org/?locale=en&locale=fr"))).status,400);
});
