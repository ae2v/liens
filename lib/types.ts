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
  publishAt: string | null;
  expiresAt: string | null;
  qrForeground: string;
  qrBackground: string;
  qrLogoEnabled: boolean;
  qrLogoColor: string;
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
  imageAlt: string;
  siteName: string;
  twitterSite: string;
  twitterLargeImage: boolean;
  embedColor: string;
  imageMode: "url" | "upload" | "generated";
  socialOverrides: Partial<Pick<SocialMetadata, "title" | "description" | "imageUrl" | "imageAlt" | "siteName" | "twitterLargeImage" | "embedColor"> & { imageMode: "url" | "upload" | "generated" | "none" }>;
  qrForeground: string;
  qrBackground: string;
  qrLogoEnabled: boolean;
  qrLogoColor: string;
  expiresAt: string | null;
  expiryMessage: string;
  disabledMessage: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  clicks: number;
  clicksThisWeek: number;
  lastClickAt: string | null;
};

export type SocialNetwork = {
  id: string;
  network: string;
  url: string;
  sortOrder: number;
  enabled: boolean;
};

export type QrCodeRecord = {
  id: string;
  name: string;
  targetUrl: string;
  shortLinkId: string | null;
  foreground: string;
  background: string;
  trackingEnabled: boolean;
  logoEnabled: boolean;
  logoColor: string;
  createdAt: string;
  updatedAt: string;
  scans: number;
  trackingUrl: string;
};

export type SocialMetadata = {
  title: string;
  description: string;
  imageUrl: string;
  imageAlt: string;
  siteName: string;
  twitterSite: string;
  twitterLargeImage: boolean;
  embedColor: string;
};
