"use client";

import { useState } from "react";
import {
  ArrowDown, ArrowUp, BarChart3, ChevronDown, ExternalLink, FileDown,
  Link2, LogOut, Plus, QrCode, Save, Settings2, Trash2,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { BrandIcon, iconNames } from "@/components/brand-icon";
import type { ConditionRule, PageItem, QrCodeRecord, ShortLink, SiteSettings } from "@/lib/types";
import { logoutAction } from "./actions";
import { AdminAnalytics } from "@/components/admin-analytics";
import { AttachedQr, QrDownloads } from "@/components/admin-qr";
import { AdminConfig } from "@/components/admin-config";
import { ShortLinksManager } from "@/components/admin-short-links";
import { normalizeUrl } from "@/lib/urls";

type AdminData = {
  settings: SiteSettings;
  items: PageItem[];
  shortLinks: ShortLink[];
  qrCodes: QrCodeRecord[];
  totals: { clicks: number; week: number };
};

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://liens.ae2v.fr";
const localDate = (value: string | null) => value ? new Date(new Date(value).getTime() - new Date(value).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "";

async function send(payload: Record<string, unknown>) {
  const response = await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "Une erreur est survenue.");
  return data;
}

export function AdminDashboard({ initialData }: { initialData: AdminData }) {
  const [tab, setTab] = useState<"page" | "short" | "qr" | "config">("page");
  const [data, setData] = useState(initialData);
  const [notice, setNotice] = useState("");

  async function reload(message?: string) {
    const response = await fetch("/api/admin");
    if (!response.ok) throw new Error("Impossible de recharger les données.");
    setData(await response.json());
    if (message) { setNotice(message); window.setTimeout(() => setNotice(""), 2400); }
  }

  async function act(payload: Record<string, unknown>, message?: string) {
    try { const result = await send(payload); await reload(message); return result; }
    catch (error) { setNotice(error instanceof Error ? error.message : "Erreur"); throw error; }
  }

  return <main className="admin-shell">
    <aside className="admin-sidebar">
      <Link className="admin-brand" href="/"><Image src="/assets/logo-ae2v.svg" alt="AE2V" width={88} height={24} priority /><span>Liens</span></Link>
      <nav aria-label="Administration">
        <button className={tab === "page" ? "active" : ""} onClick={() => setTab("page")}><Settings2 />Page de liens</button>
        <button className={tab === "short" ? "active" : ""} onClick={() => setTab("short")}><Link2 />Liens courts</button>
        <button className={tab === "qr" ? "active" : ""} onClick={() => setTab("qr")}><QrCode />QR codes</button>
        <button className={tab === "config" ? "active" : ""} onClick={() => setTab("config")}><Settings2 />Configuration</button>
      </nav>
      <div className="admin-stats"><span><b>{data.totals.clicks}</b>clics au total</span><span><b>{data.totals.week}</b>ces 7 derniers jours</span></div>
      <form action={logoutAction}><button className="logout-button"><LogOut />Se déconnecter</button></form>
    </aside>
    <section className="admin-main">
      {notice && <div className="admin-notice" role="status">{notice}</div>}
      {tab === "page" && <PageTab data={data} act={act} />}
      {tab === "short" && <ShortLinksManager links={data.shortLinks} records={data.qrCodes} act={act} />}
      {tab === "qr" && <QrTab records={data.qrCodes} act={act} />}
      {tab === "config" && <AdminConfig settings={data.settings} act={act} />}
    </section>
  </main>;
}

function SectionHeader({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return <header className="admin-section-header"><div><h1>{title}</h1><p>{description}</p></div>{action}</header>;
}

function PageTab({ data, act }: { data: AdminData; act: (payload: Record<string, unknown>, message?: string) => Promise<unknown> }) {
  const [settings, setSettings] = useState(data.settings);
  async function saveSettings(event: React.FormEvent) {
    event.preventDefault();
    await act({ action: "settings", ...settings }, "Présentation enregistrée");
  }
  return <>
    <SectionHeader title="Page de liens" description="Ce que les étudiants voient sur liens.ae2v.fr." action={<a className="secondary-button" href="/" target="_blank">Voir la page<ExternalLink /></a>} />
    <form className="settings-strip" onSubmit={saveSettings}>
      <label>Nom affiché<input value={settings.displayName} onChange={(e) => setSettings({ ...settings, displayName: e.target.value })} /></label>
      <label>Courte description<input value={settings.bio} onChange={(e) => setSettings({ ...settings, bio: e.target.value })} /></label>
      <button className="primary-button"><Save />Enregistrer</button>
    </form>
    <div className="list-heading"><div><h2>Éléments</h2><span>{data.items.length} au total</span></div><button className="primary-button" onClick={() => act({ action: "createItem" }, "Lien ajouté")}><Plus />Ajouter</button></div>
    <div className="item-list">
      {data.items.map((item, index) => <ItemEditor key={item.id} item={item} records={data.qrCodes} first={index === 0} last={index === data.items.length - 1} act={act} />)}
    </div>
  </>;
}

function ItemEditor({ item: initial, records, first, last, act }: { records: QrCodeRecord[]; item: PageItem; first: boolean; last: boolean; act: (payload: Record<string, unknown>, message?: string) => Promise<unknown> }) {
  const [item, setItem] = useState(initial);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof PageItem>(key: K, value: PageItem[K]) => setItem({ ...item, [key]: value });
  const updateRule = (index: number, patch: Partial<ConditionRule>) => set("conditions", { ...item.conditions, rules: item.conditions.rules.map((r, i) => i === index ? { ...r, ...patch } : r) });

  return <article className={`item-editor${item.enabled ? "" : " muted"}`}>
    <div className="item-summary">
      <span className="item-icon"><BrandIcon name={item.icon} size={20} /></span>
      <button className="item-identity title-button" aria-expanded={open} onClick={() => setOpen(!open)}><strong>{item.title}</strong><span>{item.kind === "countdown" ? "Compte à rebours" : item.kind === "discord" ? "Discord" : item.url}</span></button>
      <div className="item-badges">{item.featured && <span className="badge red">Prioritaire</span>}<span className={`badge ${item.enabled ? "green" : ""}`}>{item.enabled ? "Visible" : "Masqué"}</span><button className="badge stat-button" onClick={() => setOpen(true)}><BarChart3 size={12} />{initial.clicks ?? 0} clics</button></div>
      <div className="item-actions"><button aria-label="QR code et statistiques" onClick={() => setOpen(true)}><QrCode /></button><button disabled={first} aria-label="Monter" onClick={() => act({ action: "moveItem", id: item.id, direction: "up" })}><ArrowUp /></button><button disabled={last} aria-label="Descendre" onClick={() => act({ action: "moveItem", id: item.id, direction: "down" })}><ArrowDown /></button><button aria-label="Modifier" aria-expanded={open} onClick={() => setOpen(!open)}><ChevronDown className={open ? "rotated" : ""} /></button></div>
    </div>
    {open && <form className="item-form" onSubmit={async (e) => { e.preventDefault(); setError(""); setSaving(true); try { const url = normalizeUrl(item.url); await act({ action: "updateItem", item: { ...item, url } }, "Élément enregistré"); setItem({ ...item, url }); } catch (error) { setError(error instanceof Error ? error.message : "Enregistrement impossible"); } finally { setSaving(false); } }}>
      <div className="form-grid three">
        <label>Type<select value={item.kind} onChange={(e) => set("kind", e.target.value as PageItem["kind"])}><option value="link">Lien</option><option value="discord">Discord</option><option value="countdown">Compte à rebours</option></select></label>
        <label>Titre<input value={item.title} required onChange={(e) => set("title", e.target.value)} /></label>
        <label>Icône<span className="icon-select"><BrandIcon name={item.icon} size={18} /><select value={item.icon} onChange={(e) => set("icon", e.target.value)}>{iconNames.map((name) => <option key={name}>{name}</option>)}</select></span></label>
      </div>
      <div className="form-grid two"><label>Sous-titre<input value={item.subtitle} onChange={(e) => set("subtitle", e.target.value)} /></label><label>Destination<input value={item.url} required onChange={(e) => set("url", e.target.value)} /></label></div>
      {item.kind === "countdown" && <label>Date de l’événement<input type="datetime-local" value={localDate(item.countdownAt)} onChange={(e) => set("countdownAt", e.target.value ? new Date(e.target.value).toISOString() : null)} /></label>}
      <div className="toggle-row">
        <label className="toggle-label"><input type="checkbox" checked={item.enabled} onChange={(e) => set("enabled", e.target.checked)} /><span />Visible</label>
        <label className="toggle-label"><input type="checkbox" checked={item.featured} onChange={(e) => set("featured", e.target.checked)} /><span />Mettre à la une</label>
      </div>
      {item.featured && <div className="form-grid two"><label>À la une à partir du<input type="datetime-local" value={localDate(item.featuredStartAt)} onChange={(e) => set("featuredStartAt", e.target.value ? new Date(e.target.value).toISOString() : null)} /></label><label>Jusqu’au<input type="datetime-local" value={localDate(item.featuredEndAt)} onChange={(e) => set("featuredEndAt", e.target.value ? new Date(e.target.value).toISOString() : null)} /></label></div>}
      <fieldset className="rules"><legend>Conditions d’affichage</legend><div className="rules-toolbar"><select aria-label="Combinaison des conditions" value={item.conditions.mode} onChange={(e) => set("conditions", { ...item.conditions, mode: e.target.value as "all" | "any" })}><option value="all">Toutes les conditions (ET)</option><option value="any">Au moins une (OU)</option></select><button type="button" onClick={() => set("conditions", { ...item.conditions, rules: [...item.conditions.rules, { field: "after", value: "" }] })}><Plus />Condition</button></div>
        {item.conditions.rules.map((rule, index) => { const isDate = rule.field === "after" || rule.field === "before"; return <div className="rule-row" key={index}><select value={rule.field} onChange={(e) => updateRule(index, { field: e.target.value as ConditionRule["field"], value: "" })}><option value="after">Après le</option><option value="before">Avant le</option><option value="year">Année égale à</option><option value="weekday">Jour(s) de semaine</option></select><input type={isDate ? "datetime-local" : rule.field === "year" ? "number" : "text"} placeholder={rule.field === "weekday" ? "0,1,2… (dimanche = 0)" : ""} value={isDate ? localDate(rule.value) : rule.value} onChange={(e) => updateRule(index, { value: isDate && e.target.value ? new Date(e.target.value).toISOString() : e.target.value })} /><button type="button" aria-label="Supprimer la condition" onClick={() => set("conditions", { ...item.conditions, rules: item.conditions.rules.filter((_, i) => i !== index) })}><Trash2 /></button></div>; })}
        {!item.conditions.rules.length && <p>Sans condition, cet élément suit uniquement le bouton « Visible ».</p>}
      </fieldset>
      {error && <p role="alert" className="form-error">{error}</p>}
      <div className="form-actions"><button type="button" className="danger-button" onClick={() => confirm("Supprimer cet élément ?") && act({ action: "deleteItem", id: item.id }, "Élément supprimé")}><Trash2 />Supprimer</button><button className="primary-button" disabled={saving}><Save />{saving ? "Enregistrement…" : "Enregistrer"}</button></div>
    </form>}
    {open && <div className="item-detail"><AttachedQr name={initial.title} target={`${siteUrl}/api/go/${initial.id}`} records={records} act={act} /><AdminAnalytics id={initial.id} kind="item" /></div>}
  </article>;
}

function QrTab({ records, act }: { records: QrCodeRecord[]; act: (payload: Record<string, unknown>, message?: string) => Promise<unknown> }) {
  const [name, setName] = useState(""); const [target, setTarget] = useState(""); const [shorten, setShorten] = useState(false);
  const [foreground, setForeground] = useState("#171717"); const [background, setBackground] = useState("#ffffff");
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function generate(event: React.FormEvent) {
    event.preventDefault();
    if (!shorten && target.length > 80 && !confirm("Ce lien est long : le QR sera plus dense et moins facile à scanner. Continuer sans lien court ?")) return;
    let finalTarget = normalizeUrl(target); let shortLinkId: string | null = null;
    if (shorten) {
      const result = await send({ action: "createShort", destination: target, title: name || "QR code", description: "Créé depuis le générateur de QR code" });
      finalTarget = `${siteUrl}/${result.shortLink.slug}`; shortLinkId = result.shortLink.id;
    }
    await act({ action: "createQr", name, targetUrl: finalTarget, shortLinkId, foreground, background }, "QR code enregistré");
    setPreview(finalTarget);
  }
  const qrQuery = preview ? `data=${encodeURIComponent(preview)}&dark=${encodeURIComponent(foreground)}&light=${encodeURIComponent(background)}` : "";
  return <>
    <SectionHeader title="QR codes" description="Génère des QR lisibles, aux couleurs de l’AE2V, avec le logo au centre." />
    <div className="qr-workspace">
      <form className="create-panel" onSubmit={async e => { setError(""); setBusy(true); try { await generate(e); } catch (error) { setError(error instanceof Error ? error.message : "Création impossible"); } finally { setBusy(false); } }}><div className="panel-title"><QrCode /><div><h2>Nouveau QR code</h2><p>Le lien court est conseillé pour un code plus simple.</p></div></div>
        <label>Nom interne<input required value={name} onChange={(e) => setName(e.target.value)} /></label><label>Lien de destination<input required placeholder="ae2v.fr" value={target} onChange={(e) => setTarget(e.target.value)} /></label>
        <label className="toggle-label"><input type="checkbox" checked={shorten} onChange={(e) => setShorten(e.target.checked)} /><span />Créer d’abord un lien court AE2V</label>
        <div className="color-row"><label>Couleur<input type="color" value={foreground} onChange={(e) => setForeground(e.target.value)} /></label><label>Fond<input type="color" value={background} onChange={(e) => setBackground(e.target.value)} /></label></div>
        {error && <p role="alert" className="form-error">{error}</p>}
        <button className="primary-button" disabled={busy}><QrCode />{busy ? "Génération…" : "Générer"}</button>
      </form>
      <div className="qr-preview">{preview ? <><Image unoptimized width={230} height={230} src={`/api/qr?${qrQuery}&format=svg`} alt="Aperçu du QR code" /><strong>{name}</strong><small>{preview}</small><div><a className="secondary-button" href={`/api/qr?${qrQuery}&format=svg`} download><FileDown />SVG</a><a className="primary-button" href={`/api/qr?${qrQuery}&format=png`} download><FileDown />PNG</a></div></> : <><QrCode /><strong>L’aperçu apparaîtra ici</strong><span>Le logo AE2V sera intégré au centre.</span></>}</div>
    </div>
    <div className="list-heading"><div><h2>Historique</h2><span>{records.length} QR codes</span></div></div>
    <div className="qr-history">{records.map((record) => <article key={record.id}><Image unoptimized width={60} height={60} src={`/api/qr?data=${encodeURIComponent(record.targetUrl)}&format=svg&dark=${encodeURIComponent(record.foreground)}&light=${encodeURIComponent(record.background)}`} alt="" /><div><strong>{record.name}</strong><small>{record.targetUrl}</small></div><QrDownloads record={record} /></article>)}</div>
  </>;
}
