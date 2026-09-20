import { randomBytes, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { getAdminData, sqlClient } from "@/lib/db";

const reserved = new Set(["admin", "api", "assets", "_next", "opengraph-image"]);
const validUrl = (value: string) => /^(https?:\/\/|mailto:)/i.test(value);
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
        await sql`UPDATE site_settings SET display_name=${String(body.displayName)}, bio=${String(body.bio)}, discord_invite=${body.discordInvite || null}, discord_connected=${Boolean(body.discordConnected)}, updated_at=NOW() WHERE id=1`;
        break;
      case "createItem": {
        const id = randomUUID();
        const next = await sql`SELECT COALESCE(MAX(sort_order), 0) + 10 AS value FROM page_items`;
        await sql`INSERT INTO page_items (id, kind, title, subtitle, url, icon, sort_order) VALUES (${id}, 'link', 'Nouveau lien', '', 'https://ae2v.fr', 'Link', ${Number(next[0].value)})`;
        break;
      }
      case "updateItem":
        if (!validUrl(String(body.item.url))) throw new Error("L’URL doit commencer par http://, https:// ou mailto:");
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
        if (!validUrl(String(body.destination))) throw new Error("Destination invalide.");
        const id = randomUUID();
        await sql`INSERT INTO short_links (id, slug, destination, title, description, image_url, expires_at, expiry_message) VALUES (${id}, ${slug}, ${body.destination}, ${body.title || slug}, ${body.description || ""}, ${body.imageUrl || null}, ${body.expiresAt || null}, ${body.expiryMessage || "Ce lien a expiré."})`;
        return NextResponse.json({ ok: true, shortLink: { id, slug } });
      }
      case "toggleShort":
        await sql`UPDATE short_links SET enabled=${Boolean(body.enabled)}, updated_at=NOW() WHERE id=${body.id}`;
        break;
      case "deleteShort":
        await sql`DELETE FROM short_links WHERE id=${body.id}`;
        break;
      case "createQr": {
        const id = randomUUID();
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
