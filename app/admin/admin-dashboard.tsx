"use client";

import { useState } from "react";
import { Link2, LogOut, QrCode, PanelsTopLeft } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import type { PageItem, QrCodeRecord, ShortLink, SiteSettings } from "@/lib/types";
import { logoutAction } from "./actions";
import { ShortLinksManager } from "@/components/admin-short-links";
import { PageItemsManager } from "@/components/admin-page-items";
import { QrCodesManager } from "@/components/admin-qr-manager";

export type AdminData = { settings: SiteSettings; items: PageItem[]; shortLinks: ShortLink[]; qrCodes: QrCodeRecord[]; totals: { clicks: number; week: number } };
export type AdminAction = (payload: Record<string, unknown>, message?: string) => Promise<unknown>;

async function send(payload: Record<string, unknown>) {
  const response = await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "Une erreur est survenue.");
  return data;
}

export function AdminDashboard({ initialData }: { initialData: AdminData }) {
  const [tab, setTab] = useState<"page" | "short" | "qr">("page");
  const [data, setData] = useState(initialData);
  const [notice, setNotice] = useState("");
  async function reload(message?: string) {
    const response = await fetch("/api/admin");
    if (!response.ok) throw new Error("Impossible de recharger les données.");
    setData(await response.json());
    if (message) { setNotice(message); window.setTimeout(() => setNotice(""), 2400); }
  }
  const act: AdminAction = async (payload, message) => {
    try { const result = await send(payload); await reload(message); return result; }
    catch (error) { setNotice(error instanceof Error ? error.message : "Erreur"); throw error; }
  };
  return <main className="admin-shell">
    <aside className="admin-sidebar">
      <Link className="admin-brand" href="/"><Image src="/assets/logo-ae2v.svg" alt="AE2V" width={88} height={24} priority /><span>Liens</span></Link>
      <nav aria-label="Administration">
        <button className={tab === "page" ? "active" : ""} onClick={() => setTab("page")}><PanelsTopLeft />Page de liens</button>
        <button className={tab === "short" ? "active" : ""} onClick={() => setTab("short")}><Link2 />Liens courts</button>
        <button className={tab === "qr" ? "active" : ""} onClick={() => setTab("qr")}><QrCode />QR codes</button>
      </nav>
      <div className="admin-stats"><span><b>{data.totals.clicks}</b>engagements</span><span><b>{data.totals.week}</b>ces 7 derniers jours</span></div>
      <form action={logoutAction}><button className="logout-button"><LogOut />Se déconnecter</button></form>
    </aside>
    <section className="admin-main">
      {notice && <div className="admin-notice" role="status">{notice}</div>}
      {tab === "page" && <PageItemsManager data={data} act={act} />}
      {tab === "short" && <ShortLinksManager links={data.shortLinks} act={act} />}
      {tab === "qr" && <QrCodesManager records={data.qrCodes} act={act} />}
    </section>
  </main>;
}
