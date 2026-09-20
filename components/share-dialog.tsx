"use client";

import { useRef, useState } from "react";
import { Check, Copy, Facebook, Linkedin, Mail, MessageSquareText, MoreHorizontal, Share2, X } from "lucide-react";
import { SiBluesky, SiPinterest, SiReddit, SiTelegram, SiThreads, SiWhatsapp, SiX } from "@icons-pack/react-simple-icons";
import Image from "next/image";
import type { ElementType } from "react";

export function ShareDialog({ title }: { title: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [url, setUrl] = useState("https://liens.ae2v.fr");
  const [copied, setCopied] = useState(false);

  const shareText = `Retrouve tous les liens de ${title}`;
  const encoded = encodeURIComponent(url);
  const message = encodeURIComponent(shareText);
  const messageWithUrl = encodeURIComponent(`${shareText} ${url}`);
  const networks: { label: string; href: string; icon: ElementType }[] = [
    { label: "WhatsApp", href: `https://wa.me/?text=${messageWithUrl}`, icon: SiWhatsapp },
    { label: "Telegram", href: `https://t.me/share/url?url=${encoded}&text=${message}`, icon: SiTelegram },
    { label: "X", href: `https://twitter.com/intent/tweet?text=${message}&url=${encoded}`, icon: SiX },
    { label: "Threads", href: `https://www.threads.net/intent/post?text=${messageWithUrl}`, icon: SiThreads },
    { label: "Bluesky", href: `https://bsky.app/intent/compose?text=${messageWithUrl}`, icon: SiBluesky },
    { label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${encoded}`, icon: Facebook },
    { label: "LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${encoded}`, icon: Linkedin },
    { label: "Reddit", href: `https://www.reddit.com/submit?url=${encoded}&title=${message}`, icon: SiReddit },
    { label: "Pinterest", href: `https://www.pinterest.com/pin/create/button/?url=${encoded}&description=${message}`, icon: SiPinterest },
    { label: "SMS", href: `sms:?&body=${messageWithUrl}`, icon: MessageSquareText },
    { label: "E-mail", href: `mailto:?subject=${message}&body=${messageWithUrl}`, icon: Mail },
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
