import { getDiscordStats } from "@/lib/discord";
import { getSettings } from "@/lib/db";

export async function GET() {
  try {
    const settings = await getSettings();
    if (!settings.discordConnected || !settings.discordInvite) return Response.json({ connected: false });
    return Response.json({ connected: true, stats: await getDiscordStats(settings.discordInvite) }, { headers: { "Cache-Control": "public, s-maxage=60" } });
  } catch { return Response.json({ connected: true, error: "Compteurs temporairement indisponibles." }, { status: 503 }); }
}
