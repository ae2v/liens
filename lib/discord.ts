import { normalizeUrl } from "./urls";

export type DiscordStats = { name: string; members: number; online: number; invite: string; checkedAt: string };

export function discordInvite(input: string) {
  const url = new URL(normalizeUrl(input, false));
  const match = url.hostname === "discord.gg" ? url.pathname.match(/^\/([\w-]+)\/?$/) :
    ["discord.com", "www.discord.com"].includes(url.hostname) ? url.pathname.match(/^\/invite\/([\w-]+)\/?$/) : null;
  if (!match) throw new Error("Utilise une invitation discord.gg/… ou discord.com/invite/…");
  return { code: match[1], url: `https://discord.gg/${match[1]}` };
}

export async function getDiscordStats(input: string): Promise<DiscordStats> {
  const invite = discordInvite(input);
  const response = await fetch(`https://discord.com/api/v10/invites/${encodeURIComponent(invite.code)}?with_counts=true`, {
    next: { revalidate: 60 }, signal: AbortSignal.timeout(6000),
  });
  if (!response.ok) throw new Error(response.status === 404 ? "Invitation Discord expirée ou introuvable." : "Discord est temporairement indisponible. Réessaie dans une minute.");
  const data = await response.json();
  if (!data.guild || !Number.isFinite(data.approximate_member_count) || !Number.isFinite(data.approximate_presence_count)) throw new Error("Discord n’a pas retourné les compteurs du serveur.");
  return { name: data.guild.name, members: data.approximate_member_count, online: data.approximate_presence_count, invite: invite.url, checkedAt: new Date().toISOString() };
}
