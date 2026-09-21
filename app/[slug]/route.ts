import { NextResponse } from "next/server";
import { getShortLink, recordShortClick } from "@/lib/db";

const botPattern = /bot|crawler|spider|facebookexternalhit|facebot|twitterbot|linkedinbot|slackbot|discordbot|whatsapp|telegrambot/i;
const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character);

function html(title: string, description: string, image: string, url: string, expired = false, options: { imageAlt?: string; siteName?: string; twitterSite?: string; largeImage?: boolean; color?: string } = {}) {
  const safeTitle = escapeHtml(title); const safeDescription = escapeHtml(description); const safeImage = escapeHtml(image); const safeUrl = escapeHtml(url);
  const alt = escapeHtml(options.imageAlt || title); const site = escapeHtml(options.siteName || "AE2V"); const twitter = escapeHtml(options.twitterSite || ""); const color = escapeHtml(options.color || "#d60106");
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${safeTitle} — AE2V</title><meta name="description" content="${safeDescription}"><meta name="theme-color" content="${color}"><meta property="og:title" content="${safeTitle}"><meta property="og:description" content="${safeDescription}"><meta property="og:image" content="${safeImage}"><meta property="og:image:alt" content="${alt}"><meta property="og:url" content="${safeUrl}"><meta property="og:site_name" content="${site}"><meta property="og:type" content="website"><meta name="twitter:card" content="${options.largeImage === false ? "summary" : "summary_large_image"}"><meta name="twitter:title" content="${safeTitle}"><meta name="twitter:description" content="${safeDescription}"><meta name="twitter:image" content="${safeImage}"><meta name="twitter:image:alt" content="${alt}">${twitter ? `<meta name="twitter:site" content="${twitter}">` : ""}<meta name="robots" content="noindex"><style>body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;box-sizing:border-box;background:#f4f3ef;color:#171717;font-family:Arial,sans-serif}main{width:min(100%,520px);text-align:center}img{width:110px}h1{margin:28px 0 10px;font-size:32px;letter-spacing:-1px}p{color:#6f706b;line-height:1.55}a{display:inline-block;margin-top:18px;padding:13px 18px;border-radius:10px;color:#fff;background:#d60106;font-weight:700;text-decoration:none}</style></head><body><main><img src="/assets/logo-ae2v.svg" alt="AE2V"><h1>${safeTitle}</h1><p>${safeDescription}</p>${expired ? '<a href="/">Voir les liens de l’AE2V</a>' : ""}</main></body></html>`;
}

export async function GET(request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const link = await getShortLink(slug);
  if (!link) return new NextResponse(html("Lien introuvable", "Cette adresse n’existe pas ou plus.", `${new URL(request.url).origin}/opengraph-image`, request.url, true), { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } });
  const expired = !link.enabled || Boolean(link.expiresAt && new Date(link.expiresAt) < new Date());
  if (expired) return new NextResponse(html("Lien expiré", link.expiryMessage, link.imageUrl ?? `${new URL(request.url).origin}/opengraph-image`, request.url, true), { status: 410, headers: { "Content-Type": "text/html; charset=utf-8" } });

  const userAgent = request.headers.get("user-agent") ?? "";
  if (botPattern.test(userAgent)) {
    const origin = new URL(request.url).origin;
    const image = link.imageMode === "generated" ? `${origin}/api/share-image/${link.id}` : link.imageMode === "upload" ? `${origin}/api/meta-image/${link.id}` : link.imageUrl || `${origin}/opengraph-image`;
    return new NextResponse(html(link.title, link.description || "Un lien partagé par l’AE2V.", image, request.url, false, { imageAlt: link.imageAlt, siteName: link.siteName, twitterSite: link.twitterSite, largeImage: link.twitterLargeImage, color: link.embedColor }), { headers: { "Content-Type": "text/html; charset=utf-8", "X-Robots-Tag": "noindex" } });
  }
  if (request.method === 'GET') await recordShortClick(link.id, request);
  const response = NextResponse.redirect(link.destination, 307);
  response.headers.set('Cache-Control', 'no-store');
  return response;
}
