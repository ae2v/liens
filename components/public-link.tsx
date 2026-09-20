"use client";

import { ArrowUpRight } from "lucide-react";
import type { PageItem } from "@/lib/types";
import { BrandIcon } from "./brand-icon";
import { Countdown } from "./countdown";
import { DiscordPresence } from "./discord-presence";
import type { DiscordStats } from "@/lib/discord";

export function PublicLink({ item, featured, discord }: { item: PageItem; featured: boolean; discord?: DiscordStats | null }) {
  async function track() {
    navigator.sendBeacon?.(`/api/click/${item.id}`);
  }
  return <a className={`public-link${featured ? " is-featured" : ""}${item.kind === "countdown" ? " has-countdown" : ""}`} href={item.kind === "discord" && discord ? discord.invite : item.url} target="_blank" rel="noreferrer" onClick={track}>
    <span className="public-link-icon"><BrandIcon name={item.icon} size={22} /></span>
    <span className="public-link-copy">
      <strong>{item.title}</strong>
      {item.kind === "countdown" && item.countdownAt ? <Countdown target={item.countdownAt} /> :
        item.kind === "discord" ? <DiscordPresence initial={discord ?? null} fallback={item.subtitle} /> : <small>{item.subtitle}</small>}
    </span>
    <ArrowUpRight className="public-link-arrow" size={20} aria-hidden="true" />
  </a>;
}
