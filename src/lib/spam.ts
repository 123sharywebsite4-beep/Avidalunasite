import "server-only";

// A per-IP rate limit for the site's own API (add-on checkout). The forms themselves go to
// Netlify Forms (which filters spam) and Mailchimp's signup form, each with a honeypot.
// The limit lives in memory, so it's per server instance. That's enough to slow down a
// script hammering one route; it is not a hard global limit.

const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 8;

const hits = new Map<string, number[]>();

export function clientIp(req: Request): string {
  return (
    req.headers.get("x-nf-client-connection-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

/** Returns true when this IP has sent too many requests to this route recently. */
export function isRateLimited(req: Request, route: string, max = MAX_PER_WINDOW): boolean {
  const key = `${route}:${clientIp(req)}`;
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) {
    // Keep memory bounded on a long-lived instance.
    for (const [k, v] of hits) if (!v.some((t) => now - t < WINDOW_MS)) hits.delete(k);
  }
  return recent.length > max;
}
