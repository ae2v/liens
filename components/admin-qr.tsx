"use client";

import Image from "next/image";
import { FileDown } from "lucide-react";

export type AdminAct = (payload: Record<string, unknown>, message?: string) => Promise<unknown>;

export function QrDownloads({ data, foreground = "#171717", background = "#ffffff" }: { data: string; foreground?: string; background?: string }) {
  const query = new URLSearchParams({ data, dark: foreground, light: background });
  return <div className="inline-actions"><a className="secondary-button" href={`/api/qr?${query}&format=svg`} download><FileDown />SVG</a><a className="secondary-button" href={`/api/qr?${query}&format=png`} download><FileDown />PNG</a></div>;
}

export function AttachedQr({ name, target }: { name: string; target: string }) {
  const query = new URLSearchParams({ data: target, dark: "#171717", light: "#ffffff" });
  return <section className="attached-qr"><h2>Code QR</h2><Image unoptimized src={`/api/qr?${query}&format=svg`} width={180} height={180} alt={`QR code : ${name}`} /><QrDownloads data={target} /></section>;
}
