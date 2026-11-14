export const dynamic = "force-dynamic";
import { MetadataRoute } from "next";
import { locales } from "@/lib/i18n";
import { content } from "@/lib/db";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!process.env.SITE_URL || process.env.ALLOW_INDEXING !== "true") return [];
  const base = process.env.SITE_URL;
  const routes = [
    "",
    "/hotel",
    "/restaurant",
    "/contact",
    "/about",
    "/reservations",
  ];
  const result: MetadataRoute.Sitemap = [];
  for (const locale of locales) {
    for (const route of routes)
      result.push({
        url: base + "/" + locale + route,
        alternates: {
          languages: Object.fromEntries(
            locales.map((l) => [l, base + "/" + l + route]),
          ),
        },
      });
    for (const record of await content(locale)) {
      if (
        record.kind === "page" &&
        record.slug !== "home" &&
        !routes.includes("/" + record.slug)
      )
        result.push({ url: base + "/" + locale + "/" + record.slug });
      if (["room", "menu"].includes(record.kind))
        result.push({
          url:
            base +
            "/" +
            locale +
            "/" +
            (record.kind === "room" ? "rooms" : "menu") +
            "/" +
            record.slug,
        });
    }
  }
  return result;
}
