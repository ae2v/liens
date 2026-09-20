"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, BarChart3, Copy, ExternalLink, Link2, Plus, QrCode, Save, Search, Trash2 } from "lucide-react";
import type { QrCodeRecord, ShortLink } from "@/lib/types";
import { AttachedQr, type AdminAct } from "./admin-qr";
import { AdminAnalytics } from "./admin-analytics";
import { normalizeUrl } from "@/lib/urls";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://liens.ae2v.fr').replace(/\/$/, '');
const localDate = (value: string | null) => value ? new Date(new Date(value).getTime() - new Date(value).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '';
const date = (value: string) => new Date(value).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
const blank = { destination: '', slug: '', title: '', description: '', imageUrl: '', expiresAt: '', expiryMessage: 'Ce lien a expiré.', enabled: true };

export function ShortLinksManager({ links, records, act }: { links: ShortLink[]; records: QrCodeRecord[]; act: AdminAct }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('created');
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 60000); return () => clearInterval(timer); }, []);
  const link = links.find(link => link.id === selected);
  if (creating) return <><button className="back-button" onClick={() => setCreating(false)}><ArrowLeft />Tous les liens</button><header className="admin-section-header"><h1>Créer un lien</h1></header><ShortForm act={act} onSaved={() => setCreating(false)} /></>;
  if (link) return <><button className="back-button" onClick={() => setSelected(null)}><ArrowLeft />Tous les liens</button><header className="admin-section-header"><div><h1>{link.title}</h1><a href={`${siteUrl}/${link.slug}`} target="_blank" rel="noreferrer">{siteUrl}/{link.slug} <ExternalLink size={14} /></a></div><CopyLink url={`${siteUrl}/${link.slug}`} /></header><div className="link-detail-grid"><ShortForm key={link.updatedAt} link={link} records={records} act={act} onSaved={() => {}} /><AttachedQr name={link.title} target={`${siteUrl}/${link.slug}`} shortLinkId={link.id} records={records} act={act} /></div><AdminAnalytics kind="short" id={link.id} /></>;
  const expired = (link: ShortLink) => Boolean(link.expiresAt && new Date(link.expiresAt).getTime() <= now);
  const visible = links.filter(link => `${link.title} ${link.slug} ${link.destination}`.toLowerCase().includes(search.toLowerCase()) &&
    (filter === 'all' || (filter === 'active' ? link.enabled && !expired(link) : filter === 'expired' ? expired(link) : !link.enabled)))
    .sort((a, b) => sort === 'clicks' ? b.clicks - a.clicks : sort === 'updated' ? b.updatedAt.localeCompare(a.updatedAt) : b.createdAt.localeCompare(a.createdAt));
  return <>
    <header className="admin-section-header"><div><h1>Liens courts</h1><p>{links.length} adresses à partager.</p></div><button className="primary-button" onClick={() => setCreating(true)}><Plus />Créer un lien</button></header>
    <div className="links-toolbar"><label className="search-field"><Search size={18} /><input aria-label="Rechercher un lien" placeholder="Rechercher parmi les liens" value={search} onChange={e => setSearch(e.target.value)} /></label><select aria-label="Filtrer les liens" value={filter} onChange={e => setFilter(e.target.value)}><option value="all">Tous les liens</option><option value="active">Actifs</option><option value="expired">Expirés</option><option value="disabled">Désactivés</option></select><select aria-label="Trier les liens" value={sort} onChange={e => setSort(e.target.value)}><option value="created">Création récente</option><option value="updated">Modification récente</option><option value="clicks">Les plus cliqués</option></select></div>
    <div className="managed-links">{visible.map(link => <article key={link.id}>
      <div className="managed-link-heading"><Link2 size={22} /><button className="title-button" onClick={() => setSelected(link.id)}>{link.title}</button><span className={`badge ${!link.enabled || expired(link) ? '' : 'green'}`}>{!link.enabled ? 'Désactivé' : expired(link) ? 'Expiré' : 'Actif'}</span></div>
      <div className="inline-actions"><a className="short-url" href={`${siteUrl}/${link.slug}`} target="_blank" rel="noreferrer">{siteUrl.replace(/^https?:\/\//, '')}/{link.slug}</a><CopyLink url={`${siteUrl}/${link.slug}`} /></div>
      <a className="destination-link" href={link.destination} target="_blank" rel="noreferrer">↳ {link.destination}</a>
      <div className="managed-link-footer"><span><BarChart3 size={16} />{link.clicks} clics</span><span>Créé le {date(link.createdAt)}</span><span>Modifié le {date(link.updatedAt)}</span><div className="inline-actions"><button className="secondary-button" onClick={() => setSelected(link.id)}>Modifier / stats</button><button className="secondary-button" onClick={() => setSelected(link.id)}><QrCode />{records.some(qr => qr.shortLinkId === link.id) ? 'Voir le QR code' : 'Ajouter un QR code'}</button></div></div>
    </article>)}</div>
    {!visible.length && <p className="empty-stats">{links.length ? 'Aucun lien ne correspond à cette recherche.' : 'Crée ton premier lien court.'}</p>}
  </>;
}

function CopyLink({ url }: { url: string }) {
  const [status, setStatus] = useState('Copier');
  return <button className="copy-button" aria-label={status === 'Copier' ? `Copier ${url}` : status} onClick={async () => { try { await navigator.clipboard.writeText(url); setStatus('Copié'); } catch { setStatus('Copie impossible'); } window.setTimeout(() => setStatus('Copier'), 2000); }}><Copy size={15} /><span>{status}</span></button>;
}

function ShortForm({ link, records = [], act, onSaved }: { link?: ShortLink; records?: QrCodeRecord[]; act: AdminAct; onSaved: () => void }) {
  const [form, setForm] = useState(link ? { ...link, imageUrl: link.imageUrl ?? '', expiresAt: localDate(link.expiresAt) } : blank);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const lockedSlug = Boolean(link && records.some(qr => qr.shortLinkId === link.id));
  return <form className="create-panel" onSubmit={async e => {
    e.preventDefault(); setBusy(true); setError('');
    try {
      if (link && form.slug !== link.slug && !confirm('Changer le slug rendra les anciennes adresses inaccessibles. Continuer ?')) return;
      await act({ ...form, action: link ? 'updateShort' : 'createShort', id: link?.id, destination: normalizeUrl(form.destination), expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null }, link ? 'Lien enregistré' : 'Lien créé');
      onSaved();
    } catch (error) { setError(error instanceof Error ? error.message : 'Enregistrement impossible'); }
    finally { setBusy(false); }
  }}>
    <h2>{link ? 'Détails du lien' : 'Nouveau lien'}</h2>
    <label>Destination<input required placeholder="ae2v.fr" value={form.destination} onChange={e => setForm({ ...form, destination: e.target.value })} /></label>
    <label>Adresse courte<span className="slug-input"><b>liens.ae2v.fr/</b><input disabled={lockedSlug} pattern="[A-Za-z0-9_-]{2,48}" placeholder="4 caractères aléatoires" value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} /></span></label>
    {lockedSlug && <p className="stats-note">Le slug est conservé pour que tes QR codes déjà partagés continuent à fonctionner. La destination reste modifiable.</p>}
    <label>Titre de l’aperçu social<input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></label>
    <label>Description<input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></label>
    <label>Image d’aperçu (facultatif)<input placeholder="exemple.fr/image.jpg" value={form.imageUrl} onChange={e => setForm({ ...form, imageUrl: e.target.value })} /></label>
    <div className="form-grid two"><label>Expiration (facultatif)<input type="datetime-local" value={form.expiresAt} onChange={e => setForm({ ...form, expiresAt: e.target.value })} /></label><label>Message à expiration<input value={form.expiryMessage} onChange={e => setForm({ ...form, expiryMessage: e.target.value })} /></label></div>
    {link && <label className="toggle-label"><input type="checkbox" checked={form.enabled} onChange={e => setForm({ ...form, enabled: e.target.checked })} /><span />Lien actif</label>}
    {error && <p role="alert" className="form-error">{error}</p>}
    <div className="form-actions">{link && <button type="button" className="danger-button" disabled={busy} onClick={async () => { if (!confirm('Supprimer ce lien et ses statistiques ?')) return; try { await act({ action: 'deleteShort', id: link.id }, 'Lien supprimé'); onSaved(); } catch {} }}><Trash2 />Supprimer</button>}<button className="primary-button" disabled={busy}><Save />{busy ? 'Enregistrement…' : link ? 'Enregistrer' : 'Créer le lien'}</button></div>
  </form>;
}
