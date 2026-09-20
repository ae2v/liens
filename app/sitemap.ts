import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: "https://liens.ae2v.fr", changeFrequency: "weekly", priority: 1 }];
}
