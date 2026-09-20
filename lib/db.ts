import { neon } from "@neondatabase/serverless";
import type { PageItem, QrCodeRecord, ShortLink, SiteSettings } from "./types";

function sqlClient() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL n’est pas configurée.");
  return neon(url);
}

function mapSettings(row: Record<string, unknown>): SiteSettings {
  return {
    id: Number(row.id),
    displayName: String(row.display_name),
    bio: String(row.bio),
    logoPath: String(row.logo_path),
    discordInvite: row.discord_invite ? String(row.discord_invite) : null,
    discordConnected: Boolean(row.discord_connected),
  };
}

function mapItem(row: Record<string, unknown>): PageItem {
  return {
    id: String(row.id),
    kind: row.kind as PageItem["kind"],
    title: String(row.title),
    subtitle: String(row.subtitle ?? ""),
    url: String(row.url),
    icon: String(row.icon),
    enabled: Boolean(row.enabled),
    featured: Boolean(row.featured),
    featuredStartAt: row.featured_start_at ? new Date(String(row.featured_start_at)).toISOString() : null,
    featuredEndAt: row.featured_end_at ? new Date(String(row.featured_end_at)).toISOString() : null,
    countdownAt: row.countdown_at ? new Date(String(row.countdown_at)).toISOString() : null,
    conditions: (row.conditions ?? { mode: "all", rules: [] }) as PageItem["conditions"],
    sortOrder: Number(row.sort_order),
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
    clicks: Number(row.clicks ?? 0),
  };
}

function mapShortLink(row: Record<string, unknown>): ShortLink {
  return {
    id: String(row.id),
    slug: String(row.slug),
    destination: String(row.destination),
    title: String(row.title),
    description: String(row.description ?? ""),
    imageUrl: row.image_url ? String(row.image_url) : null,
    expiresAt: row.expires_at ? new Date(String(row.expires_at)).toISOString() : null,
    expiryMessage: String(row.expiry_message),
    enabled: Boolean(row.enabled),
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
    clicks: Number(row.clicks ?? 0),
    clicksThisWeek: Number(row.clicks_this_week ?? 0),
    lastClickAt: row.last_click_at ? new Date(String(row.last_click_at)).toISOString() : null,
  };
}

export async function getPublicData() {
  const sql = sqlClient();
  const [settingsRows, itemRows] = await Promise.all([
    sql`SELECT * FROM site_settings WHERE id = 1`,
    sql`SELECT p.*, COUNT(c.id)::int AS clicks
        FROM page_items p
        LEFT JOIN click_events c ON c.page_item_id = p.id
        WHERE p.enabled = TRUE
        GROUP BY p.id
        ORDER BY p.sort_order ASC, p.created_at ASC`,
  ]);
  return { settings: mapSettings(settingsRows[0]), items: itemRows.map(mapItem) };
}

export async function getAdminData() {
  const sql = sqlClient();
  const [settingsRows, itemRows, shortRows, qrRows, totals] = await Promise.all([
    sql`SELECT * FROM site_settings WHERE id = 1`,
    sql`SELECT p.*, COUNT(c.id)::int AS clicks FROM page_items p LEFT JOIN click_events c ON c.page_item_id = p.id GROUP BY p.id ORDER BY p.sort_order, p.created_at`,
    sql`SELECT s.*, COUNT(c.id)::int AS clicks, COUNT(c.id) FILTER (WHERE c.occurred_at >= NOW() - INTERVAL '7 days')::int AS clicks_this_week, MAX(c.occurred_at) AS last_click_at FROM short_links s LEFT JOIN click_events c ON c.short_link_id = s.id GROUP BY s.id ORDER BY s.created_at DESC`,
    sql`SELECT * FROM qr_codes ORDER BY created_at DESC`,
    sql`SELECT COUNT(*)::int AS clicks, COUNT(*) FILTER (WHERE occurred_at >= NOW() - INTERVAL '7 days')::int AS week FROM click_events`,
  ]);
  return {
    settings: mapSettings(settingsRows[0]),
    items: itemRows.map(mapItem),
    shortLinks: shortRows.map(mapShortLink),
    qrCodes: qrRows.map((row): QrCodeRecord => ({
      id: String(row.id), name: String(row.name), targetUrl: String(row.target_url),
      shortLinkId: row.short_link_id ? String(row.short_link_id) : null,
      foreground: String(row.foreground), background: String(row.background),
      createdAt: new Date(String(row.created_at)).toISOString(),
    })),
    totals: { clicks: Number(totals[0].clicks), week: Number(totals[0].week) },
  };
}

export async function getShortLink(slug: string) {
  const sql = sqlClient();
  const rows = await sql`SELECT s.*, COUNT(c.id)::int AS clicks, COUNT(c.id) FILTER (WHERE c.occurred_at >= NOW() - INTERVAL '7 days')::int AS clicks_this_week, MAX(c.occurred_at) AS last_click_at FROM short_links s LEFT JOIN click_events c ON c.short_link_id = s.id WHERE LOWER(s.slug) = LOWER(${slug}) GROUP BY s.id`;
  return rows[0] ? mapShortLink(rows[0]) : null;
}

export async function recordShortClick(linkId: string, request: Request) {
  const sql = sqlClient();
  const ua = request.headers.get("user-agent") ?? "";
  const device = /mobile|android|iphone/i.test(ua) ? "mobile" : /tablet|ipad/i.test(ua) ? "tablet" : "desktop";
  await sql`INSERT INTO click_events (short_link_id, referrer, country, device) VALUES (${linkId}, ${request.headers.get("referer")}, ${request.headers.get("x-vercel-ip-country")}, ${device})`;
}

export async function recordItemClick(itemId: string, request: Request) {
  const sql = sqlClient();
  const ua = request.headers.get("user-agent") ?? "";
  const device = /mobile|android|iphone/i.test(ua) ? "mobile" : /tablet|ipad/i.test(ua) ? "tablet" : "desktop";
  await sql`INSERT INTO click_events (page_item_id, referrer, country, device) VALUES (${itemId}, ${request.headers.get("referer")}, ${request.headers.get("x-vercel-ip-country")}, ${device})`;
}

export { sqlClient };
