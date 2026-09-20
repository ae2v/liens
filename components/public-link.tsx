"use client";

import { ArrowUpRight } from "lucide-react";
import type { PageItem } from "@/lib/types";
import { BrandIcon } from "./brand-icon";
import { Countdown } from "./countdown";

export function PublicLink({ item, featured, discordCount }: { item: PageItem; featured: boolean; discordCount?: number | null }) {
  async function track() {
    navigator.sendBeacon?.(`/api/click/${item.id}`);
  }
  return <a className={`public-link${featured ? " is-featured" : ""}`} href={item.url} target="_blank" rel="noreferrer" onClick={track}>
    <span className="public-link-icon"><BrandIcon name={item.icon} size={22} /></span>
    <span className="public-link-copy">
      <strong>{item.title}</strong>
      {item.kind === "countdown" && item.countdownAt ? <Countdown target={item.countdownAt} /> :
        <small>{item.kind === "discord" && discordCount ? `${discordCount.toLocaleString("fr-FR")} membres en ligne` : item.subtitle}</small>}
    </span>
    {featured && <span className="featured-label">À la une</span>}
    <ArrowUpRight className="public-link-arrow" size={20} aria-hidden="true" />
  </a>;
}
