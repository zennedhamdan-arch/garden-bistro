import { z } from "zod";
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (v) =>
      !isNaN(Date.parse(v)) &&
      new Date(v).toISOString().slice(0, 10) === v &&
      v >=
        new Intl.DateTimeFormat("en-CA", {
          timeZone: "Africa/Kigali",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(new Date()),
    "Choose a future date",
  );
export const requestSchema = z
  .object({
    kind: z.enum(["reservation", "hotel", "event"]),
    locale: z.enum(["en", "fr", "sw"]),
    name: z.string().trim().min(2).max(120),
    phone: z.string().regex(/^\+?[\d\s()-]{7,25}$/),
    email: z.union([z.email(), z.literal("")]).optional(),
    date: date,
    departure: date.optional(),
    time: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
      .optional(),
    guests: z.coerce.number().int().min(1).max(1000),
    message: z.string().max(2000).default(""),
    preference: z.string().max(120).optional(),
    eventType: z.string().max(120).optional(),
    method: z.enum(["phone", "email", "whatsapp"]),
    website: z.string().max(0),
    idempotencyKey: z.uuid(),
  })
  .superRefine((v, ctx) => {
    if (v.kind === "hotel" && (!v.departure || v.departure <= v.date))
      ctx.addIssue({
        code: "custom",
        path: ["departure"],
        message: "Departure must follow arrival",
      });
    if (v.kind === "reservation" && !v.time)
      ctx.addIssue({
        code: "custom",
        path: ["time"],
        message: "Time is required",
      });
    if (v.method === "email" && !v.email)
      ctx.addIssue({
        code: "custom",
        path: ["email"],
        message: "Email required",
      });
  });
export const orderSchema = z.object({
  locale: z.enum(["en", "fr", "sw"]),
  name: z.string().trim().min(2).max(120),
  phone: z.string().regex(/^\+?[\d\s()-]{7,25}$/),
  fulfilment: z.enum(["pickup", "delivery"]),
  address: z.string().max(500).default(""),
  message: z.string().max(2000).default(""),
  zone: z.string().max(100).optional(),
  website: z.string().max(0),
  idempotencyKey: z.uuid(),
  items: z
    .array(
      z.object({ id: z.uuid(), quantity: z.number().int().min(1).max(50) }),
    )
    .min(1)
    .max(50),
});
export function calculateTotal(
  items: { price: number; quantity: number }[],
  fee: number,
) {
  if (!Number.isSafeInteger(fee) || fee < 0) throw new Error("Invalid fee");
  const subtotal = items.reduce((sum, i) => {
    if (
      !Number.isSafeInteger(i.price) ||
      i.price < 0 ||
      !Number.isInteger(i.quantity) ||
      i.quantity < 1 ||
      i.quantity > 50
    )
      throw new Error("Invalid item");
    return sum + i.price * i.quantity;
  }, 0);
  if (!Number.isSafeInteger(subtotal + fee)) throw new Error("Invalid total");
  return { subtotal, fee, total: subtotal + fee };
}
