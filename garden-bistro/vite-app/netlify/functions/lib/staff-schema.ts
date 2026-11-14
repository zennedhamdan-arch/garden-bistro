import { z } from "zod";
import { kinds } from "./content-schema";
export const permissions=["requests.read","requests.write","media.write","staff.manage",...kinds.flatMap(k=>[`content.${k}.read`,`content.${k}.write`])] as const;
const role=z.enum(["administrator","manager","restaurant_staff","reception_staff","editor"]);
const permission=z.enum(permissions);
export const staffList=z.object({action:z.literal("list")}).strict();
export const staffInvite=z.object({action:z.literal("invite"),email:z.email().max(254),role,permissions:z.array(permission).max(permissions.length).refine(a=>new Set(a).size===a.length)}).strict();
export const staffChange=z.object({action:z.literal("change"),id:z.uuid(),role,active:z.boolean(),permissions:z.array(permission).max(permissions.length).refine(a=>new Set(a).size===a.length)}).strict();
