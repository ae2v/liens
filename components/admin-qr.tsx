"use client";

import { useState } from "react";
import Image from "next/image";
import { FileDown, QrCode } from "lucide-react";
import type { QrCodeRecord } from "@/lib/types";

export type AdminAct = (payload: Record<string, unknown>, message?: string) => Promise<unknown>;

export function QrDownloads({ record }: { record: Pick<QrCodeRecord, 'targetUrl' | 'foreground' | 'background'> }) {
  const query = new URLSearchParams({ data: record.targetUrl, dark: record.foreground, light: record.background });
  return <div className="inline-actions"><a className="secondary-button" href={`/api/qr?${query}&format=svg`} download><FileDown />SVG</a><a className="secondary-button" href={`/api/qr?${query}&format=png`} download><FileDown />PNG</a></div>;
}

export function AttachedQr({ name, target, shortLinkId, records, act }: { name: string; target: string; shortLinkId?: string; records: QrCodeRecord[]; act: AdminAct }) {
  const record = records.find(qr => shortLinkId ? qr.shortLinkId === shortLinkId : qr.targetUrl === target);
  const [busy, setBusy] = useState(false);
  async function create() {
    setBusy(true);
    try { await act({ action: 'createQr', name, targetUrl: target, shortLinkId: shortLinkId ?? null }, 'QR code ajouté'); }
    catch { /* The dashboard displays the API error. */ }
    finally { setBusy(false); }
  }
  return <section className="attached-qr"><h2>Code QR</h2>{record ? <><Image unoptimized src={`/api/qr?${new URLSearchParams({ data: record.targetUrl, dark: record.foreground, light: record.background })}&format=svg`} width={180} height={180} alt={`QR code : ${name}`} /><QrDownloads record={record} /></> : <><QrCode size={42} aria-hidden="true" /><p>Aucun QR code associé.</p><button type="button" className="secondary-button" disabled={busy} onClick={create}><QrCode />{busy ? 'Création…' : 'Ajouter un QR code'}</button></>}</section>;
}
