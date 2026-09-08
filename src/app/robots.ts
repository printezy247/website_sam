import type { MetadataRoute } from "next";
import { BRAND } from "@/config/brand";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/account", "/dashboard", "/admin", "/signin", "/en/account", "/en/dashboard", "/en/admin", "/en/signin"] }],
    sitemap: new URL("/sitemap.xml", BRAND.siteUrl).toString(),
    host: BRAND.siteUrl,
  };
}
