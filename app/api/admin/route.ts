import { randomBytes, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { getAdminData, sqlClient } from "@/lib/db";
import { normalizeUrl } from "@/lib/urls";
import { discordInvite, getDiscordStats } from "@/lib/discord";

const reserved = new Set(["admin", "api", "assets", "_next", "opengraph-image"]);
const slugOk = (value: string) => /^[A-Za-z0-9_-]{2,48}$/.test(value) && !reserved.has(value.toLowerCase());
const randomSlug = () => randomBytes(3).toString("base64url").slice(0, 4);

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  return NextResponse.json(await getAdminData());
}

export async function POST(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  const body = await request.json();
  const sql = sqlClient();

  try {
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
        body.item.url = normalizeUrl(String(body.item.url));
        await sql`UPDATE page_items SET kind=${body.item.kind}, title=${body.item.title}, subtitle=${body.item.subtitle ?? ""}, url=${body.item.url}, icon=${body.item.icon}, enabled=${Boolean(body.item.enabled)}, featured=${Boolean(body.item.featured)}, featured_start_at=${body.item.featuredStartAt || null}, featured_end_at=${body.item.featuredEndAt || null}, countdown_at=${body.item.countdownAt || null}, conditions=${JSON.stringify(body.item.conditions)}::jsonb, updated_at=NOW() WHERE id=${body.item.id}`;
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
        body.imageUrl = body.imageUrl ? normalizeUrl(String(body.imageUrl), false) : null;
        if (await sql`SELECT id FROM short_links WHERE LOWER(slug)=LOWER(${slug})`.then(rows => rows.length)) throw new Error("Ce slug existe déjà.");
        const id = randomUUID();
        await sql`INSERT INTO short_links (id, slug, destination, title, description, image_url, expires_at, expiry_message) VALUES (${id}, ${slug}, ${body.destination}, ${body.title || slug}, ${body.description || ""}, ${body.imageUrl || null}, ${body.expiresAt || null}, ${body.expiryMessage || "Ce lien a expiré."})`;
        return NextResponse.json({ ok: true, shortLink: { id, slug } });
      }
      case "updateShort": {
        const slug = String(body.slug);
        if (!slugOk(slug)) throw new Error("Slug invalide ou réservé.");
        const destination = normalizeUrl(String(body.destination));
        const image = body.imageUrl ? normalizeUrl(String(body.imageUrl), false) : null;
        const conflict = await sql`SELECT id FROM short_links WHERE LOWER(slug)=LOWER(${slug}) AND id<>${body.id}`;
        if (conflict.length) throw new Error("Ce slug existe déjà.");
        const current = await sql`SELECT slug FROM short_links WHERE id=${body.id}`;
        if (!current.length) throw new Error("Lien introuvable.");
        if (current[0].slug !== slug) {
          const qr = await sql`SELECT id FROM qr_codes WHERE short_link_id=${body.id} LIMIT 1`;
          if (qr.length) throw new Error("Ce lien possède un QR code : conserve son slug pour que les codes déjà partagés fonctionnent.");
        }
        await sql`UPDATE short_links SET slug=${slug}, destination=${destination}, title=${String(body.title || slug)}, description=${String(body.description || '')}, image_url=${image}, expires_at=${body.expiresAt || null}, expiry_message=${String(body.expiryMessage || 'Ce lien a expiré.')}, enabled=${Boolean(body.enabled)}, updated_at=NOW() WHERE id=${body.id}`;
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
        body.targetUrl = normalizeUrl(String(body.targetUrl));
        if (!/^#[0-9a-f]{6}$/i.test(body.foreground || '#171717') || !/^#[0-9a-f]{6}$/i.test(body.background || '#ffffff')) throw new Error("Couleur invalide.");
        if (body.shortLinkId) {
          const rows = await sql`SELECT slug FROM short_links WHERE id=${body.shortLinkId}`;
          if (!rows.length) throw new Error("Lien court introuvable.");
          body.targetUrl = `${(process.env.NEXT_PUBLIC_SITE_URL || 'https://liens.ae2v.fr').replace(/\/$/, '')}/${rows[0].slug}`;
        }
        await sql`INSERT INTO qr_codes (id, name, target_url, short_link_id, foreground, background) VALUES (${id}, ${body.name || "QR sans titre"}, ${body.targetUrl}, ${body.shortLinkId || null}, ${body.foreground || "#171717"}, ${body.background || "#ffffff"})`;
        break;
      }
      default:
        return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error && error.message.includes("unique") ? "Ce slug existe déjà." : error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
