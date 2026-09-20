import { Instagram, Facebook, Mail, Globe2 } from "lucide-react";
import { conditionsMatch, isFeatured } from "@/lib/conditions";
import { getPublicData } from "@/lib/db";
import { PublicLink } from "@/components/public-link";
import { ShareDialog } from "@/components/share-dialog";
import { SiX } from "@icons-pack/react-simple-icons";
import { getDiscordStats } from "@/lib/discord";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { settings, items } = await getPublicData();
  const now = new Date();
  const visible = items.filter((item) => conditionsMatch(item.conditions, now)).sort((a, b) => Number(isFeatured(b, now)) - Number(isFeatured(a, now)) || a.sortOrder - b.sortOrder);
  const discord = settings.discordConnected && settings.discordInvite ? await getDiscordStats(settings.discordInvite).catch(() => null) : null;

  return <main className="public-page">
    <section className="profile-card">
      <header className="profile-actions"><a className="round-button" href="https://ae2v.fr" aria-label="Site officiel"><Globe2 size={20} /></a><ShareDialog title={settings.displayName} /></header>
      <div className="profile-logo" style={{ backgroundImage: `url(${settings.logoPath})` }} role="img" aria-label="Logo AE2V" />
      <h1>{settings.displayName}</h1>
      <p>{settings.bio}</p>
      <nav className="social-row" aria-label="Réseaux sociaux">
        <a href="https://www.instagram.com/bde.velizy/" aria-label="Instagram"><Instagram /></a>
        <a href="https://www.facebook.com/Ae2velizy" aria-label="Facebook"><Facebook /></a>
        <a href="https://x.com/AE2V_BDE" aria-label="X"><SiX /></a>
        <a href="mailto:ae2v.asso@gmail.com" aria-label="E-mail"><Mail /></a>
      </nav>
      <div className="public-links">
        {visible.length ? visible.map((item) => <PublicLink key={item.id} item={item} featured={isFeatured(item, now)} discord={item.kind === "discord" ? discord : null} />) :
          <div className="empty-public"><strong>Les liens arrivent.</strong><span>Retrouve-nous déjà sur nos réseaux.</span></div>}
      </div>
      <footer className="public-footer"><a href="https://ae2v.fr">AE2V</a><span>Toujours plus loin, ensemble.</span></footer>
    </section>
  </main>;
}
