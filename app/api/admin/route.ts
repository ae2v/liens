import { randomBytes, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { ensureQrSchema, getAdminData, sqlClient } from "@/lib/db";
import { normalizeUrl } from "@/lib/urls";
import { discordInvite, getDiscordStats } from "@/lib/discord";

const reserved = new Set(["admin", "api", "assets", "_next", "opengraph-image"]);
const slugOk = (value: string) => /^[A-Za-z0-9_-]{2,48}$/.test(value) && !reserved.has(value.toLowerCase());
const randomSlug = () => randomBytes(3).toString("base64url").slice(0, 4);
const hexColor = (value: unknown) => /^#[0-9a-f]{6}$/i.test(String(value ?? ""));
const backgroundColor = (value: unknown) => String(value) === "transparent" || hexColor(value);

async function uniqueTrackingKey(sql: ReturnType<typeof sqlClient>) {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const key = randomSlug();
    const rows = await sql`SELECT id FROM qr_codes WHERE tracking_key=${key} LIMIT 1`;
    if (!rows.length) return key;
  }
  throw new Error("Impossible de générer une adresse de suivi.");
}

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  return NextResponse.json(await getAdminData());
}

export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const body = await request.json();
  const sql = sqlClient();

  try {
    if (body.action === "createQr" || body.action === "updateQr" || body.action === "deleteQr") await ensureQrSchema();
    switch (body.action) {
      case "settings":
        await sql`UPDATE site_settings SET display_name=${String(body.displayName)}, bio=${String(body.bio)}, updated_at=NOW() WHERE id=1`;
        break;
      case "discordTest":
        return NextResponse.json({ ok: true, stats: await getDiscordStats(String(body.invite)) });
      case "discordConnect": {
        const stats = await getDiscordStats(String(body.invite));
        const invite = discordInvite(String(body.invite)).url;
        await sql`UPDATE site_settings SET discord_invite=${invite}, discord_connected=TRUE, updated_at=NOW() WHERE id=1`;
        await sql`UPDATE page_items SET url=${invite}, updated_at=NOW() WHERE kind='discord'`;
        return NextResponse.json({ ok: true, stats });
      }
      case "discordDisconnect":
        await sql`UPDATE site_settings SET discord_connected=FALSE, updated_at=NOW() WHERE id=1`;
        break;
      case "createItem": {
        const id = randomUUID();
        const next = await sql`SELECT COALESCE(MAX(sort_order), 0) + 10 AS value FROM page_items`;
        await sql`INSERT INTO page_items (id, kind, title, subtitle, url, icon, sort_order) VALUES (${id}, 'link', 'Nouveau lien', '', 'https://ae2v.fr', 'Link', ${Number(next[0].value)})`;
        break;
      }
      case "updateItem":
        if (body.item.kind === "discord") {
          const stats = await getDiscordStats(String(body.item.url));
          body.item.url = stats.invite;
        } else body.item.url = normalizeUrl(String(body.item.url));
        await sql`UPDATE page_items SET kind=${body.item.kind}, title=${body.item.title}, subtitle=${body.item.subtitle ?? ""}, url=${body.item.url}, icon=${body.item.icon}, enabled=${Boolean(body.item.enabled)}, featured=${Boolean(body.item.featured)}, countdown_at=${body.item.countdownAt || null}, publish_at=${body.item.publishAt || null}, expires_at=${body.item.expiresAt || null}, updated_at=NOW() WHERE id=${body.item.id}`;
        break;
      case "deleteItem":
        await sql`DELETE FROM page_items WHERE id=${body.id}`;
        break;
      case "moveItem": {
        const rows = await sql`SELECT id FROM page_items ORDER BY sort_order, created_at`;
        const ids = rows.map((row) => String(row.id));
        const index = ids.indexOf(body.id);
        const other = body.direction === "up" ? index - 1 : index + 1;
        if (index >= 0 && other >= 0 && other < ids.length) {
          [ids[index], ids[other]] = [ids[other], ids[index]];
          await Promise.all(ids.map((id, position) => sql`UPDATE page_items SET sort_order=${position * 10} WHERE id=${id}`));
        }
        break;
      }
      case "createShort": {
        const slug = String(body.slug || randomSlug());
        if (!slugOk(slug)) throw new Error("Slug invalide ou réservé.");
        body.destination = normalizeUrl(String(body.destination));
        body.imageUrl = imageValue(body.imageUrl, body.imageMode);
        if (await sql`SELECT id FROM short_links WHERE LOWER(slug)=LOWER(${slug})`.then(rows => rows.length)) throw new Error("Ce slug existe déjà.");
        const id = randomUUID();
        await sql`INSERT INTO short_links (id, slug, destination, title, description, image_url, image_alt, site_name, twitter_site, twitter_large_image, embed_color, image_mode, expires_at, expiry_message) VALUES (${id}, ${slug}, ${body.destination}, ${body.title || slug}, ${body.description || ""}, ${body.imageUrl || null}, ${body.imageAlt || ""}, ${body.siteName || ""}, ${body.twitterSite || ""}, ${body.twitterLargeImage !== false}, ${validColor(body.embedColor)}, ${body.imageMode || "url"}, ${body.expiresAt || null}, ${body.expiryMessage || "Ce lien a expiré."})`;
        return NextResponse.json({ ok: true, shortLink: { id, slug } });
      }
      case "updateShort": {
        const slug = String(body.slug);
        if (!slugOk(slug)) throw new Error("Slug invalide ou réservé.");
        const destination = normalizeUrl(String(body.destination));
        const image = imageValue(body.imageUrl, body.imageMode);
        const conflict = await sql`SELECT id FROM short_links WHERE LOWER(slug)=LOWER(${slug}) AND id<>${body.id}`;
        if (conflict.length) throw new Error("Ce slug existe déjà.");
        const current = await sql`SELECT id FROM short_links WHERE id=${body.id}`;
        if (!current.length) throw new Error("Lien introuvable.");
        await sql`UPDATE short_links SET slug=${slug}, destination=${destination}, title=${String(body.title || slug)}, description=${String(body.description || '')}, image_url=${image}, image_alt=${String(body.imageAlt || '')}, site_name=${String(body.siteName || '')}, twitter_site=${String(body.twitterSite || '')}, twitter_large_image=${body.twitterLargeImage !== false}, embed_color=${validColor(body.embedColor)}, image_mode=${body.imageMode || 'url'}, expires_at=${body.expiresAt || null}, expiry_message=${String(body.expiryMessage || 'Ce lien a expiré.')}, enabled=${Boolean(body.enabled)}, updated_at=NOW() WHERE id=${body.id}`;
        break;
      }
      case "toggleShort":
        await sql`UPDATE short_links SET enabled=${Boolean(body.enabled)}, updated_at=NOW() WHERE id=${body.id}`;
        break;
      case "deleteShort":
        await sql`DELETE FROM short_links WHERE id=${body.id}`;
        break;
      case "createQr": {
        const id = randomUUID();
        const target = normalizeUrl(String(body.targetUrl));
        const foreground = body.foreground || "#171717";
        const background = body.background || "#ffffff";
        if (!hexColor(foreground) || !backgroundColor(background)) throw new Error("Couleur invalide.");
        const trackingEnabled = Boolean(body.trackingEnabled) && !body.shortLinkId;
        const trackingKey = trackingEnabled ? await uniqueTrackingKey(sql) : null;
        const logoEnabled = body.logoEnabled !== false;
        const logoColor = body.logoColor || "#d60106";
        if (!hexColor(logoColor)) throw new Error("Couleur du logo invalide.");
        await sql`INSERT INTO qr_codes (id, name, target_url, short_link_id, foreground, background, tracking_enabled, tracking_key, logo_enabled, logo_color) VALUES (${id}, ${String(body.name || "").trim()}, ${target}, ${body.shortLinkId || null}, ${foreground}, ${background}, ${trackingEnabled}, ${trackingKey}, ${logoEnabled}, ${logoColor})`;
        return NextResponse.json({ ok: true, qrCode: { id } });
      }
      case "updateQr": {
        const target = normalizeUrl(String(body.targetUrl));
        if (!hexColor(body.foreground) || !backgroundColor(body.background)) throw new Error("Couleur invalide.");
        const trackingEnabled = Boolean(body.trackingEnabled) && !body.shortLinkId;
        const current = await sql`SELECT tracking_key FROM qr_codes WHERE id=${body.id}`;
        if (!current.length) throw new Error("QR code introuvable.");
        const trackingKey = trackingEnabled && !current[0].tracking_key ? await uniqueTrackingKey(sql) : current[0].tracking_key;
        const logoEnabled = body.logoEnabled !== false;
        const logoColor = body.logoColor || "#d60106";
        if (!hexColor(logoColor)) throw new Error("Couleur du logo invalide.");
        await sql`UPDATE qr_codes SET name=${String(body.name || "").trim()}, target_url=${target}, short_link_id=${body.shortLinkId || null}, foreground=${body.foreground}, background=${body.background}, tracking_enabled=${trackingEnabled}, tracking_key=${trackingKey}, logo_enabled=${logoEnabled}, logo_color=${logoColor}, updated_at=NOW() WHERE id=${body.id}`;
        break;
      }
      case "deleteQr":
        await sql`DELETE FROM click_events WHERE qr_code_id=${body.id}`;
        await sql`DELETE FROM qr_codes WHERE id=${body.id}`;
        break;
      default:
        return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error && error.message.includes("unique") ? "Ce slug existe déjà." : error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

function validColor(value: unknown) {
  return /^#[0-9a-f]{6}$/i.test(String(value ?? "")) ? String(value) : "#d60106";
}

function imageValue(value: unknown, mode: unknown) {
  if (!value || mode === "generated") return null;
  const image = String(value);
  if (mode === "upload") {
    if (!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(image) || image.length > 2_800_000) throw new Error("Image importée invalide ou supérieure à 2 Mo.");
    return image;
  }
  return normalizeUrl(image, false);
}
