import { cookies } from "next/headers";
import { sameOrigin } from "@/lib/auth";
export async function POST(req: Request) {
  if (!sameOrigin(req)) return new Response(null, { status: 403 });
  (await cookies()).delete("gb_session");
  return Response.redirect(new URL("/admin/login", req.url), 303);
}
