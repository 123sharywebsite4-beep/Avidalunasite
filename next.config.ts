import { existsSync } from "node:fs";
import path from "node:path";
import type { NextConfig } from "next";
import { securityHeaders } from "./src/lib/security-headers";

// Brand files Shary supplies (see /docs/brand/README.md). Drop them into /public/brand/ and rebuild.
// Checked once at build time so the result is baked in (serverless revalidation can't see /public).
function brandFile(name: string): string {
  for (const ext of ["svg", "png", "webp", "jpg", "jpeg"]) {
    if (existsSync(path.join(process.cwd(), "public", "brand", `${name}.${ext}`))) return `/brand/${name}.${ext}`;
  }
  return "";
}

// Old Squarespace URLs -> new URLs. 301 (not Next's default 308) so search engines
// treat them as classic permanent moves.
const legacyRedirects: Array<[string, string]> = [
  ["/about-me", "/about"],
  ["/cart", "/add-ons"],
  ["/wellnesseducation", "/wellness-education"],
  ["/wellnesseducation/:slug*", "/wellness-education"],
  ["/faq-1", "/faq"],
  ["/home", "/"],
  ["/welcome", "/"],
];

const nextConfig: NextConfig = {
  // Tests only: the Playwright suite builds a second copy without Stripe keys into another folder
  // (see playwright.config.ts). Never set NEXT_DIST_DIR on Netlify.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  poweredByHeader: false,
  env: {
    BRAND_LOGO: brandFile("logo"),
    BRAND_LOGO_HORIZONTAL: brandFile("logo-horizontal"),
    BRAND_PORTRAIT: brandFile("shary"),
    BRAND_PORTRAIT_ALT: brandFile("shary-alt"),
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [{ protocol: "https", hostname: "cdn.sanity.io" }],
  },
  async redirects() {
    return [
      ...legacyRedirects.map(([source, destination]) => ({
        source,
        destination,
        statusCode: 301 as const,
      })),
      // Restorative visits moved to their own page. The query string is passed through, so
      // /book?package=luna-light lands on /book/restorative?package=luna-light (package preselected).
      // Restorative packages with other slugs are moved in the browser (BookingRouter).
      {
        source: "/book",
        has: [{ type: "query" as const, key: "restorative" }],
        destination: "/book/restorative",
        permanent: false,
      },
      {
        source: "/book",
        has: [{ type: "query" as const, key: "package", value: "luna-.*" }],
        destination: "/book/restorative",
        permanent: false,
      },
    ];
  },
  async headers() {
    const noindex = [{ key: "X-Robots-Tag", value: "noindex" }];
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/api/:path*", headers: noindex },
      { source: "/add-ons/success", headers: noindex },
      { source: "/add-ons/cancel", headers: noindex },
      { source: "/__forms.html", headers: noindex },
    ];
  },
};

export default nextConfig;
