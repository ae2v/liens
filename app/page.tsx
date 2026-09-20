import { Instagram, Facebook, Mail, Globe2 } from "lucide-react";
import { conditionsMatch, isFeatured } from "@/lib/conditions";
import { getPublicData } from "@/lib/db";
import { PublicLink } from "@/components/public-link";
import { ShareDialog } from "@/components/share-dialog";

export const dynamic = "force-dynamic";

async function discordOnline(invite: string | null, enabled: boolean) {
  if (!invite || !enabled) return null;
  const code = invite.split("/").filter(Boolean).pop();
  if (!code) return null;
  try {
    const response = await fetch(`https://discord.com/api/v10/invites/${code}?with_counts=true`, { next: { revalidate: 300 } });
    if (!response.ok) return null;
    const data = await response.json();
    return Number(data.approximate_presence_count ?? 0) || null;
  } catch { return null; }
}

export default async function Home() {
  const { settings, items } = await getPublicData();
  const visible = items.filter((item) => conditionsMatch(item.conditions));
  const online = await discordOnline(settings.discordInvite, settings.discordConnected);

  return <main className="public-page">
    <div className="brand-rail" aria-hidden="true"><i /><i /><i /><i /><i /></div>
    <section className="profile-card">
      <header className="profile-actions"><a className="round-button" href="https://ae2v.fr" aria-label="Site officiel"><Globe2 size={20} /></a><ShareDialog title={settings.displayName} /></header>
      <div className="profile-logo" style={{ backgroundImage: `url(${settings.logoPath})` }} role="img" aria-label="Logo AE2V" />
      <h1>{settings.displayName}</h1>
      <p>{settings.bio}</p>
      <nav className="social-row" aria-label="Réseaux sociaux">
        <a href="https://www.instagram.com/bde.velizy/" aria-label="Instagram"><Instagram /></a>
        <a href="https://www.facebook.com/Ae2velizy" aria-label="Facebook"><Facebook /></a>
        <a href="mailto:ae2v.asso@gmail.com" aria-label="E-mail"><Mail /></a>
      </nav>
      <div className="public-links">
        {visible.length ? visible.map((item) => <PublicLink key={item.id} item={item} featured={isFeatured(item)} discordCount={item.kind === "discord" ? online : null} />) :
          <div className="empty-public"><strong>Les liens arrivent.</strong><span>Retrouve-nous déjà sur nos réseaux.</span></div>}
      </div>
      <footer className="public-footer"><a href="https://ae2v.fr">AE2V</a><span>Toujours plus loin, ensemble.</span></footer>
    </section>
  </main>;
}
