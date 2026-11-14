import {z} from "zod";
const time=z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const hours=z.object({day:z.number().int().min(0).max(6),closed:z.boolean().nullable(),open:z.union([time,z.literal("")]),close:z.union([time,z.literal("")])}).strict().superRefine((v,ctx)=>{if(v.closed===false&&(!v.open||!v.close))ctx.addIssue({code:"custom",message:"Open and close times required"})});
const https=z.union([z.literal(""),z.url().refine(v=>{try{const u=new URL(v);return u.protocol==="https:"&&!u.username&&!u.password}catch{return false}},"HTTPS required")]);
export const businessProfileSchema=z.object({published:z.boolean(),address:z.string().trim().max(300),phone:z.string().trim().max(25).regex(/^(|\+?[\d\s()-]{7,25})$/),email:z.union([z.email().max(254),z.literal("")]),website:https,whatsapp:z.string().regex(/^(|[1-9]\d{6,14})$/),hours:z.array(hours).length(7).refine(a=>new Set(a.map(d=>d.day)).size===7,"Each day must occur once")}).strict();
export const businessSaveSchema=z.object({action:z.literal("save"),version:z.string().regex(/^[a-f0-9]{32}$/),profile:businessProfileSchema}).strict();
export const businessGetSchema=z.object({action:z.literal("get")}).strict();
export function emptyBusinessProfile(){return {published:false,address:"",phone:"",email:"",website:"",whatsapp:"",hours:Array.from({length:7},(_,day)=>({day,closed:null,open:"",close:""}))}}
