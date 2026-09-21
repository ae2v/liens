import { neon } from "@neondatabase/serverless";
import UAParser from "ua-parser-js";
import type { PageItem, QrCodeRecord, ShortLink, SiteSettings, SocialNetwork } from "./types";

function sqlClient() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL n’est pas configurée.");
  return neon(url);
}

let qrSchemaPromise: Promise<void> | null = null;

export function ensureQrSchema() {
  if (!qrSchemaPromise) {
    qrSchemaPromise = (async () => {
      const sql = sqlClient();
      await sql`ALTER TABLE qr_codes ADD COLUMN IF NOT EXISTS tracking_enabled BOOLEAN`;
      await sql`ALTER TABLE qr_codes ADD COLUMN IF NOT EXISTS tracking_key TEXT`;
      await sql`ALTER TABLE qr_codes ADD COLUMN IF NOT EXISTS logo_enabled BOOLEAN NOT NULL DEFAULT TRUE`;
      await sql`ALTER TABLE qr_codes ADD COLUMN IF NOT EXISTS logo_color TEXT NOT NULL DEFAULT '#d60106'`;
      await sql`UPDATE qr_codes SET tracking_enabled = TRUE WHERE tracking_enabled IS NULL`;
      await sql`ALTER TABLE qr_codes ALTER COLUMN tracking_enabled SET DEFAULT FALSE`;
      await sql`ALTER TABLE qr_codes ALTER COLUMN tracking_enabled SET NOT NULL`;
      await sql`CREATE UNIQUE INDEX IF NOT EXISTS qr_codes_tracking_key_idx ON qr_codes(tracking_key) WHERE tracking_key IS NOT NULL`;
    })().catch((error) => {
      qrSchemaPromise = null;
      throw error;
    });
  }
  return qrSchemaPromise;
}

let sharingSchemaPromise: Promise<void> | null = null;
export function ensureSharingSchema() {
  if (!sharingSchemaPromise) sharingSchemaPromise = (async () => {
    const sql = sqlClient();
    await sql`ALTER TABLE short_links ADD COLUMN IF NOT EXISTS social_overrides JSONB NOT NULL DEFAULT '{}'::jsonb`;
    await sql`ALTER TABLE short_links ADD COLUMN IF NOT EXISTS qr_foreground TEXT NOT NULL DEFAULT '#171717'`;
    await sql`ALTER TABLE short_links ADD COLUMN IF NOT EXISTS qr_background TEXT NOT NULL DEFAULT '#ffffff'`;
    await sql`ALTER TABLE short_links ADD COLUMN IF NOT EXISTS qr_logo_enabled BOOLEAN NOT NULL DEFAULT TRUE`;
    await sql`ALTER TABLE short_links ADD COLUMN IF NOT EXISTS qr_logo_color TEXT NOT NULL DEFAULT '#d60106'`;
    await sql`CREATE TABLE IF NOT EXISTS social_networks (id UUID PRIMARY KEY, network TEXT NOT NULL UNIQUE, url TEXT NOT NULL, sort_order INTEGER NOT NULL DEFAULT 0, enabled BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`;
  })().catch((error) => { sharingSchemaPromise = null; throw error; });
  return sharingSchemaPromise;
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
    publishAt: row.publish_at ? new Date(String(row.publish_at)).toISOString() : null,
    expiresAt: row.expires_at ? new Date(String(row.expires_at)).toISOString() : null,
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
    imageAlt: String(row.image_alt ?? ""),
    siteName: String(row.site_name ?? ""),
    twitterSite: String(row.twitter_site ?? ""),
    twitterLargeImage: Boolean(row.twitter_large_image),
    embedColor: String(row.embed_color ?? "#d60106"),
    imageMode: (row.image_mode ?? "url") as ShortLink["imageMode"],
    socialOverrides: (row.social_overrides ?? {}) as ShortLink["socialOverrides"],
    qrForeground: String(row.qr_foreground ?? "#171717"),
    qrBackground: String(row.qr_background ?? "#ffffff"),
    qrLogoEnabled: row.qr_logo_enabled !== false,
    qrLogoColor: String(row.qr_logo_color ?? "#d60106"),
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
  await ensureSharingSchema();
  const sql = sqlClient();
  const [settingsRows, itemRows, networkRows] = await Promise.all([
    sql`SELECT * FROM site_settings WHERE id = 1`,
    sql`SELECT p.*, COUNT(c.id)::int AS clicks
        FROM page_items p
        LEFT JOIN click_events c ON c.page_item_id = p.id
        WHERE p.enabled = TRUE
        GROUP BY p.id
        ORDER BY p.sort_order ASC, p.created_at ASC`,
    sql`SELECT * FROM social_networks WHERE enabled=TRUE AND url<>'' ORDER BY sort_order, created_at`,
  ]);
  return { settings: mapSettings(settingsRows[0]), items: itemRows.map(mapItem), networks: networkRows.map(mapNetwork) };
}

export async function getAdminData() {
  await Promise.all([ensureQrSchema(), ensureSharingSchema()]);
  const sql = sqlClient();
  await sql`DELETE FROM click_events WHERE qr_code_id IN (SELECT id FROM qr_codes WHERE short_link_id IS NOT NULL)`;
  await sql`DELETE FROM qr_codes WHERE short_link_id IS NOT NULL`;
  const [settingsRows, itemRows, shortRows, qrRows, totals, networkRows] = await Promise.all([
    sql`SELECT * FROM site_settings WHERE id = 1`,
    sql`SELECT p.*, COUNT(c.id)::int AS clicks FROM page_items p LEFT JOIN click_events c ON c.page_item_id = p.id GROUP BY p.id ORDER BY p.sort_order, p.created_at`,
    sql`SELECT s.*, COUNT(c.id)::int AS clicks, COUNT(c.id) FILTER (WHERE c.occurred_at >= NOW() - INTERVAL '7 days')::int AS clicks_this_week, MAX(c.occurred_at) AS last_click_at FROM short_links s LEFT JOIN click_events c ON c.short_link_id = s.id GROUP BY s.id ORDER BY s.created_at DESC`,
    sql`SELECT q.*, COUNT(c.id)::int AS scans FROM qr_codes q LEFT JOIN click_events c ON c.qr_code_id=q.id GROUP BY q.id ORDER BY q.created_at DESC`,
    sql`SELECT COUNT(*)::int AS clicks, COUNT(*) FILTER (WHERE occurred_at >= NOW() - INTERVAL '7 days')::int AS week FROM click_events`,
    sql`SELECT * FROM social_networks ORDER BY sort_order, created_at`,
  ]);
  return {
    settings: mapSettings(settingsRows[0]),
    items: itemRows.map(mapItem),
    shortLinks: shortRows.map(mapShortLink),
    qrCodes: qrRows.map((row): QrCodeRecord => ({
      id: String(row.id), name: String(row.name), targetUrl: String(row.target_url),
      shortLinkId: row.short_link_id ? String(row.short_link_id) : null,
      foreground: String(row.foreground), background: String(row.background),
      trackingEnabled: Boolean(row.tracking_enabled),
      logoEnabled: row.logo_enabled !== false,
      logoColor: String(row.logo_color ?? "#d60106"),
      createdAt: new Date(String(row.created_at)).toISOString(), updatedAt: new Date(String(row.updated_at)).toISOString(),
      scans: Number(row.scans ?? 0),
      trackingUrl: Boolean(row.tracking_enabled)
        ? `${(process.env.NEXT_PUBLIC_SITE_URL || 'https://liens.ae2v.fr').replace(/\/$/, '')}/q/${row.tracking_key || row.id}`
        : String(row.target_url),
    })),
    networks: networkRows.map(mapNetwork),
    totals: { clicks: Number(totals[0].clicks), week: Number(totals[0].week) },
  };
}

export async function getSettings() {
  const sql = sqlClient();
  const rows = await sql`SELECT * FROM site_settings WHERE id = 1`;
  return mapSettings(rows[0]);
}

export async function getShortLink(slug: string) {
  await ensureSharingSchema();
  const sql = sqlClient();
  const rows = await sql`SELECT s.*, COUNT(c.id)::int AS clicks, COUNT(c.id) FILTER (WHERE c.occurred_at >= NOW() - INTERVAL '7 days')::int AS clicks_this_week, MAX(c.occurred_at) AS last_click_at FROM short_links s LEFT JOIN click_events c ON c.short_link_id = s.id WHERE LOWER(s.slug) = LOWER(${slug}) GROUP BY s.id`;
  return rows[0] ? mapShortLink(rows[0]) : null;
}

function mapNetwork(row: Record<string, unknown>): SocialNetwork {
  return { id: String(row.id), network: String(row.network), url: String(row.url), sortOrder: Number(row.sort_order), enabled: Boolean(row.enabled) };
}

export async function recordShortClick(linkId: string, request: Request) {
  await recordClick("short_link_id", linkId, request);
}

export async function recordItemClick(itemId: string, request: Request) {
  await recordClick("page_item_id", itemId, request);
}

export async function getQrCode(identifier: string) {
  await ensureQrSchema();
  const sql = sqlClient();
  const rows = await sql`SELECT * FROM qr_codes WHERE id::text=${identifier} OR tracking_key=${identifier} LIMIT 1`;
  return rows[0] ?? null;
}

export async function recordQrScan(id: string, request: Request) {
  await recordClick("qr_code_id", id, request);
}

export { sqlClient };

function isBot(request: Request) {
  return /bot|crawler|spider|facebookexternalhit|preview/i.test(request.headers.get("user-agent") ?? "") || request.headers.get("purpose") === "prefetch";
}

async function recordClick(column: "short_link_id" | "page_item_id" | "qr_code_id", id: string, request: Request) {
  if (isBot(request)) return;
  const parsed = new UAParser(request.headers.get("user-agent") ?? "").getResult();
  const device = parsed.device.type === "tablet" ? "tablet" : parsed.device.type === "mobile" ? "mobile" : "desktop";
  const cityHeader = request.headers.get("x-vercel-ip-city");
  let city = cityHeader;
  try { city = cityHeader ? decodeURIComponent(cityHeader) : null; } catch { /* keep the raw Vercel value */ }
  const sql = sqlClient();
  await sql.query(`INSERT INTO click_events (${column}, referrer, country, city, device, browser, os) VALUES ($1,$2,$3,$4,$5,$6,$7)`, [
    id, request.headers.get("referer"), request.headers.get("x-vercel-ip-country"), city, device,
    parsed.browser.name || "Inconnu", parsed.os.name || "Inconnu",
  ]);
}

export async function getAnalytics(kind: "item" | "short" | "qr", id: string, start: string, end: string) {
  const sql = sqlClient();
  const column = kind === "item" ? "page_item_id" : kind === "short" ? "short_link_id" : "qr_code_id";
  const rows = await sql.query(`SELECT (occurred_at AT TIME ZONE 'Europe/Paris')::date::text AS day,
    COALESCE(device, 'unknown') AS device, COALESCE(country, 'Inconnu') AS country, COALESCE(city, 'Inconnue') AS city,
    COALESCE(browser, 'Inconnu') AS browser, COALESCE(os, 'Inconnu') AS os,
    COALESCE(NULLIF(substring(referrer from '^https?://([^/]+)'), ''), 'Direct / inconnu') AS referrer,
    COUNT(*)::int AS clicks FROM click_events WHERE ${column} = $1
    AND occurred_at >= ($2::date::timestamp AT TIME ZONE 'Europe/Paris')
    AND occurred_at < (($3::date + 1)::timestamp AT TIME ZONE 'Europe/Paris')
    GROUP BY 1, 2, 3, 4, 5, 6, 7 ORDER BY 1`, [id, start, end]);
  const totals = await sql.query(`SELECT COUNT(*)::int AS total, MAX(occurred_at) AS last FROM click_events WHERE ${column} = $1`, [id]);
  const sum = (key: string) => {
    const result = new Map<string, number>();
    for (const row of rows) result.set(String(row[key]), (result.get(String(row[key])) ?? 0) + Number(row.clicks));
    return [...result].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
  };
  const daily = new Map(sum("day").map((row) => [row.label, row.value]));
  const startDate = new Date(`${start}T12:00:00Z`);
  const endDate = new Date(`${end}T12:00:00Z`);
  const days = Math.min(366, Math.max(1, Math.floor((endDate.getTime() - startDate.getTime()) / 86400000) + 1));
  const timeline = Array.from({ length: days }, (_, index) => {
    const date = new Date(startDate); date.setUTCDate(startDate.getUTCDate() + index);
    const label = date.toISOString().slice(0, 10);
    return { label, value: daily.get(label) ?? 0 };
  });
  return { total: Number(totals[0].total), period: timeline.reduce((total, point) => total + point.value, 0), lastClickAt: totals[0].last,
    timeline, devices: sum("device"), countries: sum("country"), cities: sum("city"), browsers: sum("browser"), systems: sum("os"), referrers: sum("referrer") };
}
