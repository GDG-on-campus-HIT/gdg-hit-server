require('dotenv').config();

// The club moves to a new domain every year. Everything domain-specific is derived from
// FRONTEND_HOST so a domain change only needs that env var updated (plus CORS_ORIGINS for extras).

const stripTrailingSlash = (url: string) => url.replace(/\/+$/, "");

export const siteUrl = stripTrailingSlash(process.env.FRONTEND_HOST || "http://localhost:3000");

const site = new URL(siteUrl);
const rootHostname = site.hostname.replace(/^www\./, "");
const isLocalSite = rootHostname === "localhost" || /^[\d.]+$/.test(rootHostname);

if (process.env.NODE_ENV === "production" && isLocalSite) {
  console.warn(
    `[site] FRONTEND_HOST is "${siteUrl}" in production. Set it to the live website URL ` +
      "(e.g. https://gdghit.dev) or browsers on the site will be blocked by CORS."
  );
}

/** Host shown to people, e.g. "gdghit.dev". */
export const siteHost = site.host.replace(/^www\./, "");

export const cookieDomain = process.env.COOKIE_DOMAIN || `.${rootHostname}`;

const siteOrigins = isLocalSite
  ? [site.origin]
  : ["", "www.", "admin.", "blog."].map((sub) => `${site.protocol}//${sub}${rootHostname}`);

const extraOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((origin) => stripTrailingSlash(origin.trim()))
  .filter(Boolean);

export const allowedOrigins = Array.from(
  new Set([
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
    "http://localhost:5173",
    "http://localhost:5174",
    ...siteOrigins,
    "https://gdg-hit-main-ffch.vercel.app",
    "https://my-admin-panel-livid.vercel.app",
    ...extraOrigins,
  ])
);
