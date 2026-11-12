import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/constants";
import { getArticles } from "@/lib/content";

export const revalidate = 3600;

const staticPaths = [
  "/",
  "/services",
  "/packages",
  "/add-ons",
  "/events",
  "/wellness-education",
  "/about",
  "/faq",
  "/contact",
  "/book",
  "/book/restorative",
  "/join",
  "/privacy",
  "/terms",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const articles = await getArticles();
  return [
    ...staticPaths.map((p) => ({ url: `${SITE_URL}${p === "/" ? "" : p}` })),
    ...articles.map((a) => ({ url: `${SITE_URL}/wellness-education/${a.slug}`, lastModified: a.publishedAt })),
  ];
}
