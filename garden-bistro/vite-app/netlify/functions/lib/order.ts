import { z } from "zod";
import { calculateTotal } from "./validation";
export const businessOrderSettings = z.object({
 orderingEnabled:z.boolean().default(false),pickupEnabled:z.boolean().default(false),deliveryEnabled:z.boolean().default(false),
 minimumOrder:z.number().int().min(0).max(2147483647).default(0),
 paymentInstructions:z.record(z.string(),z.string().max(2000)).default({}),
 deliveryZones:z.array(z.object({id:z.string().min(1).max(100),fee:z.number().int().min(0).max(2147483647),enabled:z.boolean()})).max(100).default([]),
});
type MenuItem={id:string;title:string;price:number|null;data:Record<string,unknown>|null};
type RequestedItem={id:string;quantity:number};
export function priceOrder(items:RequestedItem[],menu:MenuItem[],fee:number,minimum:number){
 if(new Set(items.map(i=>i.id)).size!==items.length)throw new Error("Duplicate items");
 const snapshots=items.map(item=>{const row=menu.find(r=>r.id===item.id);if(!row||row.price===null||row.data?.soldOut)throw new Error("Item unavailable");return {id:item.id,quantity:item.quantity,price:row.price,name:row.title}});
 const totals=calculateTotal(snapshots,fee);if(totals.subtotal<minimum||totals.total>2147483647)throw new Error("Invalid order total");return {snapshots,...totals};
}
