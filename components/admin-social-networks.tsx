"use client";

import { useState } from "react";
import { Plus, Save, Trash2, X } from "lucide-react";
import type { SocialNetwork } from "@/lib/types";
import type { AdminAction } from "@/app/admin/admin-dashboard";
import { BrandIcon } from "./brand-icon";

const networkLibrary = ["Instagram", "Discord", "TikTok", "YouTube", "LinkedIn", "Facebook", "X", "Snapchat", "Threads", "Bluesky", "WhatsApp", "Telegram", "Twitch", "Reddit", "Pinterest", "Mastodon", "Spotify", "SoundCloud", "GitHub", "Linktree", "Mail"];

export function SocialNetworksEditor({ networks, act }: { networks: SocialNetwork[]; act: AdminAction }) {
  const configured = networks.filter((item) => item.url.trim());
  const [selected, setSelected] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ network: "", url: "" });
  function edit(item: SocialNetwork) { setAdding(false); setSelected(item.id); setDraft({ network: item.network, url: item.url }); }
  function add(network: string) { setAdding(false); setSelected("new"); setDraft({ network, url: "" }); }
  const current = configured.find((item) => item.id === selected);

  return <section className="social-admin">
    <div className="list-heading"><div><h2>Réseaux</h2><span>{configured.length} configuré{configured.length > 1 ? "s" : ""}</span></div></div>
    <div className="social-admin-icons">{configured.map((item) => <button type="button" key={item.id} className={selected === item.id ? "active" : ""} aria-label={`Configurer ${item.network}`} title={item.network} onClick={() => edit(item)}><BrandIcon name={item.network} /></button>)}<button type="button" className={adding ? "active" : ""} aria-label="Ajouter un réseau" onClick={() => { setAdding(!adding); setSelected(null); }}><Plus /></button></div>
    {adding && <div className="network-library"><div><strong>Ajouter un réseau</strong><button type="button" aria-label="Fermer" onClick={() => setAdding(false)}><X /></button></div><div>{networkLibrary.filter((name) => !configured.some((item) => item.network.toLowerCase() === name.toLowerCase())).map((network) => <button type="button" key={network} onClick={() => add(network)}><BrandIcon name={network} /><span>{network}</span></button>)}</div></div>}
    {selected && <form className="social-inline-editor" onSubmit={async (event) => { event.preventDefault(); await act({ action: "saveSocial", ...draft }, "Réseau enregistré"); setSelected(null); }}><span className="resource-icon"><BrandIcon name={draft.network} /></span><strong>{draft.network}</strong><input required aria-label={`Adresse ${draft.network}`} placeholder="https://…" value={draft.url} onChange={(event) => setDraft({ ...draft, url: event.target.value })} /><button className="primary-button"><Save />Enregistrer</button>{current && <button type="button" className="danger-button" aria-label={`Supprimer ${current.network}`} onClick={async () => { if (!confirm(`Supprimer ${current.network} ?`)) return; await act({ action: "deleteSocial", id: current.id }, "Réseau supprimé"); setSelected(null); }}><Trash2 />Supprimer</button>}</form>}
  </section>;
}
