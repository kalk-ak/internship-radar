export const SIMPLIFY_OWNER = "SimplifyJobs";

export function appUrl(): string {
  const explicit = process.env.APP_URL?.replace(/\/+$/, "");
  if (explicit) return explicit;
  const prod = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (prod) return `https://${prod}`;
  const preview = process.env.VERCEL_URL;
  if (preview) return `https://${preview}`;
  return "http://localhost:3000";
}

export function appSecret(): string {
  const secret = process.env.APP_SECRET;
  if (secret) return secret;
  if (process.env.VERCEL) throw new Error("APP_SECRET must be set on Vercel deployments");
  return "dev-only-insecure-secret";
}

export const HOT_FEED_LIMIT = 300;
export const RUN_LOG_LIMIT = 200;
export const DELIVERY_LOG_LIMIT = 500;
/** Listings posted longer ago than this are never treated as "new". */
export const NEW_LISTING_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;
/** Seen-set entries older than this are pruned. */
export const SEEN_RETENTION_MS = 45 * 24 * 60 * 60 * 1000;
