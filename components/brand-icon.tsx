import { CalendarDays, Camera, Clock3, Globe2, Linkedin, Link as LinkIcon, Mail, MapPin, Music2, Ticket, type LucideProps } from "lucide-react";
import { SiDiscord, SiFacebook, SiInstagram, SiTwitch, SiYoutube, SiX, SiLinktree } from "@icons-pack/react-simple-icons";
import type { ElementType } from "react";

const icons = {
  CalendarDays, Camera, Clock3, Discord: SiDiscord, Facebook: SiFacebook, Globe2, Instagram: SiInstagram,
  Linkedin, Link: LinkIcon, Mail, MapPin, Music2, Ticket, Twitch: SiTwitch, Youtube: SiYoutube, X: SiX, Linktree: SiLinktree,
};

export const iconNames = Object.keys(icons);

export function BrandIcon({ name, ...props }: LucideProps & { name: string }) {
  const Icon = (icons[name as keyof typeof icons] ?? LinkIcon) as ElementType;
  return <Icon aria-hidden="true" {...props} />;
}
