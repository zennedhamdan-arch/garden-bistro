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
