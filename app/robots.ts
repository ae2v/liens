import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api"] }, sitemap: "https://liens.ae2v.fr/sitemap.xml" };
}
