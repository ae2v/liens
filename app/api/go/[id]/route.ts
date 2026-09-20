import { sqlClient, recordItemClick, getSettings } from "@/lib/db";
import { conditionsMatch } from "@/lib/conditions";
import type { Conditions } from "@/lib/types";
import { normalizeUrl } from "@/lib/urls";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response('Lien introuvable', { status: 404 });
  const sql = sqlClient();
  const rows = await sql`SELECT * FROM page_items WHERE id=${id}`;
  const item = rows[0];
  if (!item || !item.enabled || !conditionsMatch(item.conditions as Conditions)) return new Response('Ce lien est indisponible.', { status: 410 });
  let destination = String(item.url);
  if (item.kind === 'discord') { const settings = await getSettings(); if (settings.discordConnected && settings.discordInvite) destination = settings.discordInvite; }
  if (request.method === 'GET') await recordItemClick(id, request);
  return new Response(null, { status: 307, headers: { Location: normalizeUrl(destination), 'Cache-Control': 'no-store' } });
}
