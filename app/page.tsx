import { Globe2 } from "lucide-react";
import { isFeatured, isPublished } from "@/lib/conditions";
import { getPublicData } from "@/lib/db";
import { PublicLink } from "@/components/public-link";
import { ShareDialog } from "@/components/share-dialog";
import { BrandIcon } from "@/components/brand-icon";
import { getDiscordStats } from "@/lib/discord";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { settings, items, networks } = await getPublicData();
  const now = new Date();
  const visible = items.filter((item) => isPublished(item, now)).sort((a, b) => Number(isFeatured(b, now)) - Number(isFeatured(a, now)) || a.sortOrder - b.sortOrder);
  const discordItem = visible.find((item) => item.kind === "discord");
  const discord = discordItem ? await getDiscordStats(discordItem.url).catch(() => null) : null;

  return <main className="public-page">
    <section className="profile-card">
      <header className="profile-actions"><a className="round-button" href="https://ae2v.fr" aria-label="Site officiel"><Globe2 size={20} /></a><ShareDialog /></header>
      <div className="profile-logo" style={{ backgroundImage: `url(${settings.logoPath})` }} role="img" aria-label="Logo AE2V" />
      <h1>{settings.displayName}</h1>
      <p>Always further, together</p>
      <nav className="social-row" aria-label="Réseaux sociaux">
        {networks.map((network) => <a key={network.id} href={network.url} aria-label={network.network}><BrandIcon name={network.network} /></a>)}
      </nav>
      <div className="public-links">
        {visible.length ? visible.map((item) => <PublicLink key={item.id} item={item} featured={isFeatured(item, now)} discord={item.kind === "discord" ? discord : null} />) :
          <div className="empty-public"><strong>Les liens arrivent.</strong><span>Retrouve-nous déjà sur nos réseaux.</span></div>}
      </div>
      <footer className="public-footer"><a href="https://ae2v.fr">AE2V</a><span>Toujours plus loin, ensemble.</span></footer>
    </section>
  </main>;
}
