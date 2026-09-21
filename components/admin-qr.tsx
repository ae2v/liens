"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { FileDown } from "lucide-react";

export type AdminAct = (payload: Record<string, unknown>, message?: string) => Promise<unknown>;

type QrAppearance = {
  foreground?: string;
  background?: string;
  logoEnabled?: boolean;
  logoColor?: string;
};

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

function qrQuery(data: string, appearance: QrAppearance = {}) {
  return new URLSearchParams({
    data,
    dark: appearance.foreground ?? "#171717",
    light: appearance.background ?? "#ffffff",
    logo: appearance.logoEnabled === false ? "0" : "1",
    logoColor: appearance.logoColor ?? "#d60106",
  });
}

function useQrInfo(data: string) {
  const [info, setInfo] = useState<QrInfo | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/qr-info?data=${encodeURIComponent(data)}`, { signal: controller.signal })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((result: QrInfo) => setInfo(result))
      .catch(() => { if (!controller.signal.aborted) setInfo(null); });
    return () => controller.abort();
  }, [data]);

  return info;
}

function technicalSummary(info: QrInfo) {
  const autoAction = info.compactHelps
    ? "=> activer automatiquement QR compact et suivi"
    : "=> conserver la destination directe";
  const destinationMessage = info.direct.version >= 7 && info.compact.logoAllowed
    ? "=> message sous Destination"
    : "=> aucun message sous Destination";

  return [
    "Destination directe [actif]",
    `→ V${info.direct.version}`,
    `→ ${info.direct.errorCorrection}`,
    `→ logo ${info.direct.logoAllowed ? "autorisé" : "interdit"}`,
    "",
    "/q/xxxx [inactif]",
    `→ V${info.compact.version}`,
    `→ ${info.compact.errorCorrection}`,
    `→ logo ${info.compact.logoAllowed ? "autorisé" : "interdit"}`,
    "",
    autoAction,
    destinationMessage,
  ].join("\n");
}

export function QrDownloads({ data, foreground = "#171717", background = "#ffffff", logoEnabled = true, logoColor = "#d60106" }: { data: string; foreground?: string; background?: string; logoEnabled?: boolean; logoColor?: string }) {
  const query = qrQuery(data, { foreground, background, logoEnabled, logoColor });
  return <div className="inline-actions"><a className="secondary-button" href={`/api/qr?${query}&format=svg`} download><FileDown />SVG</a><a className="secondary-button" href={`/api/qr?${query}&format=png`} download><FileDown />PNG</a></div>;
}

export function AttachedQr({ name, target }: { name: string; target: string }) {
  const query = qrQuery(target);
  const info = useQrInfo(target);
  return <section className="attached-qr"><h2>Code QR</h2><Image unoptimized src={`/api/qr?${query}&format=svg`} width={180} height={180} alt={`QR code : ${name}`} /><QrDownloads data={target} />{info && <p hidden>{technicalSummary(info)}</p>}</section>;
}
