"use client";

import { useRef, useState } from "react";
import { Check, Copy, Facebook, Linkedin, Mail, MessageCircle, MoreHorizontal, Share2, X } from "lucide-react";
import Image from "next/image";

export function ShareDialog({ title }: { title: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [url, setUrl] = useState("https://liens.ae2v.fr");
  const [copied, setCopied] = useState(false);

  const encoded = encodeURIComponent(url);
  const message = encodeURIComponent(`Retrouve tous les liens de ${title}`);
  const networks = [
    { label: "WhatsApp", href: `https://wa.me/?text=${message}%20${encoded}`, icon: MessageCircle },
    { label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${encoded}`, icon: Facebook },
    { label: "LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${encoded}`, icon: Linkedin },
    { label: "E-mail", href: `mailto:?subject=${message}&body=${encoded}`, icon: Mail },
  ];

  async function copy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  async function nativeShare() {
    if (navigator.share) await navigator.share({ title, url });
    else await copy();
  }

  return <>
    <button className="round-button" aria-label="Partager cette page" onClick={() => { setUrl(window.location.href); dialog.current?.showModal(); }}><Share2 size={20} /></button>
    <dialog className="share-dialog" ref={dialog} onClick={(event) => event.target === dialog.current && dialog.current.close()}>
      <div className="share-sheet">
        <header><h2>Partager la page</h2><button aria-label="Fermer" onClick={() => dialog.current?.close()}><X /></button></header>
        <div className="share-card">
          <div className="share-logo"><Image src="/assets/logo-ae2v.svg" alt="" width={56} height={16} /></div>
          <strong>{title}</strong><span>liens.ae2v.fr</span>
          <Image unoptimized className="share-qr" width={96} height={96} src={`/api/qr?data=${encoded}&format=svg`} alt="Code QR vers cette page" />
        </div>
        <div className="share-options" aria-label="Options de partage">
          <button onClick={copy}>{copied ? <Check /> : <Copy />}<span>{copied ? "Copié" : "Copier"}</span></button>
          {networks.map(({ label, href, icon: Icon }) => <a key={label} href={href} target="_blank" rel="noreferrer"><Icon /><span>{label}</span></a>)}
          <button onClick={nativeShare}><MoreHorizontal /><span>Plus</span></button>
        </div>
      </div>
    </dialog>
  </>;
}
