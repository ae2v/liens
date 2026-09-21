import { load } from "cheerio";
import { isIP } from "node:net";
import { lookup } from "node:dns/promises";
import type { SocialMetadata } from "./types";
import { normalizeUrl } from "./urls";

const privateIp = /^(127\.|10\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::1$|fc|fd|fe80)/i;

async function safeUrl(input: string) {
  const url = new URL(normalizeUrl(input, false));
  if (["localhost", "localhost.localdomain"].includes(url.hostname) || privateIp.test(url.hostname)) throw new Error("Cette destination locale n’est pas accessible.");
  const addresses = await lookup(url.hostname, { all: true });
  if (!addresses.length || addresses.some(({ address }) => isIP(address) && privateIp.test(address))) throw new Error("Cette destination locale n’est pas accessible.");
  return url;
}

export async function fetchSocialMetadata(input: string): Promise<SocialMetadata> {
  let url = await safeUrl(input);
  let response: Response | null = null;
  for (let redirects = 0; redirects < 4; redirects += 1) {
    response = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(8000), headers: { "User-Agent": "AE2V-LinkPreview/1.0", Accept: "text/html,application/xhtml+xml" } });
    if (![301, 302, 303, 307, 308].includes(response.status)) break;
    const location = response.headers.get("location");
    if (!location) break;
    url = await safeUrl(new URL(location, url).href);
  }
  if (!response?.ok) throw new Error(`La page distante répond avec le statut ${response?.status ?? "inconnu"}.`);
  if (!(response.headers.get("content-type") ?? "").includes("text/html")) throw new Error("La destination ne fournit pas une page HTML avec des métadonnées.");
  const html = (await response.text()).slice(0, 1_500_000);
  const $ = load(html);
  const meta = (property: string) => $(`meta[property="${property}"],meta[name="${property}"]`).first().attr("content")?.trim() ?? "";
  const absolute = (value: string) => { try { return value ? new URL(value, url).href : ""; } catch { return ""; } };
  return {
    title: meta("og:title") || meta("twitter:title") || $("title").first().text().trim(),
    description: meta("og:description") || meta("twitter:description") || meta("description"),
    imageUrl: absolute(meta("og:image") || meta("twitter:image")),
    imageAlt: meta("og:image:alt") || meta("twitter:image:alt"),
    siteName: meta("og:site_name") || url.hostname.replace(/^www\./, ""),
    twitterSite: meta("twitter:site"),
    twitterLargeImage: (meta("twitter:card") || "summary_large_image") === "summary_large_image",
    embedColor: meta("theme-color") || "#d60106",
  };
}
