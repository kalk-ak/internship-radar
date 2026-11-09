export const CATEGORIES = ["Software", "AI/ML/Data", "Quant", "Hardware", "Product"] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  Software: "Software Engineering",
  "AI/ML/Data": "Data Science, AI & ML",
  Quant: "Quantitative Finance",
  Hardware: "Hardware Engineering",
  Product: "Product Management",
};

/** Raw shape of an entry in SimplifyJobs' `.github/scripts/listings.json`. */
export interface RawListing {
  id: string;
  company_name: string;
  title: string;
  url: string;
  locations?: string[];
  terms?: string[];
  category?: string;
  sponsorship?: string;
  date_posted: number;
  date_updated?: number;
  active: boolean;
  is_visible: boolean;
  company_url?: string;
  source?: string;
  degrees?: string[];
}

/** Normalised internship role used everywhere in the app. */
export interface Role {
  id: string;
  company: string;
  title: string;
  url: string;
  locations: string[];
  terms: string[];
  category: Category;
  sponsorship: string;
  postedAt: number; // epoch ms
  hot: boolean;
  swe: boolean;
}

export interface Prefs {
  categories: Category[];
  /** Only alert for FAANG+/top-tier companies (plus anything in `watch`). */
  hotOnly: boolean;
  /** Extra companies this subscriber always wants alerts for. */
  watch: string[];
}

export interface EmailChannel {
  address: string;
  verified: boolean;
  verifyToken?: string;
}

export interface TelegramChannel {
  linkCode: string;
  chatId?: number;
  username?: string;
  verified: boolean;
}

export interface DiscordChannel {
  webhookUrl: string;
  verified: boolean;
}

export interface WhatsAppChannel {
  phone: string; // E.164 without spaces, e.g. +14155550123
  callmebotKey?: string;
  verified: boolean;
}

export interface Channels {
  email?: EmailChannel;
  telegram?: TelegramChannel;
  discord?: DiscordChannel;
  whatsapp?: WhatsAppChannel;
}

export type ChannelName = keyof Channels;
export const CHANNEL_NAMES: ChannelName[] = ["email", "telegram", "discord", "whatsapp"];

export interface Subscriber {
  id: string;
  name: string;
  createdAt: number;
  manageToken: string;
  prefs: Prefs;
  channels: Channels;
  paused: boolean;
  alertsSent: number;
  lastAlertAt?: number;
}

export interface CheckState {
  repo?: string;
  repoCheckedAt?: number;
  readmeEtag?: string;
  listingsEtag?: string;
  baselineDone?: boolean;
  lastRunAt?: number;
  lastChangeAt?: number;
  lastReadmeChangeAt?: number;
  lastError?: string;
  lastErrorAt?: number;
  runs?: number;
}

export interface BoardSnapshot {
  repo: string;
  updatedAt: number;
  totals: { active: number; byCategory: Record<string, number>; hot: number; hotCompanies: number };
  roles: Role[];
}

export interface RunLog {
  at: number;
  trigger: string;
  repo?: string;
  changed: boolean;
  baseline?: boolean;
  newRoles: number;
  newHot: number;
  alerts: number;
  failures: number;
  durationMs: number;
  error?: string;
  skipped?: string;
}

export interface DeliveryLog {
  at: number;
  subscriberId: string;
  subscriberName: string;
  channel: ChannelName | "instagram";
  ok: boolean;
  detail?: string;
  headline: string;
}

export interface Alert {
  headline: string;
  companies: string[];
  roles: Role[];
}
