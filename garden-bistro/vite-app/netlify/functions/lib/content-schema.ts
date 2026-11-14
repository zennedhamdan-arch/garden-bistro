import { z } from "zod";
export const kinds=["page","room","menu","category","faq","gallery","event"] as const;
export const contentListSchema=z.object({action:z.literal("list"),kind:z.enum(kinds),locale:z.enum(["en","fr","sw"]),offset:z.number().int().min(0).max(100000).default(0)}).strict();
export const contentSaveSchema=z.object({action:z.literal("save"),id:z.uuid().optional(),kind:z.enum(kinds),locale:z.enum(["en","fr","sw"]),slug:z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(120),title:z.string().trim().min(1).max(200),description:z.string().max(5000),price:z.number().int().min(0).max(2147483647).nullable(),published:z.boolean(),sort_order:z.number().int().min(-100000).max(100000)}).strict();
export const contentPermission=(kind:typeof kinds[number],mode:"read"|"write")=>`content.${kind}.${mode}`;
