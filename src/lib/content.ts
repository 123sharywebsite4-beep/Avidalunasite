import "server-only";
import * as fallback from "@content/fallback";
import { type LegalBlock, type LegalPageKey, legalDefaults } from "@content/legal";
import { CONTACT_EMAIL } from "./constants";
import { type PackageSource, resolvePackages } from "./packages";
import { cdnClient, liveClient } from "./sanity";
import type {
  AddOn,
  Article,
  EventItem,
  Faq,
  FaqPlacement,
  ImageRef,
  PageKey,
  PageText,
  RichBlock,
  Service,
  SiteSettings,
  Testimonial,
  WellnessPackage,
} from "./types";

// Every public read is tagged with its document type, so the Sanity webhook
// (/api/revalidate) can refresh just that content without a full deploy.
// The hourly backstop also hides events once their date has passed.
const BACKSTOP_SECONDS = 3600;

async function fetchTagged<T>(
  query: string,
  params: Record<string, unknown>,
  tags: string[],
): Promise<T | null> {
  if (!cdnClient) return null;
  try {
    return await cdnClient.fetch<T>(query, params, {
      cache: "force-cache",
      next: { tags, revalidate: BACKSTOP_SECONDS },
    });
  } catch (error) {
    console.error("[content] Sanity fetch failed, using fallback", tags, (error as Error).message);
    return null;
  }
}

const imageProjection = `image{ "src": asset->url, "alt": coalesce(alt, ""), "width": asset->metadata.dimensions.width, "height": asset->metadata.dimensions.height }`;

function normalizeImage(image: { src?: string } | null | undefined): ImageRef {
  return image?.src ? (image as NonNullable<ImageRef>) : null;
}

/** Today's date in Florida, as YYYY-MM-DD. */
export function todayInFlorida(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export async function getSiteSettings(): Promise<SiteSettings> {
  const data = await fetchTagged<{
    phone?: string;
    email?: string;
    serviceArea?: string;
    instagram?: string;
    facebook?: string;
    footerNote?: string;
    travelFee?: number;
    travelIncludedMinutes?: number;
    ivInfusionTime?: string;
    ivAppointmentTime?: string;
  } | null>(`*[_id == "siteSettings"][0]`, {}, ["siteSettings"]);
  const base = { ...fallback.siteSettings, email: CONTACT_EMAIL };
  if (!data) return base;
  const phoneDisplay = data.phone || base.phoneDisplay;
  return {
    phoneDisplay,
    phoneTel: `tel:${phoneDisplay.replace(/[^\d+]/g, "")}`,
    email: data.email || base.email,
    serviceArea: data.serviceArea || base.serviceArea,
    instagram: data.instagram || base.instagram,
    facebook: data.facebook || base.facebook,
    footerNote: data.footerNote || base.footerNote,
    travelFee: typeof data.travelFee === "number" ? data.travelFee : base.travelFee,
    travelIncludedMinutes: data.travelIncludedMinutes || base.travelIncludedMinutes,
    ivInfusionTime: data.ivInfusionTime || base.ivInfusionTime,
    ivAppointmentTime: data.ivAppointmentTime || base.ivAppointmentTime,
  };
}

export async function getServices(): Promise<Service[]> {
  const data = await fetchTagged<Service[]>(
    `*[_type == "service" && visible != false] | order(order asc, name asc){
      "id": _id, name, category, description, goodFor, price, "showPrice": coalesce(showPrice, false), optionName, optionPrice, ${imageProjection}
    }`,
    {},
    ["service"],
  );
  if (!data) return fallback.services;
  // Until Shary uploads her own, a service keeps the site's stock photo for its id.
  const stockPhoto = (id: string) => fallback.services.find((f) => f.id === id)?.image ?? null;
  return data.map((s) => ({ ...s, image: normalizeImage(s.image) ?? stockPhoto(s.id) }));
}

const addOnProjection = `{
  "id": _id, name, description, "durationMinutes": duration, price, enhancementPrice, "kind": coalesce(kind, "service"), ${imageProjection}
}`;

function normalizeAddOn(a: AddOn): AddOn {
  return { ...a, enhancementPrice: a.enhancementPrice ?? null, image: normalizeImage(a.image) };
}

export async function getAddOns(): Promise<AddOn[]> {
  const data = await fetchTagged<AddOn[]>(
    `*[_type == "addon" && visible != false] | order(order asc, name asc)${addOnProjection}`,
    {},
    ["addon"],
  );
  if (!data) return fallback.addOns;
  return data.map(normalizeAddOn);
}

/**
 * Checkout only. Reads add-ons live from Sanity (no CDN, no Next cache) so the
 * price charged always equals the price Shary last published.
 * Without Sanity configured, uses the local fallback list (still server-side).
 */
export async function getAddOnsForCheckout(ids: string[]): Promise<AddOn[]> {
  if (!liveClient) return fallback.addOns.filter((a) => ids.includes(a.id));
  const data = await liveClient.fetch<AddOn[]>(
    `*[_type == "addon" && visible != false && _id in $ids]${addOnProjection}`,
    { ids },
    { cache: "no-store" },
  );
  return data.map(normalizeAddOn);
}

/** Packages, with their items resolved against the current services and add-ons. */
export async function getPackages(): Promise<WellnessPackage[]> {
  const [data, services, addOns] = await Promise.all([
    fetchTagged<PackageSource[]>(
      `*[_type == "package" && visible != false && defined(slug.current)] | order(order asc, name asc){
        "id": _id, "slug": slug.current, name, type, price,
        "includes": includes[]._ref, "ivChoices": coalesce(ivChoices[]._ref, []),
        "bookingOpen": coalesce(bookingOpen, true)
      }`,
      {},
      ["package"],
    ),
    getServices(),
    getAddOns(),
  ]);
  return resolvePackages(data ?? fallback.packages, services, addOns);
}

export async function getPackage(slug: string): Promise<WellnessPackage | null> {
  return (await getPackages()).find((p) => p.slug === slug) ?? null;
}

export async function getUpcomingEvents(): Promise<EventItem[]> {
  const today = todayInFlorida();
  const data = await fetchTagged<EventItem[]>(
    `*[_type == "event" && visible != false && date >= $today] | order(date asc, startTime asc){
      "id": _id, "slug": slug.current, title, date, startTime, endTime, place, description, link, ${imageProjection}
    }`,
    { today },
    ["event"],
  );
  const list = data ?? fallback.events;
  return list
    .filter((e) => e.date >= today)
    .map((e) => ({ ...e, image: normalizeImage(e.image) }));
}

type PortableSpan = { _type: "span"; text: string; marks?: string[] };
type PortableBlock = {
  _type: string;
  style?: string;
  listItem?: "bullet" | "number";
  children?: PortableSpan[];
  markDefs?: { _key: string; _type: string; href?: string }[];
};

/** Converts Sanity's simple rich text into the small block format the site renders. */
function portableToBlocks(body: PortableBlock[] | undefined): RichBlock[] {
  const out: RichBlock[] = [];
  for (const block of body ?? []) {
    if (block._type !== "block") continue;
    const text = (block.children ?? []).map((c) => c.text).join("");
    const links = (block.children ?? []).flatMap((c) =>
      (c.marks ?? [])
        .map((m) => block.markDefs?.find((d) => d._key === m && d._type === "link"))
        .filter((d): d is { _key: string; _type: string; href: string } => Boolean(d?.href))
        .map((d) => ({ text: c.text, href: d.href })),
    );
    if (block.listItem) {
      const type = block.listItem === "number" ? "ol" : "ul";
      const last = out[out.length - 1];
      if (last && last.type === type) last.items.push(text);
      else out.push({ type, items: [text] });
      continue;
    }
    const type = block.style === "h2" || block.style === "h3" ? block.style : "p";
    out.push({ type, text, links: links.length ? links : undefined });
  }
  return out;
}

const articleProjection = `{
  "id": _id, "slug": slug.current, title, summary, body, "sources": coalesce(sources, []), "publishedAt": publishedAt, ${imageProjection}
}`;

type RawArticle = Omit<Article, "body"> & { body?: PortableBlock[] };

export async function getArticles(): Promise<Article[]> {
  const data = await fetchTagged<RawArticle[]>(
    `*[_type == "article" && visible != false && defined(slug.current)] | order(publishedAt desc)${articleProjection}`,
    {},
    ["article"],
  );
  if (!data) return fallback.articles;
  return data.map((a) => ({ ...a, body: portableToBlocks(a.body), image: normalizeImage(a.image) }));
}

export async function getArticle(slug: string): Promise<Article | null> {
  const all = await getArticles();
  return all.find((a) => a.slug === slug) ?? null;
}

export async function getFaqs(placement: FaqPlacement = "faq"): Promise<Faq[]> {
  const data = await fetchTagged<Faq[]>(
    `*[_type == "faq" && visible != false && coalesce(placement, "faq") == $placement] | order(order asc){ "id": _id, question, answer, placement }`,
    { placement },
    ["faq"],
  );
  return data ?? fallback.faqs.filter((f) => (f.placement ?? "faq") === placement);
}

export async function getTestimonials(): Promise<Testimonial[]> {
  const data = await fetchTagged<Testimonial[]>(
    `*[_type == "testimonial" && visible == true && permission == true]{ "id": _id, quote, firstName }`,
    {},
    ["testimonial"],
  );
  return data ?? fallback.testimonials;
}

/** Page headings and intros. Anything Shary leaves empty falls back to the default copy. */
export async function getPageText(page: PageKey): Promise<PageText> {
  const base = fallback.pageText[page];
  const data = await fetchTagged<{
    heading?: string;
    intro?: string;
    sections?: { key: string; heading?: string; text?: string }[];
  } | null>(`*[_id == $id][0]{ heading, intro, sections }`, { id: `pageText-${page}` }, ["pageText"]);
  if (!data) return base;
  const sections = { ...base.sections };
  for (const s of data.sections ?? []) {
    sections[s.key] = {
      heading: s.heading || base.sections[s.key]?.heading,
      text: s.text || base.sections[s.key]?.text,
    };
  }
  return { heading: data.heading || base.heading, intro: data.intro || base.intro, sections };
}

export type LegalPage = {
  title: string;
  lastUpdated: string | null; // YYYY-MM-DD
  showDraftNote: boolean;
  body: LegalBlock[];
};

/** Terms of use or Privacy notice. Until Shary publishes the page in Sanity, the default text shows. */
export async function getLegalPage(page: LegalPageKey): Promise<LegalPage> {
  const data = await fetchTagged<{
    title?: string;
    lastUpdated?: string;
    showDraftNote?: boolean;
    body?: LegalBlock[];
  } | null>(`*[_id == $id][0]{ title, lastUpdated, showDraftNote, body }`, { id: `legalPage-${page}` }, ["legalPage"]);
  const { email } = await getSiteSettings();
  const base = legalDefaults(email)[page];
  return {
    title: data?.title || base.title,
    lastUpdated: data?.lastUpdated || null,
    showDraftNote: data?.showDraftNote ?? true,
    body: data?.body?.length ? data.body : base.body,
  };
}

export const credentials = fallback.credentials;
