"use client";

import { useEffect, useState } from "react";
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
type AdminTab = "page" | "short" | "qr";
type AdminLocation = { tab: AdminTab; selected: string | null };

function readAdminLocation(): AdminLocation {
  const params = new URLSearchParams(window.location.search);
  const tabValue = params.get("tab");
  const tab: AdminTab = tabValue === "short" || tabValue === "qr" ? tabValue : "page";
  return { tab, selected: params.get("view") };
}

function adminUrl(tab: AdminTab, selected: string | null) {
  const url = new URL(window.location.href);
  if (tab === "page") url.searchParams.delete("tab");
  else url.searchParams.set("tab", tab);
  if (selected) url.searchParams.set("view", selected);
  else url.searchParams.delete("view");
  return `${url.pathname}${url.search}${url.hash}`;
}

async function send(payload: Record<string, unknown>) {
  const response = await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "Une erreur est survenue.");
  return data;
}

export function AdminDashboard({ initialData }: { initialData: AdminData }) {
  const [location, setLocation] = useState<AdminLocation>({ tab: "page", selected: null });
  const [data, setData] = useState(initialData);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const sync = () => setLocation(readAdminLocation());
    window.history.replaceState({ ...(window.history.state ?? {}), adminNavigation: true, adminDepth: 0 }, "", window.location.href);
    sync();
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  function navigate(tab: AdminTab, selected: string | null = null, replace = false) {
    const currentDepth = Number(window.history.state?.adminDepth ?? 0);
    const state = { ...(window.history.state ?? {}), adminNavigation: true, adminDepth: replace ? currentDepth : currentDepth + 1 };
    const url = adminUrl(tab, selected);
    if (replace) window.history.replaceState(state, "", url);
    else window.history.pushState(state, "", url);
    setLocation({ tab, selected });
  }

  function backToList(tab: AdminTab) {
    if (location.selected && window.history.state?.adminNavigation && Number(window.history.state?.adminDepth ?? 0) > 0) {
      window.history.back();
      return;
    }
    navigate(tab, null, true);
  }

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

  const { tab, selected } = location;
  return <main className="admin-shell">
    <aside className="admin-sidebar">
      <Link className="admin-brand" href="/"><Image src="/assets/logo-ae2v.svg" alt="AE2V" width={88} height={24} priority /><span>Liens</span></Link>
      <nav aria-label="Administration">
        <button className={tab === "page" ? "active" : ""} onClick={() => navigate("page")}><PanelsTopLeft />Page de liens</button>
        <button className={tab === "short" ? "active" : ""} onClick={() => navigate("short")}><Link2 />Liens courts</button>
        <button className={tab === "qr" ? "active" : ""} onClick={() => navigate("qr")}><QrCode />QR codes</button>
      </nav>
      <div className="admin-stats"><span><b>{data.totals.clicks}</b>engagements</span><span><b>{data.totals.week}</b>ces 7 derniers jours</span></div>
      <form action={logoutAction}><button className="logout-button"><LogOut />Se déconnecter</button></form>
    </aside>
    <section className="admin-main">
      {notice && <div className="admin-notice" role="status">{notice}</div>}
      {tab === "page" && <PageItemsManager data={data} act={act} selected={selected} onSelect={(id) => navigate("page", id)} onBack={() => backToList("page")} />}
      {tab === "short" && <ShortLinksManager links={data.shortLinks} act={act} selected={selected} onSelect={(id) => navigate("short", id)} onBack={() => backToList("short")} />}
      {tab === "qr" && <QrCodesManager records={data.qrCodes} act={act} selected={selected} onSelect={(id) => navigate("qr", id)} onBack={() => backToList("qr")} />}
    </section>
  </main>;
}
