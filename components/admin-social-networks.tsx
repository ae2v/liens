"use client";

import { useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import type { SocialNetwork } from "@/lib/types";
import type { AdminAction } from "@/app/admin/admin-dashboard";
import { BrandIcon } from "./brand-icon";

const defaults = ["Instagram", "Discord", "TikTok", "YouTube", "Linkedin"];

export function SocialNetworksEditor({ networks, act }: { networks: SocialNetwork[]; act: AdminAction }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [draft, setDraft] = useState({ network: "", url: "" });
  const choices = [...new Set([...defaults, ...networks.map((item) => item.network)])];
  function open(network: string) { const item = networks.find((entry) => entry.network === network); setSelected(network); setDraft({ network, url: item?.url ?? "" }); }
  return <section className="social-admin"><div className="list-heading"><div><h2>Réseaux</h2><span>{networks.length} configurés</span></div></div><div className="social-admin-icons">{choices.map((network) => <button type="button" key={network} className={selected === network ? "active" : ""} aria-label={`Configurer ${network}`} onClick={() => open(network)}><BrandIcon name={network} /></button>)}<button type="button" aria-label="Ajouter un réseau" onClick={() => { setSelected("new"); setDraft({ network: "", url: "" }); }}><Plus /></button></div>{selected && <form className="social-inline-editor" onSubmit={async (event) => { event.preventDefault(); await act({ action: "saveSocial", ...draft }, "Réseau enregistré"); setSelected(null); }}><span className="resource-icon"><BrandIcon name={draft.network || "Link"} /></span>{selected === "new" && <select required value={draft.network} onChange={(event) => setDraft({ ...draft, network: event.target.value })}><option value="">Choisir…</option>{[...defaults, "Facebook", "X", "Mail", "Linktree"].filter((name) => !networks.some((item) => item.network === name)).map((name) => <option key={name}>{name}</option>)}</select>}<input required aria-label="Adresse du réseau" placeholder="https://…" value={draft.url} onChange={(event) => setDraft({ ...draft, url: event.target.value })} /><button className="primary-button"><Save />Enregistrer</button>{selected !== "new" && networks.find((item) => item.network === selected) && <button type="button" className="danger-button" onClick={async () => { const item = networks.find((entry) => entry.network === selected); if (item) await act({ action: "deleteSocial", id: item.id }, "Réseau supprimé"); setSelected(null); }}><Trash2 /></button>}</form>}</section>;
}
