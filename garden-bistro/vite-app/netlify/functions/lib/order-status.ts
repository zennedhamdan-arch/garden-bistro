import { z } from "zod";
export const orderStatuses=["pending","accepted","preparing","ready_for_pickup","out_for_delivery","completed","cancelled"] as const;
export type OrderStatus=typeof orderStatuses[number];
export const orderStatus=z.enum(orderStatuses);
export const orderListSchema=z.object({action:z.literal("list"),status:z.union([z.literal(""),orderStatus]).default(""),search:z.string().trim().max(120).default(""),offset:z.number().int().min(0).max(100000).default(0)}).strict();
export const orderUpdateSchema=z.object({action:z.literal("update"),id:z.uuid(),status:orderStatus,expectedStatus:orderStatus}).strict();
export function canTransition(from:OrderStatus,to:OrderStatus,fulfilment:string){
 const transitions:Record<OrderStatus,OrderStatus[]>={pending:["accepted","cancelled"],accepted:["preparing","cancelled"],preparing:["ready_for_pickup","out_for_delivery","cancelled"],ready_for_pickup:["completed","cancelled"],out_for_delivery:["completed","cancelled"],completed:[],cancelled:[]};
 return transitions[from].includes(to) && (to!=="ready_for_pickup"||fulfilment==="pickup") && (to!=="out_for_delivery"||fulfilment==="delivery");
}
