"use client";

import { useEffect, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowUp, BarChart3, CheckCircle2, ExternalLink, Plus, Save, Trash2, XCircle } from "lucide-react";
import { BrandIcon, iconNames } from "./brand-icon";
import { AdminAnalytics } from "./admin-analytics";
import { AttachedQr } from "./admin-qr";
import type { AdminAction, AdminData } from "@/app/admin/admin-dashboard";
import type { DiscordStats } from "@/lib/discord";
import type { PageItem } from "@/lib/types";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://liens.ae2v.fr").replace(/\/$/, "");
const localDate = (value: string | null) => value ? new Date(new Date(value).getTime() - new Date(value).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "";
const shortDate = (value: string) => new Date(value).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });

export function PageItemsManager({ data, act }: { data: AdminData; act: AdminAction }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [settings, setSettings] = useState(data.settings);
  const item = data.items.find((entry) => entry.id === selected);
  if (item) return <PageItemDetail key={item.updatedAt} item={item} act={act} onBack={() => setSelected(null)} />;
  return <>
    <header className="admin-section-header"><div><h1>Page de liens</h1><p>Les accès utiles affichés sur liens.ae2v.fr.</p></div><a className="secondary-button" href="/" target="_blank">Voir la page<ExternalLink /></a></header>
    <form className="settings-strip" onSubmit={async (event) => { event.preventDefault(); await act({ action: "settings", ...settings }, "Présentation enregistrée"); }}><label>Nom affiché<input value={settings.displayName} onChange={(event) => setSettings({ ...settings, displayName: event.target.value })} /></label><label>Sous-titre<input value={settings.bio} onChange={(event) => setSettings({ ...settings, bio: event.target.value })} /></label><button className="primary-button"><Save />Enregistrer</button></form>
    <div className="list-heading"><div><h2>Éléments</h2><span>{data.items.length} au total</span></div><button className="primary-button" onClick={async () => { await act({ action: "createItem" }, "Élément ajouté"); }}><Plus />Ajouter</button></div>
    <div className="resource-list">{data.items.map((entry, index) => <article key={entry.id} className={!entry.enabled ? "muted" : ""}>
      <span className="resource-icon"><BrandIcon name={entry.icon} size={21} /></span>
      <button className="resource-copy" onClick={() => setSelected(entry.id)}><strong>{entry.title}</strong><span>{entry.kind === "discord" ? "Discord" : entry.kind === "countdown" ? "Compte à rebours" : entry.url}</span><small>{entry.clicks ?? 0} engagements · créé le {shortDate(entry.createdAt)}</small></button>
      <span className={`badge ${entry.enabled ? "green" : ""}`}>{entry.enabled ? "Visible" : "Masqué"}</span>
      <div className="resource-actions"><button disabled={index === 0} aria-label="Monter" onClick={() => act({ action: "moveItem", id: entry.id, direction: "up" })}><ArrowUp /></button><button disabled={index === data.items.length - 1} aria-label="Descendre" onClick={() => act({ action: "moveItem", id: entry.id, direction: "down" })}><ArrowDown /></button><button aria-label="Modifier et voir les statistiques" onClick={() => setSelected(entry.id)}><BarChart3 /></button></div>
    </article>)}</div>
  </>;
}

function PageItemDetail({ item: initial, act, onBack }: { item: PageItem; act: AdminAction; onBack: () => void }) {
  const [item, setItem] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [discord, setDiscord] = useState<{ loading: boolean; error: string; stats: DiscordStats | null }>({ loading: false, error: "", stats: null });
  const set = <K extends keyof PageItem>(key: K, value: PageItem[K]) => setItem((current) => ({ ...current, [key]: value }));
  useEffect(() => {
    if (item.kind !== "discord" || !item.url.trim()) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setDiscord({ loading: true, error: "", stats: null });
      try {
        const response = await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "discordTest", invite: item.url }), signal: controller.signal });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        setDiscord({ loading: false, error: "", stats: result.stats });
      } catch (error) { if (!controller.signal.aborted) setDiscord({ loading: false, error: error instanceof Error ? error.message : "Invitation invalide", stats: null }); }
    }, 500);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [item.kind, item.url]);
  return <>
    <button className="back-button" onClick={onBack}><ArrowLeft />Tous les éléments</button>
    <header className="admin-section-header"><div><h1>{item.title}</h1><p>Configuration, QR code et performances.</p></div><span className={`badge ${item.enabled ? "green" : ""}`}>{item.enabled ? "Visible" : "Masqué"}</span></header>
    <div className="detail-layout"><form className="detail-card edit-form" onSubmit={async (event) => { event.preventDefault(); setSaving(true); setError(""); try { await act({ action: "updateItem", item }, "Élément enregistré"); } catch (error) { setError(error instanceof Error ? error.message : "Enregistrement impossible"); } finally { setSaving(false); } }}>
      <h2>Contenu</h2><div className="form-grid three"><label>Type<select value={item.kind} onChange={(event) => set("kind", event.target.value as PageItem["kind"])}><option value="link">Lien</option><option value="discord">Discord</option><option value="countdown">Compte à rebours</option></select></label><label>Titre<input value={item.title} required onChange={(event) => set("title", event.target.value)} /></label><label>Icône<span className="icon-select"><BrandIcon name={item.icon} size={18} /><select value={item.icon} onChange={(event) => set("icon", event.target.value)}>{iconNames.map((name) => <option key={name}>{name}</option>)}</select></span></label></div>
      <label>Sous-titre<input value={item.subtitle} onChange={(event) => set("subtitle", event.target.value)} /></label><label>{item.kind === "discord" ? "Invitation Discord" : "Destination"}<input value={item.url} required placeholder={item.kind === "discord" ? "code, discord.gg/code ou lien complet" : "ae2v.fr"} onChange={(event) => set("url", event.target.value)} /></label>
      {item.kind === "discord" && <div className={`inline-validation ${discord.error ? "error" : discord.stats ? "success" : ""}`}>{discord.loading ? "Vérification…" : discord.stats ? <><CheckCircle2 />Invitation valide · {discord.stats.name} · {discord.stats.members.toLocaleString("fr-FR")} membres</> : discord.error ? <><XCircle />{discord.error}</> : "Saisis une invitation pour la vérifier."}</div>}
      {item.kind === "countdown" && <label>Date de l’événement<input type="datetime-local" value={localDate(item.countdownAt)} onChange={(event) => set("countdownAt", event.target.value ? new Date(event.target.value).toISOString() : null)} /></label>}
      <div className="form-grid two"><label>Publication (facultatif)<input type="datetime-local" value={localDate(item.publishAt)} onChange={(event) => set("publishAt", event.target.value ? new Date(event.target.value).toISOString() : null)} /></label><label>Expiration (facultatif)<input type="datetime-local" value={localDate(item.expiresAt)} onChange={(event) => set("expiresAt", event.target.value ? new Date(event.target.value).toISOString() : null)} /></label></div>
      <div className="toggle-row"><label className="toggle-label"><input type="checkbox" checked={item.enabled} onChange={(event) => set("enabled", event.target.checked)} /><span />Visible</label><label className="toggle-label"><input type="checkbox" checked={item.featured} onChange={(event) => set("featured", event.target.checked)} /><span />Mettre en avant</label></div>
      {error && <p className="form-error" role="alert">{error}</p>}<div className="form-actions"><button type="button" className="danger-button" onClick={() => confirm("Supprimer cet élément ?") && act({ action: "deleteItem", id: item.id }, "Élément supprimé").then(onBack)}><Trash2 />Supprimer</button><button className="primary-button" disabled={saving || (item.kind === "discord" && !discord.stats)}><Save />{saving ? "Enregistrement…" : "Enregistrer"}</button></div>
    </form><AttachedQr name={item.title} target={`${siteUrl}/api/go/${item.id}`} /></div>
    <AdminAnalytics id={item.id} kind="item" />
  </>;
}
