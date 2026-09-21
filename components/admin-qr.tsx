"use client";

import Image from "next/image";
import { FileDown } from "lucide-react";

export type AdminAct = (payload: Record<string, unknown>, message?: string) => Promise<unknown>;

type QrAppearance = {
  foreground?: string;
  background?: string;
  logoEnabled?: boolean;
  logoColor?: string;
};

function qrQuery(data: string, appearance: QrAppearance = {}) {
  return new URLSearchParams({
    data,
    dark: appearance.foreground ?? "#171717",
    light: appearance.background ?? "#ffffff",
    logo: appearance.logoEnabled === false ? "0" : "1",
    logoColor: appearance.logoColor ?? "#d60106",
  });
}

export function QrDownloads({ data, foreground = "#171717", background = "#ffffff", logoEnabled = true, logoColor = "#d60106" }: { data: string; foreground?: string; background?: string; logoEnabled?: boolean; logoColor?: string }) {
  const query = qrQuery(data, { foreground, background, logoEnabled, logoColor });
  return <div className="inline-actions"><a className="secondary-button" href={`/api/qr?${query}&format=svg`} download><FileDown />SVG</a><a className="secondary-button" href={`/api/qr?${query}&format=png`} download><FileDown />PNG</a></div>;
}

export function AttachedQr({ name, target }: { name: string; target: string }) {
  const query = qrQuery(target);
  return <section className="attached-qr"><h2>Code QR</h2><Image unoptimized src={`/api/qr?${query}&format=svg`} width={180} height={180} alt={`QR code : ${name}`} /><QrDownloads data={target} /></section>;
}
