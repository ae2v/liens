"use client";

import { useState } from "react";
import { SiDiscord } from "@icons-pack/react-simple-icons";
import type { SiteSettings } from "@/lib/types";
import type { DiscordStats } from "@/lib/discord";
import type { AdminAct } from "./admin-qr";

export function AdminConfig({ settings, act }: { settings: SiteSettings; act: AdminAct }) {
  const [invite, setInvite] = useState(settings.discordInvite ?? 'https://discord.gg/z85wnSmdnH');
  const [stats, setStats] = useState<DiscordStats | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function run(action: string) {
    setBusy(true); setError('');
    try {
      const result = await act({ action, invite }, action === 'discordConnect' ? 'Discord connecté' : action === 'discordDisconnect' ? 'Discord déconnecté' : 'Invitation vérifiée') as { stats?: DiscordStats };
      setStats(result.stats ?? null);
    } catch (error) { setError(error instanceof Error ? error.message : 'Connexion impossible'); }
    finally { setBusy(false); }
  }
  return <>
    <header className="admin-section-header"><div><h1>Configuration</h1><p>Connecte les services de l’AE2V.</p></div></header>
    <section className="integration-panel"><header><SiDiscord size={32} /><div><h2>Discord</h2><span className={`badge ${settings.discordConnected ? 'green' : ''}`}>{settings.discordConnected ? 'Connecté' : 'Déconnecté'}</span></div></header>
      <p>Le nombre de membres et de personnes en ligne apparaît sur les éléments Discord. Les compteurs sont actualisés chaque minute.</p>
      <form onSubmit={e => { e.preventDefault(); void run('discordConnect'); }}><label>Invitation du serveur<input value={invite} placeholder="discord.gg/…" required onChange={e => { setInvite(e.target.value); setStats(null); }} /></label><p className="stats-note">Utilise une invitation permanente. Aucun bot ni mot de passe Discord nécessaire.</p><div className="inline-actions"><button type="button" className="secondary-button" disabled={busy} onClick={() => run('discordTest')}>Tester l’invitation</button><button className="primary-button" disabled={busy}>{busy ? 'Vérification…' : settings.discordConnected ? 'Enregistrer la connexion' : 'Connecter Discord'}</button>{settings.discordConnected && <button type="button" className="danger-button" disabled={busy} onClick={() => run('discordDisconnect')}>Déconnecter</button>}</div></form>
      {error && <p className="form-error" role="alert">{error}</p>}
      {stats && <div className="discord-result"><h3>{stats.name}</h3><div className="metric-row"><div><span>Membres</span><strong>{stats.members.toLocaleString('fr-FR')}</strong></div><div><span>En ligne</span><strong>{stats.online.toLocaleString('fr-FR')}</strong></div></div><p className="stats-note">Estimations retournées par Discord · vérifiées à {new Date(stats.checkedAt).toLocaleTimeString('fr-FR')}</p></div>}
    </section>
  </>;
}
