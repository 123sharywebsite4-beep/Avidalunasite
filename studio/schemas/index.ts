import type { SchemaTypeDefinition } from "sanity";
import { addon } from "./addon";
import { article } from "./article";
import { event } from "./event";
import { faq } from "./faq";
import { wellnessPackage } from "./package";
import { pageText } from "./pageText";
import { service } from "./service";
import { siteSettings } from "./siteSettings";
import { testimonial } from "./testimonial";

export const schemaTypes: SchemaTypeDefinition[] = [
  service,
  addon,
  wellnessPackage,
  event,
  article,
  faq,
  pageText,
  siteSettings,
  testimonial,
];

/** One-of-a-kind documents: no "create new", no delete, no duplicate. */
export const SINGLETON_TYPES = new Set(["siteSettings", "pageText"]);
