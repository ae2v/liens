"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ArrowLeft, BarChart3, FileDown, Plus, QrCode, Save, Search } from "lucide-react";
import type { AdminAction } from "@/app/admin/admin-dashboard";
import type { QrCodeRecord } from "@/lib/types";
import { normalizeUrl } from "@/lib/urls";
import { AdminAnalytics } from "./admin-analytics";
import { QrDownloads } from "./admin-qr";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://liens.ae2v.fr").replace(/\/$/, "");
const date = (value: string) => new Date(value).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });

export function QrCodesManager({ records, act }: { records: QrCodeRecord[]; act: AdminAction }) {
  const [selected, setSelected] = useState<string | "new" | null>(null);
  const [search, setSearch] = useState("");
  const record = records.find((entry) => entry.id === selected);
  if (selected === "new") return <QrEditor act={act} onBack={() => setSelected(null)} />;
  if (record) return <QrDetail key={record.updatedAt} record={record} act={act} onBack={() => setSelected(null)} />;
  const visible = records.filter((entry) => `${entry.name} ${entry.targetUrl}`.toLowerCase().includes(search.toLowerCase()));
  return <><header className="admin-section-header"><div><h1>Codes QR</h1><p>Codes vectoriels, redirections et statistiques de scan.</p></div><button className="primary-button" onClick={() => setSelected("new")}><Plus />Créer un code</button></header>
    <div className="links-toolbar"><label className="search-field"><Search /><input aria-label="Rechercher un QR code" placeholder="Rechercher parmi les codes" value={search} onChange={(event) => setSearch(event.target.value)} /></label></div>
    <div className="resource-list qr-resource-list">{visible.map((entry) => <article key={entry.id}><Image unoptimized width={86} height={86} src={`/api/qr?data=${encodeURIComponent(entry.trackingUrl)}&format=svg&dark=${encodeURIComponent(entry.foreground)}&light=${encodeURIComponent(entry.background)}`} alt="" /><button className="resource-copy" onClick={() => setSelected(entry.id)}><strong>{entry.name || "QR sans titre"}</strong><span>{entry.targetUrl}</span><small>{entry.scans} scans · créé le {date(entry.createdAt)} · modifié le {date(entry.updatedAt)}</small></button><div className="resource-actions"><QrDownloads record={entry} /><button aria-label="Détails et statistiques" onClick={() => setSelected(entry.id)}><BarChart3 /></button></div></article>)}</div>
  </>;
}

function QrEditor({ act, onBack }: { act: AdminAction; onBack: () => void }) {
  const [form, setForm] = useState({ name: "", targetUrl: "", foreground: "#171717", background: "#ffffff", shorten: false });
  const [density, setDensity] = useState<{ modules: number; compact: boolean } | null>(null);
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  useEffect(() => {
    if (!form.targetUrl.trim()) return;
    let url = ""; try { url = normalizeUrl(form.targetUrl); } catch { return; }
    const controller = new AbortController(); const timer = window.setTimeout(() => fetch(`/api/qr-info?data=${encodeURIComponent(url)}`, { signal: controller.signal }).then((response) => response.json()).then(setDensity).catch(() => {}), 350);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [form.targetUrl]);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      let targetUrl = normalizeUrl(form.targetUrl); let shortLinkId: string | null = null;
      if (form.shorten) {
        const result = await act({ action: "createShort", destination: targetUrl, title: form.name || "QR code", description: "" }) as { shortLink: { id: string; slug: string } };
        targetUrl = `${siteUrl}/${result.shortLink.slug}`; shortLinkId = result.shortLink.id;
      }
      await act({ action: "createQr", name: form.name, targetUrl, shortLinkId, foreground: form.foreground, background: form.background }, "QR code enregistré"); onBack();
    } catch (error) { setError(error instanceof Error ? error.message : "Création impossible"); } finally { setBusy(false); }
  }
  const preview = form.targetUrl ? (() => { try { return normalizeUrl(form.targetUrl); } catch { return ""; } })() : "";
  return <><button className="back-button" onClick={onBack}><ArrowLeft />Tous les QR codes</button><header className="admin-section-header"><div><h1>Créer un code QR</h1><p>La taille est calculée en modules entiers pour une impression nette.</p></div></header><div className="qr-workspace"><form className="detail-card edit-form" onSubmit={submit}><label>Nom interne (facultatif)<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label><label>Destination<input required placeholder="ae2v.fr" value={form.targetUrl} onChange={(event) => { setDensity(null); setForm({ ...form, targetUrl: event.target.value }); }} /></label>{density && <p className={`density-hint ${density.compact ? "success" : "warning"}`}>{density.modules} × {density.modules} modules · {density.compact ? "format standard compact" : "code dense : un lien court est conseillé"}</p>}{density && !density.compact && <label className="toggle-label"><input type="checkbox" checked={form.shorten} onChange={(event) => setForm({ ...form, shorten: event.target.checked })} /><span />Créer un lien court avant le QR code</label>}<div className="color-row"><label>Modules<input type="color" value={form.foreground} onChange={(event) => setForm({ ...form, foreground: event.target.value })} /></label><label>Fond<input type="color" value={form.background} onChange={(event) => setForm({ ...form, background: event.target.value })} /></label></div>{error && <p className="form-error">{error}</p>}<button className="primary-button" disabled={busy}><QrCode />{busy ? "Création…" : "Créer le QR code"}</button></form><div className="qr-preview">{preview ? <><Image unoptimized width={260} height={260} src={`/api/qr?data=${encodeURIComponent(preview)}&format=svg&dark=${encodeURIComponent(form.foreground)}&light=${encodeURIComponent(form.background)}`} alt="Aperçu du QR code" /><strong>{form.name || "Aperçu"}</strong><small>{preview}</small></> : <><QrCode /><strong>L’aperçu apparaîtra ici</strong></>}</div></div></>;
}

function QrDetail({ record, act, onBack }: { record: QrCodeRecord; act: AdminAction; onBack: () => void }) {
  const [form, setForm] = useState({ ...record, shorten: false });
  const [density, setDensity] = useState<{ modules: number; compact: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!form.targetUrl.trim()) return;
    let url = "";
    try { url = normalizeUrl(form.targetUrl); } catch { return; }
    const controller = new AbortController();
    const timer = window.setTimeout(() => fetch(`/api/qr-info?data=${encodeURIComponent(url)}`, { signal: controller.signal }).then((response) => response.json()).then(setDensity).catch(() => {}), 350);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [form.targetUrl]);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      let targetUrl = normalizeUrl(form.targetUrl);
      let shortLinkId = form.shortLinkId;
      if (form.shorten && !shortLinkId) {
        const result = await act({ action: "createShort", destination: targetUrl, title: form.name || "QR code", description: "" }) as { shortLink: { id: string; slug: string } };
        shortLinkId = result.shortLink.id;
        targetUrl = `${siteUrl}/${result.shortLink.slug}`;
      }
      await act({ action: "updateQr", id: record.id, name: form.name, targetUrl, shortLinkId, foreground: form.foreground, background: form.background }, "QR code enregistré");
    } catch (error) { setError(error instanceof Error ? error.message : "Enregistrement impossible"); }
    finally { setBusy(false); }
  }
  const displayName = record.name || "QR sans titre";
  return <><button className="back-button" onClick={onBack}><ArrowLeft />Tous les QR codes</button><header className="admin-section-header"><div><h1>{displayName}</h1><p>{record.scans} scans · créé le {date(record.createdAt)} · modifié le {date(record.updatedAt)}</p></div><QrDownloads record={{ ...record, ...form, trackingUrl: record.trackingUrl }} /></header><div className="detail-layout"><form className="detail-card edit-form" onSubmit={submit}><section className="form-section"><h2>Détails</h2><label>Nom interne (facultatif)<input value={form.name} placeholder="QR sans titre" onChange={(event) => setForm({ ...form, name: event.target.value })} /></label><label>Destination<input required value={form.targetUrl} placeholder="ae2v.fr" onChange={(event) => { setDensity(null); setForm({ ...form, targetUrl: event.target.value }); }} /></label>{density && <p className={`density-hint ${density.compact ? "success" : "warning"}`}>{density.modules} × {density.modules} modules pour la destination · {density.compact ? "format compact" : "un lien court est recommandé"}</p>}</section><section className="form-section"><h2>Redirection et suivi</h2><label>Adresse contenue dans le QR<input readOnly value={record.trackingUrl} /></label>{record.shortLinkId ? <p className="inline-validation success">La destination passe déjà par un lien court AE2V.</p> : <label className="toggle-label"><input type="checkbox" checked={form.shorten} onChange={(event) => setForm({ ...form, shorten: event.target.checked })} /><span />Créer un lien court AE2V pour cette destination</label>}</section><section className="form-section"><h2>Apparence</h2><div className="color-row"><label>Modules<input type="color" value={form.foreground} onChange={(event) => setForm({ ...form, foreground: event.target.value })} /></label><label>Fond<input type="color" value={form.background} onChange={(event) => setForm({ ...form, background: event.target.value })} /></label></div></section>{error && <p className="form-error" role="alert">{error}</p>}<button className="primary-button" disabled={busy}><Save />{busy ? "Enregistrement…" : "Enregistrer"}</button></form><section className="attached-qr"><Image unoptimized width={240} height={240} src={`/api/qr?data=${encodeURIComponent(record.trackingUrl)}&format=svg&dark=${encodeURIComponent(form.foreground)}&light=${encodeURIComponent(form.background)}`} alt={`QR code ${displayName}`} /><div className="inline-actions"><a className="secondary-button" href={`/api/qr?data=${encodeURIComponent(record.trackingUrl)}&format=svg&dark=${encodeURIComponent(form.foreground)}&light=${encodeURIComponent(form.background)}`} download><FileDown />SVG</a><a className="secondary-button" href={`/api/qr?data=${encodeURIComponent(record.trackingUrl)}&format=png&dark=${encodeURIComponent(form.foreground)}&light=${encodeURIComponent(form.background)}`} download><FileDown />PNG</a></div></section></div><AdminAnalytics id={record.id} kind="qr" /></>;
}
