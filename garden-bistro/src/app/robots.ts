export const dynamic = "force-dynamic";
import { MetadataRoute } from "next";
export default function robots(): MetadataRoute.Robots {
  const live = process.env.ALLOW_INDEXING === "true" && !!process.env.SITE_URL;
  return {
    rules: live
      ? { userAgent: "*", allow: "/", disallow: ["/admin", "/api"] }
      : { userAgent: "*", disallow: "/" },
    sitemap: live ? process.env.SITE_URL + "/sitemap.xml" : undefined,
  };
}
