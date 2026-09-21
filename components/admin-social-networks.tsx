"use client";

import { useState } from "react";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, type DragEndEvent, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, arrayMove, horizontalListSortingStrategy, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, Save, Trash2, X } from "lucide-react";
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
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  async function reorder(event: DragEndEvent) {
    if (!event.over || event.active.id === event.over.id) return;
    const from = configured.findIndex((item) => item.id === event.active.id);
    const to = configured.findIndex((item) => item.id === event.over?.id);
    if (from < 0 || to < 0) return;
    const next = arrayMove(configured, from, to);
    await act({ action: "reorderSocials", ids: next.map((item) => item.id) }, "Ordre des réseaux enregistré");
  }

  return <section className="social-admin">
    <div className="list-heading"><div><h2>Réseaux</h2><span>{configured.length} configuré{configured.length > 1 ? "s" : ""}</span></div></div>
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(event) => void reorder(event)}><SortableContext items={configured.map((item) => item.id)} strategy={horizontalListSortingStrategy}><div className="social-admin-icons">{configured.map((item) => <SortableSocial key={item.id} item={item} active={selected === item.id} onEdit={() => edit(item)} />)}<button type="button" className={adding ? "active add-social" : "add-social"} aria-label="Ajouter un réseau" onClick={() => { setAdding(!adding); setSelected(null); }}><Plus /></button></div></SortableContext></DndContext>
    {adding && <div className="network-library"><div><strong>Ajouter un réseau</strong><button type="button" aria-label="Fermer" onClick={() => setAdding(false)}><X /></button></div><div>{networkLibrary.filter((name) => !configured.some((item) => item.network.toLowerCase() === name.toLowerCase())).map((network) => <button type="button" key={network} onClick={() => add(network)}><BrandIcon name={network} /><span>{network}</span></button>)}</div></div>}
    {selected && <form className="social-inline-editor" onSubmit={async (event) => { event.preventDefault(); await act({ action: "saveSocial", ...draft }, "Réseau enregistré"); setSelected(null); }}><span className="resource-icon"><BrandIcon name={draft.network} /></span><strong>{draft.network}</strong><input required aria-label={`Adresse ${draft.network}`} placeholder="https://…" value={draft.url} onChange={(event) => setDraft({ ...draft, url: event.target.value })} /><button className="primary-button"><Save />Enregistrer</button>{current && <button type="button" className="danger-button" aria-label={`Supprimer ${current.network}`} onClick={async () => { if (!confirm(`Supprimer ${current.network} ?`)) return; await act({ action: "deleteSocial", id: current.id }, "Réseau supprimé"); setSelected(null); }}><Trash2 />Supprimer</button>}</form>}
  </section>;
}

function SortableSocial({ item, active, onEdit }: { item: SocialNetwork; active: boolean; onEdit: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  return <span ref={setNodeRef} className={`sortable-social${isDragging ? " dragging" : ""}`} style={{ transform: CSS.Transform.toString(transform), transition }}>
    <button type="button" className={active ? "active" : ""} aria-label={`Configurer ${item.network}`} title={item.network} onClick={onEdit}><BrandIcon name={item.network} /></button>
    <button type="button" className="social-drag-handle" aria-label={`Réordonner ${item.network}`} title="Glisser pour réordonner" {...attributes} {...listeners}><GripVertical /></button>
  </span>;
}
