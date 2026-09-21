"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ArrowLeft, BarChart3, Plus, QrCode, Save, Search, Trash2 } from "lucide-react";
import type { AdminAction } from "@/app/admin/admin-dashboard";
import type { QrCodeRecord } from "@/lib/types";
import { normalizeUrl } from "@/lib/urls";
import { AdminAnalytics } from "./admin-analytics";
import { AttachedQr, QrDownloads } from "./admin-qr";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://liens.ae2v.fr").replace(/\/$/, "");
const date = (value: string) => new Date(value).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });

type QrSizing = {
  version: number;
  modules: number;
  errorCorrection: "Q" | "H";
  logoAllowed: boolean;
};

type QrInfo = {
  direct: QrSizing;
  compact: QrSizing;
  compactHelps: boolean;
};

function normalized(value: string) {
  try { return normalizeUrl(value); } catch { return ""; }
}

function useQrInfo(value: string) {
  const [info, setInfo] = useState<QrInfo | null>(null);
  useEffect(() => {
    if (!value) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      fetch(`/api/qr-info?data=${encodeURIComponent(value)}`, { signal: controller.signal })
        .then((response) => response.ok ? response.json() : Promise.reject())
        .then((result: QrInfo) => setInfo(result))
        .catch(() => { if (!controller.signal.aborted) setInfo(null); });
    }, 450);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [value]);
  return info;
}

function destinationNotice(info: QrInfo | null, trackingEnabled: boolean) {
  if (!info || info.direct.version < 7) return "";
  if (!trackingEnabled && info.compact.logoAllowed) return "Cette destination produit un QR V7 ou supérieur. Active « QR compact et suivi » pour pouvoir utiliser le logo.";
  if (trackingEnabled && info.compact.logoAllowed) return "La destination directe serait en V7 ou supérieur ; le mode compact permet de conserver le logo.";
  return "Cette destination reste en V7 ou supérieur : le logo est désactivé pour protéger les motifs structurels du QR.";
}

function qrUrl(data: string, foreground: string, background: string, logoEnabled: boolean, logoColor: string) {
  const query = new URLSearchParams({
    data,
    format: "svg",
    dark: foreground,
    light: background,
    logo: logoEnabled ? "1" : "0",
    logoColor,
  });
  return `/api/qr?${query}`;
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
    <div className="resource-list qr-resource-list">{visible.map((entry) => <article key={entry.id}><Image unoptimized width={86} height={86} src={qrUrl(entry.trackingUrl, entry.foreground, entry.background, entry.logoEnabled, entry.logoColor)} alt="" /><button className="resource-copy" onClick={() => onSelect(entry.id)}><strong>{entry.name || "QR sans titre"}</strong><span>{entry.targetUrl}</span><small>{entry.trackingEnabled ? `${entry.scans} scans · ` : ""}créé le {date(entry.createdAt)} · modifié le {date(entry.updatedAt)}</small></button><div className="resource-actions"><QrDownloads data={entry.trackingUrl} foreground={entry.foreground} background={entry.background} logoEnabled={entry.logoEnabled} logoColor={entry.logoColor} />{entry.trackingEnabled && <button aria-label="Détails et statistiques" onClick={() => onSelect(entry.id)}><BarChart3 /></button>}</div></article>)}</div>
  </>;
}

function QrEditor({ act, onBack }: { act: AdminAction; onBack: () => void }) {
  const [form, setForm] = useState({ name: "", targetUrl: "", foreground: "#171717", background: "#ffffff", trackingEnabled: false, logoEnabled: true, logoColor: "#d60106" });
  const [trackingTouched, setTrackingTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const destination = normalized(form.targetUrl);
  const info = useQrInfo(destination);

  useEffect(() => {
    if (!info || trackingTouched) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm((current) => current.trackingEnabled === info.compactHelps ? current : { ...current, trackingEnabled: info.compactHelps });
  }, [info, trackingTouched]);

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const targetUrl = normalizeUrl(form.targetUrl);
      await act({ action: "createQr", name: form.name, targetUrl, shortLinkId: null, foreground: form.foreground, background: form.background, trackingEnabled: form.trackingEnabled, logoEnabled: form.logoEnabled, logoColor: form.logoColor }, "QR code enregistré");
      onBack();
    } catch (error) { setError(error instanceof Error ? error.message : "Création impossible"); } finally { setBusy(false); }
  }

  const sizing = form.trackingEnabled ? info?.compact : info?.direct;
  const logoAllowed = sizing?.logoAllowed ?? true;
  const effectiveLogo = form.logoEnabled && logoAllowed;
  const previewData = form.trackingEnabled ? `${siteUrl}/q/xxxx` : destination;
  const notice = destinationNotice(info, form.trackingEnabled);

  return <><button className="back-button" onClick={onBack}><ArrowLeft />Tous les QR codes</button><header className="admin-section-header"><div><h1>Créer un code QR</h1></div></header><div className="qr-workspace"><form className="detail-card edit-form" onSubmit={submit}><section className="form-section"><h2>Détails</h2><label>Nom interne (facultatif)<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label><label>Destination<input required placeholder="ae2v.fr" value={form.targetUrl} onChange={(event) => setForm({ ...form, targetUrl: event.target.value })} /></label>{notice && <p className="stats-note">{notice}</p>}</section><section className="form-section"><h2>QR compact et suivi</h2><label className="toggle-label"><input type="checkbox" checked={form.trackingEnabled} onChange={(event) => { setTrackingTouched(true); setForm({ ...form, trackingEnabled: event.target.checked }); }} /><span />Utiliser une adresse courte et suivre les scans</label><p className="stats-note">Utilise une adresse courte /q/xxxx et active les statistiques de scan. Désactivé, le QR contient directement la destination.</p></section>{error && <p className="form-error">{error}</p>}<button className="primary-button" disabled={busy}><QrCode />{busy ? "Création…" : "Créer le QR code"}</button></form><AttachedQr name={form.name || "Aperçu"} target={previewData} sourceTarget={destination} appearance={{ foreground: form.foreground, background: form.background, logoEnabled: effectiveLogo, logoColor: form.logoColor }} onAppearanceChange={(appearance) => setForm({ ...form, foreground: appearance.foreground, background: appearance.background, logoEnabled: appearance.logoEnabled, logoColor: appearance.logoColor })} /></div></>;
}

function QrDetail({ record, act, onBack }: { record: QrCodeRecord; act: AdminAction; onBack: () => void }) {
  const [form, setForm] = useState({ ...record });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const destination = normalized(form.targetUrl);
  const info = useQrInfo(destination);

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      await act({ action: "updateQr", id: record.id, name: form.name, targetUrl: normalizeUrl(form.targetUrl), shortLinkId: null, foreground: form.foreground, background: form.background, trackingEnabled: form.trackingEnabled, logoEnabled: form.logoEnabled, logoColor: form.logoColor }, "QR code enregistré");
    } catch (error) { setError(error instanceof Error ? error.message : "Enregistrement impossible"); }
    finally { setBusy(false); }
  }

  const displayName = record.name || "QR sans titre";
  const sizing = form.trackingEnabled ? info?.compact : info?.direct;
  const logoAllowed = sizing?.logoAllowed ?? true;
  const effectiveLogo = form.logoEnabled && logoAllowed;
  const previewData = form.trackingEnabled ? (record.trackingEnabled ? record.trackingUrl : `${siteUrl}/q/xxxx`) : destination;
  const notice = destinationNotice(info, form.trackingEnabled);

  return <><button className="back-button" onClick={onBack}><ArrowLeft />Tous les QR codes</button><header className="admin-section-header"><div><h1>{displayName}</h1><p>{record.trackingEnabled ? `${record.scans} scans · ` : ""}créé le {date(record.createdAt)} · modifié le {date(record.updatedAt)}</p></div></header><div className="detail-layout"><form className="detail-card edit-form" onSubmit={submit}><section className="form-section"><h2>Détails</h2><label>Nom interne (facultatif)<input value={form.name} placeholder="QR sans titre" onChange={(event) => setForm({ ...form, name: event.target.value })} /></label><label>Destination<input required value={form.targetUrl} placeholder="ae2v.fr" onChange={(event) => setForm({ ...form, targetUrl: event.target.value })} /></label>{notice && <p className="stats-note">{notice}</p>}</section><section className="form-section"><h2>QR compact et suivi</h2><label className="toggle-label"><input type="checkbox" checked={form.trackingEnabled} onChange={(event) => setForm({ ...form, trackingEnabled: event.target.checked })} /><span />Utiliser une adresse courte et suivre les scans</label></section>{error && <p className="form-error" role="alert">{error}</p>}<div className="form-actions"><button type="button" className="danger-button" disabled={busy} onClick={async () => { if (!confirm("Supprimer ce QR code et ses données de scan ?")) return; setBusy(true); try { await act({ action: "deleteQr", id: record.id }, "QR code supprimé"); onBack(); } catch { setBusy(false); } }}><Trash2 />Supprimer</button><button className="primary-button" disabled={busy}><Save />{busy ? "Enregistrement…" : "Enregistrer"}</button></div></form><AttachedQr name={displayName} target={previewData || record.trackingUrl} sourceTarget={destination} appearance={{ foreground: form.foreground, background: form.background, logoEnabled: effectiveLogo, logoColor: form.logoColor }} onAppearanceChange={(appearance) => setForm({ ...form, foreground: appearance.foreground, background: appearance.background, logoEnabled: appearance.logoEnabled, logoColor: appearance.logoColor })} /></div>{record.trackingEnabled ? <AdminAnalytics id={record.id} kind="qr" /> : <section className="detail-card"><p className="stats-note">Active « QR compact et suivi » pour voir les données de scan.</p></section>}</>;
}
