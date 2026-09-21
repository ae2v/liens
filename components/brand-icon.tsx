import { CalendarDays, Camera, Clock3, Globe2, Linkedin, Link as LinkIcon, Mail, MapPin, Music2, Ticket, type LucideProps } from "lucide-react";
import { SiBluesky, SiDiscord, SiFacebook, SiGithub, SiInstagram, SiLinktree, SiMastodon, SiPinterest, SiReddit, SiSnapchat, SiSoundcloud, SiSpotify, SiTelegram, SiThreads, SiTiktok, SiTwitch, SiWhatsapp, SiX, SiYoutube } from "@icons-pack/react-simple-icons";
import type { ElementType } from "react";

const icons = {
  Bluesky: SiBluesky, CalendarDays, Camera, Clock3, Discord: SiDiscord, Facebook: SiFacebook, GitHub: SiGithub, Globe2, Instagram: SiInstagram,
  LinkedIn: Linkedin, Linkedin, Link: LinkIcon, Linktree: SiLinktree, Mail, MapPin, Mastodon: SiMastodon, Music2, Pinterest: SiPinterest,
  Reddit: SiReddit, Snapchat: SiSnapchat, SoundCloud: SiSoundcloud, Spotify: SiSpotify, Telegram: SiTelegram, Threads: SiThreads, Ticket,
  TikTok: SiTiktok, Twitch: SiTwitch, WhatsApp: SiWhatsapp, X: SiX, Youtube: SiYoutube, YouTube: SiYoutube,
};

export const iconNames = Object.keys(icons);

export function BrandIcon({ name, ...props }: LucideProps & { name: string }) {
  const Icon = (icons[name as keyof typeof icons] ?? LinkIcon) as ElementType;
  return <Icon aria-hidden="true" {...props} />;
}
