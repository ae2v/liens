"use client";

import { useEffect, useState } from "react";
import type { DiscordStats } from "@/lib/discord";

export function DiscordPresence({ initial, fallback }: { initial: DiscordStats | null; fallback: string }) {
  const [stats, setStats] = useState(initial);
  useEffect(() => {
    const controller = new AbortController();
    async function refresh() {
      if (document.hidden) return;
      try {
        const response = await fetch("/api/discord", { signal: controller.signal });
        const data = await response.json();
        setStats(response.ok && data.connected ? data.stats ?? null : null);
      } catch { if (!controller.signal.aborted) setStats(null); }
    }
    const timer = window.setInterval(refresh, 60000);
    document.addEventListener("visibilitychange", refresh);
    return () => { controller.abort(); clearInterval(timer); document.removeEventListener("visibilitychange", refresh); };
  }, []);
  if (!stats) return <small>{fallback || "Rejoins la communauté"}</small>;
  return <span className="discord-presence" title="Estimations fournies par Discord, actualisées chaque minute"><span><i />{stats.online.toLocaleString("fr-FR")} en ligne</span><span>{stats.members.toLocaleString("fr-FR")} membres</span></span>;
}
