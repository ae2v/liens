"use client";

import { useState } from "react";
import Image from "next/image";
import { ArrowLeft, BarChart3, Plus, QrCode, Save, Search, Trash2 } from "lucide-react";
import type { AdminAction } from "@/app/admin/admin-dashboard";
import type { QrCodeRecord } from "@/lib/types";
import { normalizeUrl } from "@/lib/urls";
import { AdminAnalytics } from "./admin-analytics";
import { QrDownloads } from "./admin-qr";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://liens.ae2v.fr").replace(/\/$/, "");
const date = (value: string) => new Date(value).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });

function normalized(value: string) {
  try { return normalizeUrl(value); } catch { return ""; }
}

function AppearanceFields({ foreground, background, onForeground, onBackground }: {
  foreground: string;
  background: string;
  onForeground: (value: string) => void;
  onBackground: (value: string) => void;
}) {
  const transparent = background === "transparent";
  return <><div className="color-row"><label>Modules<input type="color" value={foreground} onChange={(event) => onForeground(event.target.value)} /></label><label>Fond<input type="color" disabled={transparent} value={transparent ? "#ffffff" : background} onChange={(event) => onBackground(event.target.value)} /></label></div><label className="toggle-label"><input type="checkbox" checked={transparent} onChange={(event) => onBackground(event.target.checked ? "transparent" : "#ffffff")} /><span />Fond transparent</label></>;
}

export function QrCodesManager({ records, act, selected, onSelect, onBack }: { records: QrCodeRecord[]; act: AdminAction; selected: string | null; onSelect: (id: string | null) => void; onBack: () => void }) {
  const [search, setSearch] = useState("");
  const standalone = records.filter((entry) => !entry.shortLinkId);
  const record = standalone.find((entry) => entry.id === selected);
  if (selected === "new") return <QrEditor act={act} onBack={onBack} />;
  if (record) return <QrDetail key={record.updatedAt} record={record} act={act} onBack={onBack} />;
  const visible = standalone.filter((entry) => `${entry.name} ${entry.targetUrl}`.toLowerCase().includes(search.toLowerCase()));
  return <><header className="admin-section-header"><div><h1>Codes QR</h1><p>QR codes autonomes pour des destinations directes ou suivies.</p></div><button className="primary-button" onClick={() => onSelect("new")}><Plus />Créer un code</button></header>
    <div className="links-toolbar"><label className="search-field"><Search /><input aria-label="Rechercher un QR code" placeholder="Rechercher parmi les codes" value={search} onChange={(event) => setSearch(event.target.value)} /></label></div>
    <div className="resource-list qr-resource-list">{visible.map((entry) => <article key={entry.id}><Image unoptimized width={86} height={86} src={`/api/qr?data=${encodeURIComponent(entry.trackingUrl)}&format=svg&dark=${encodeURIComponent(entry.foreground)}&light=${encodeURIComponent(entry.background)}`} alt="" /><button className="resource-copy" onClick={() => onSelect(entry.id)}><strong>{entry.name || "QR sans titre"}</strong><span>{entry.targetUrl}</span><small>{entry.trackingEnabled ? `${entry.scans} scans · ` : ""}créé le {date(entry.createdAt)} · modifié le {date(entry.updatedAt)}</small></button><div className="resource-actions"><QrDownloads data={entry.trackingUrl} foreground={entry.foreground} background={entry.background} />{entry.trackingEnabled && <button aria-label="Détails et statistiques" onClick={() => onSelect(entry.id)}><BarChart3 /></button>}</div></article>)}</div>
  </>;
}

function QrEditor({ act, onBack }: { act: AdminAction; onBack: () => void }) {
  const [form, setForm] = useState({ name: "", targetUrl: "", foreground: "#171717", background: "#ffffff", trackingEnabled: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const targetUrl = normalizeUrl(form.targetUrl);
      await act({ action: "createQr", name: form.name, targetUrl, shortLinkId: null, foreground: form.foreground, background: form.background, trackingEnabled: form.trackingEnabled }, "QR code enregistré");
      onBack();
    } catch (error) { setError(error instanceof Error ? error.message : "Création impossible"); } finally { setBusy(false); }
  }
  const destination = normalized(form.targetUrl);
  const previewData = form.trackingEnabled ? `${siteUrl}/q/xxxx` : destination;
  return <><button className="back-button" onClick={onBack}><ArrowLeft />Tous les QR codes</button><header className="admin-section-header"><div><h1>Créer un code QR</h1></div></header><div className="qr-workspace"><form className="detail-card edit-form" onSubmit={submit}><section className="form-section"><h2>Détails</h2><label>Nom interne (facultatif)<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label><label>Destination<input required placeholder="ae2v.fr" value={form.targetUrl} onChange={(event) => setForm({ ...form, targetUrl: event.target.value })} /></label></section><section className="form-section"><h2>Redirection et suivi</h2><label className="toggle-label"><input type="checkbox" checked={form.trackingEnabled} onChange={(event) => setForm({ ...form, trackingEnabled: event.target.checked })} /><span />Activer la redirection et le suivi des scans</label></section><section className="form-section"><h2>Apparence</h2><AppearanceFields foreground={form.foreground} background={form.background} onForeground={(foreground) => setForm({ ...form, foreground })} onBackground={(background) => setForm({ ...form, background })} /></section>{error && <p className="form-error">{error}</p>}<button className="primary-button" disabled={busy}><QrCode />{busy ? "Création…" : "Créer le QR code"}</button></form><div className="qr-preview">{previewData ? <><Image unoptimized width={260} height={260} src={`/api/qr?data=${encodeURIComponent(previewData)}&format=svg&dark=${encodeURIComponent(form.foreground)}&light=${encodeURIComponent(form.background)}`} alt="Aperçu du QR code" /><strong>{form.name || "Aperçu"}</strong><small>{destination}</small></> : <><QrCode /><strong>L’aperçu apparaîtra ici</strong></>}</div></div></>;
}

function QrDetail({ record, act, onBack }: { record: QrCodeRecord; act: AdminAction; onBack: () => void }) {
  const [form, setForm] = useState({ ...record });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      await act({ action: "updateQr", id: record.id, name: form.name, targetUrl: normalizeUrl(form.targetUrl), shortLinkId: null, foreground: form.foreground, background: form.background, trackingEnabled: form.trackingEnabled }, "QR code enregistré");
    } catch (error) { setError(error instanceof Error ? error.message : "Enregistrement impossible"); }
    finally { setBusy(false); }
  }
  const displayName = record.name || "QR sans titre";
  const destination = normalized(form.targetUrl);
  const previewData = form.trackingEnabled ? (record.trackingEnabled ? record.trackingUrl : `${siteUrl}/q/xxxx`) : destination;
  return <><button className="back-button" onClick={onBack}><ArrowLeft />Tous les QR codes</button><header className="admin-section-header"><div><h1>{displayName}</h1><p>{record.trackingEnabled ? `${record.scans} scans · ` : ""}créé le {date(record.createdAt)} · modifié le {date(record.updatedAt)}</p></div><QrDownloads data={record.trackingUrl} foreground={form.foreground} background={form.background} /></header><div className="detail-layout"><form className="detail-card edit-form" onSubmit={submit}><section className="form-section"><h2>Détails</h2><label>Nom interne (facultatif)<input value={form.name} placeholder="QR sans titre" onChange={(event) => setForm({ ...form, name: event.target.value })} /></label><label>Destination<input required value={form.targetUrl} placeholder="ae2v.fr" onChange={(event) => setForm({ ...form, targetUrl: event.target.value })} /></label></section><section className="form-section"><h2>Redirection et suivi</h2><label className="toggle-label"><input type="checkbox" checked={form.trackingEnabled} onChange={(event) => setForm({ ...form, trackingEnabled: event.target.checked })} /><span />Activer la redirection et le suivi des scans</label></section><section className="form-section"><h2>Apparence</h2><AppearanceFields foreground={form.foreground} background={form.background} onForeground={(foreground) => setForm({ ...form, foreground })} onBackground={(background) => setForm({ ...form, background })} /></section>{error && <p className="form-error" role="alert">{error}</p>}<div className="form-actions"><button type="button" className="danger-button" disabled={busy} onClick={async () => { if (!confirm("Supprimer ce QR code et ses données de scan ?")) return; setBusy(true); setError(""); try { await act({ action: "deleteQr", id: record.id }, "QR code supprimé"); onBack(); } catch (error) { setError(error instanceof Error ? error.message : "Suppression impossible"); setBusy(false); } }}><Trash2 />Supprimer</button><button className="primary-button" disabled={busy}><Save />{busy ? "Enregistrement…" : "Enregistrer"}</button></div></form><section className="attached-qr"><Image unoptimized width={240} height={240} src={`/api/qr?data=${encodeURIComponent(previewData || record.trackingUrl)}&format=svg&dark=${encodeURIComponent(form.foreground)}&light=${encodeURIComponent(form.background)}`} alt={`QR code ${displayName}`} /><QrDownloads data={previewData || record.trackingUrl} foreground={form.foreground} background={form.background} /></section></div>{record.trackingEnabled ? <AdminAnalytics id={record.id} kind="qr" /> : <section className="detail-card"><p className="stats-note">Active « Redirection et suivi » pour voir les données de scan.</p></section>}</>;
}
