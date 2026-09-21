"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { FileDown, QrCode } from "lucide-react";

export type AdminAct = (payload: Record<string, unknown>, message?: string) => Promise<unknown>;
export type QrAppearance = { foreground: string; background: string; logoEnabled: boolean; logoColor: string };
type QrSizing = { version: number; modules: number; errorCorrection: "Q" | "H"; logoAllowed: boolean };
type QrInfo = { direct: QrSizing; compact: QrSizing; compactHelps: boolean };

function qrQuery(data: string, appearance: Partial<QrAppearance> = {}) {
  return new URLSearchParams({ data, dark: appearance.foreground ?? "#171717", light: appearance.background ?? "#ffffff", logo: appearance.logoEnabled === false ? "0" : "1", logoColor: appearance.logoColor ?? "#d60106" });
}

function useQrInfo(data: string) {
  const [info, setInfo] = useState<QrInfo | null>(null);
  useEffect(() => {
    if (!data) return;
    const controller = new AbortController();
    fetch(`/api/qr-info?data=${encodeURIComponent(data)}`, { signal: controller.signal }).then((response) => response.ok ? response.json() : Promise.reject()).then(setInfo).catch(() => { if (!controller.signal.aborted) setInfo(null); });
    return () => controller.abort();
  }, [data]);
  return info;
}

export function QrDownloads({ data, foreground = "#171717", background = "#ffffff", logoEnabled = true, logoColor = "#d60106" }: { data: string; foreground?: string; background?: string; logoEnabled?: boolean; logoColor?: string }) {
  const query = qrQuery(data, { foreground, background, logoEnabled, logoColor });
  return <div className="inline-actions"><a className="secondary-button" href={`/api/qr?${query}&format=svg`} download><FileDown />SVG</a><a className="secondary-button" href={`/api/qr?${query}&format=png`} download><FileDown />PNG</a></div>;
}

export function AttachedQr({ name, target, sourceTarget, appearance = { foreground: "#171717", background: "#ffffff", logoEnabled: true, logoColor: "#d60106" }, onAppearanceChange, disabled = false }: { name: string; target: string; sourceTarget?: string; appearance?: QrAppearance; onAppearanceChange?: (appearance: QrAppearance) => void; disabled?: boolean }) {
  const info = useQrInfo(sourceTarget || target);
  const sizing = info?.direct;
  const logoAllowed = sizing?.logoAllowed ?? true;
  const effective = { ...appearance, logoEnabled: appearance.logoEnabled && logoAllowed };
  const set = (next: Partial<QrAppearance>) => onAppearanceChange?.({ ...appearance, ...next });
  const transparent = appearance.background === "transparent";
  const lines = info ? [`Version ${sizing?.version} · ${sizing?.modules} × ${sizing?.modules} modules`, `Correction ${sizing?.errorCorrection}`, `Logo ${logoAllowed ? "autorisé" : "désactivé à partir de V7"}`] : [];
  return <section className={`attached-qr ${disabled ? "is-disabled" : ""}`}>
    <h2>Code QR</h2>
    {disabled ? <div className="qr-disabled"><QrCode /><strong>Le lien est désactivé</strong></div> : target ? <Image unoptimized src={`/api/qr?${qrQuery(target, effective)}&format=svg`} width={220} height={220} alt={`QR code : ${name}`} /> : <div className="qr-disabled"><QrCode /><span>L’aperçu apparaîtra ici</span></div>}
    {!disabled && target && <QrDownloads data={target} {...effective} />}
    {onAppearanceChange && <fieldset className="qr-appearance" disabled={disabled}><legend>Apparence</legend><div className="color-row"><label>Modules<input type="color" value={appearance.foreground} onChange={(event) => set({ foreground: event.target.value })} /></label><label>Fond<input type="color" disabled={transparent} value={transparent ? "#ffffff" : appearance.background} onChange={(event) => set({ background: event.target.value })} /></label><label>Logo<input type="color" disabled={!appearance.logoEnabled || !logoAllowed} value={appearance.logoColor} onChange={(event) => set({ logoColor: event.target.value })} /></label></div><label className="toggle-label"><input type="checkbox" checked={transparent} onChange={(event) => set({ background: event.target.checked ? "transparent" : "#ffffff" })} /><span />Fond transparent</label><label className="toggle-label"><input type="checkbox" disabled={!logoAllowed} checked={appearance.logoEnabled && logoAllowed} onChange={(event) => set({ logoEnabled: event.target.checked })} /><span />Afficher le lion AE2V</label></fieldset>}
    {lines.length > 0 && <details className="qr-technical"><summary>Informations techniques</summary><p>{lines.map((line, index) => <span key={line}>{index > 0 && <br />}{line}</span>)}</p></details>}
  </section>;
}
