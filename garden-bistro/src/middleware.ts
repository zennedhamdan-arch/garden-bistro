import { NextResponse, NextRequest } from "next/server";
export function middleware(request: NextRequest) {
  const headers = new Headers(request.headers);
  const locale = request.nextUrl.pathname.split("/")[1];
  headers.set(
    "x-garden-locale",
    ["en", "fr", "sw"].includes(locale) ? locale : "en",
  );
  const response = NextResponse.next({ request: { headers } });
  response.headers.set(
    "Content-Language",
    ["en", "fr", "sw"].includes(locale) ? locale : "en",
  );
  if (process.env.ALLOW_INDEXING !== "true")
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}
export const config = { matcher: ["/((?!api|_next|favicon.ico).*)"] };
