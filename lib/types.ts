export type ConditionRule = {
  field: "after" | "before" | "year" | "weekday";
  value: string;
};

export type Conditions = {
  mode: "all" | "any";
  rules: ConditionRule[];
};

export type SiteSettings = {
  id: number;
  displayName: string;
  bio: string;
  logoPath: string;
  discordInvite: string | null;
  discordConnected: boolean;
};

export type PageItem = {
  id: string;
  kind: "link" | "discord" | "countdown";
  title: string;
  subtitle: string;
  url: string;
  icon: string;
  enabled: boolean;
  featured: boolean;
  featuredStartAt: string | null;
  featuredEndAt: string | null;
  countdownAt: string | null;
  conditions: Conditions;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  clicks?: number;
};

export type ShortLink = {
  id: string;
  slug: string;
  destination: string;
  title: string;
  description: string;
  imageUrl: string | null;
  expiresAt: string | null;
  expiryMessage: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  clicks: number;
  clicksThisWeek: number;
  lastClickAt: string | null;
};

export type QrCodeRecord = {
  id: string;
  name: string;
  targetUrl: string;
  shortLinkId: string | null;
  foreground: string;
  background: string;
  createdAt: string;
};
