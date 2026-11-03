export type ImageRef = {
  /** Sanity image asset reference, or a local /public path. */
  src: string;
  alt: string;
  width?: number;
  height?: number;
} | null;

export type ServiceCategory = "iv" | "boost" | "vitamin" | "consultation";

export type Service = {
  id: string;
  name: string;
  category: ServiceCategory;
  description: string;
  /** Short "Good for" line on drip cards, e.g. "Training · Recovery days". */
  goodFor?: string | null;
  price: number | null;
  showPrice: boolean;
  /** One upgrade shown on the same card, e.g. Myers "With chromium" at $240. */
  optionName?: string | null;
  optionPrice?: number | null;
  image: ImageRef;
  todo?: string;
};

/** A restorative service (red light, boots, aromatherapy) or take-home product (spray). Non-medical. */
export type AddOnKind = "service" | "product";

export type AddOn = {
  id: string;
  name: string;
  description: string;
  /** Appointment time it adds. Null when it adds none (aromatherapy runs alongside; products). */
  durationMinutes: number | null;
  /** Standalone price: booked on its own, or the spray bought on its own. */
  price: number;
  /** Lower price when added to an existing appointment or package. Falls back to `price`. */
  enhancementPrice: number | null;
  kind: AddOnKind;
  image: ImageRef;
  todo?: string;
};

export type PackageType = "restorative" | "iv" | "injection";

/** One thing a package includes: a medical service (booked on Hydreight) or a restorative item. */
export type PackageItem = {
  id: string;
  name: string;
  /** "medical" = an IV or IM injection, paid on Hydreight. */
  kind: "medical" | "restorative";
  price: number | null;
  durationMinutes: number | null;
};

export type WellnessPackage = {
  id: string;
  slug: string;
  name: string;
  type: PackageType;
  includes: PackageItem[];
  /** IVs the client chooses between on Hydreight. Never asked on this website. */
  ivChoices: PackageItem[];
  price: number;
  bookingOpen: boolean;
};

export type EventItem = {
  id: string;
  slug: string;
  title: string;
  date: string; // YYYY-MM-DD
  startTime: string | null; // HH:mm
  endTime: string | null;
  place: string;
  description: string;
  link: string | null;
  image: ImageRef;
};

export type RichBlock =
  | { type: "h2" | "h3" | "p"; text: string; links?: { text: string; href: string }[] }
  | { type: "ul" | "ol"; items: string[] };

export type Article = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  body: RichBlock[];
  sources: { title: string; url: string }[];
  image: ImageRef;
  publishedAt: string; // YYYY-MM-DD
  todo?: string;
};

/** Where a question shows: the FAQ page (default) or the Services page. */
export type FaqPlacement = "faq" | "services";

export type Faq = { id: string; question: string; answer: string; placement?: FaqPlacement; todo?: string };

export type Testimonial = { id: string; quote: string; firstName: string };

export type SiteSettings = {
  phoneDisplay: string;
  phoneTel: string;
  email: string;
  serviceArea: string;
  instagram: string | null;
  facebook: string | null;
  footerNote: string;
  /** Restorative-only appointments: charged once per appointment. */
  travelFee: number;
  /** IV appointments: travel is included within this one-way drive time. */
  travelIncludedMinutes: number;
  /** e.g. "About 35–40 minutes". */
  ivInfusionTime: string;
  /** The whole IV appointment (consultation, setup, enhancements), shown separately from the infusion. */
  ivAppointmentTime: string;
  leadMagnet: LeadMagnetContent;
};

/** The free-guide email signup block (Sanity: Contact info → Free guide signup). */
export type LeadMagnetContent = {
  /** Off unless Shary turns it on in Studio. */
  enabled: boolean;
  heading: string;
  description: string;
  buttonLabel: string;
  successMessage: string;
};

export type PageSection = { heading?: string; text?: string };
export type PageText = { heading: string; intro: string; sections: Record<string, PageSection> };

export type PageKey =
  | "home"
  | "services"
  | "packages"
  | "addons"
  | "events"
  | "education"
  | "about"
  | "faq"
  | "contact"
  | "book"
  | "join";
