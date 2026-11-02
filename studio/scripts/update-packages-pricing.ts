// One-off update for Shary's November 2026 pricing, packages and booking rules.
//
// Creates or patches ONLY the documents and fields in that spec, so the rest of Shary's edits
// are kept. Never deletes anything (the old "Recovery add-on" placeholder is hidden, not deleted).
// Values come from /content/fallback.ts, the same copy the website falls back to.
//
// Dry run (default): prints what would change, field by field, and writes nothing.
//   cd studio && npx sanity exec scripts/update-packages-pricing.ts --with-user-token
// Write the changes:
//   cd studio && npx sanity exec scripts/update-packages-pricing.ts --with-user-token -- --apply
// Offline check against an export (never writes):
//   node scripts/update-packages-pricing.ts --from-ndjson <export.ndjson>
//
// If a document has an unpublished draft, the same fields are patched on the draft too, so
// publishing the draft later doesn't bring back the old values.

import { readFileSync } from "node:fs";
import * as content from "../../content/fallback.ts";

type Doc = { _id: string; _type: string; [key: string]: unknown };
type Plan = {
  id: string;
  type: string;
  /** Full document to create if it doesn't exist yet. */
  create?: Doc;
  /** Fields (or paths) to set when it exists. */
  set?: Record<string, unknown>;
  unset?: string[];
  /** pageText sections by key: heading/text to set, created if the section is missing. */
  sections?: Record<string, { heading?: string; text?: string }>;
};

const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const ndjsonAt = args.indexOf("--from-ndjson");
const NDJSON = ndjsonAt >= 0 ? args[ndjsonAt + 1] : null;

// ---------------------------------------------------------------------------------------------
// The spec
// ---------------------------------------------------------------------------------------------

const ref = (id: string) => ({ _key: id, _type: "reference", _ref: id });
const service = (id: string) => content.services.find((s) => s.id === id)!;
const addOn = (id: string) => content.addOns.find((a) => a.id === id)!;
const faq = (id: string) => content.faqs.find((f) => f.id === id)!;

const plans: Plan[] = [];

// 1. Service names and prices (descriptions and photos untouched).
for (const id of [
  "service-recovery",
  "service-energy",
  "service-athlete-recovery",
  "service-reset",
  "boost-b12",
  "boost-b-complex",
  "boost-glutathione",
  "service-b12",
  "service-b-complex",
  "service-glutathione",
]) {
  const s = service(id);
  plans.push({ id, type: "service", set: { name: s.name, price: s.price } });
}
{
  const s = service("service-myers");
  plans.push({
    id: s.id,
    type: "service",
    set: { name: s.name, price: s.price, optionName: s.optionName, optionPrice: s.optionPrice },
  });
}
{
  const s = service("service-migraine");
  plans.push({
    id: s.id,
    type: "service",
    create: {
      _id: s.id,
      _type: "service",
      name: s.name,
      category: s.category,
      description: s.description,
      price: s.price,
      showPrice: s.showPrice,
      order: 5,
      visible: true,
    },
    set: { name: s.name, price: s.price },
  });
}

// 1b. Restorative services and products.
for (const id of ["addon-red-light", "addon-aromatherapy", "addon-compression-boots", "addon-vitamin-spray"]) {
  const a = addOn(id);
  const fields = {
    name: a.name,
    kind: a.kind,
    price: a.price,
    enhancementPrice: a.enhancementPrice,
    ...(a.durationMinutes ? { duration: a.durationMinutes } : {}),
  };
  plans.push({
    id,
    type: "addon",
    create: { _id: id, _type: "addon", ...fields, description: a.description, order: content.addOns.indexOf(a) + 1, visible: true },
    set: {
      ...fields,
      // Aromatherapy: the old 45-minute duration goes, and the description carries the new wording.
      ...(id === "addon-aromatherapy" ? { description: a.description } : {}),
    },
    unset: a.durationMinutes ? [] : ["duration"],
  });
}
// The "Recovery add-on" placeholder is replaced by compression boots: hidden, not deleted.
plans.push({ id: "addon-recovery-ritual", type: "addon", set: { visible: false } });

// 2. Packages.
content.packages.forEach((p, i) => {
  const doc: Doc = {
    _id: p.id,
    _type: "package",
    name: p.name,
    slug: { _type: "slug", current: p.slug },
    type: p.type,
    includes: p.includes.map(ref),
    ...(p.ivChoices?.length ? { ivChoices: p.ivChoices.map(ref) } : {}),
    price: p.price,
    bookingOpen: p.bookingOpen,
    order: i + 1,
    visible: true,
  };
  const { _id, _type, order, visible, ...fields } = doc;
  void _id;
  void _type;
  void order;
  void visible;
  plans.push({ id: p.id, type: "package", create: doc, set: fields });
});

// 3. Travel and timing (siteSettings).
plans.push({
  id: "siteSettings",
  type: "siteSettings",
  set: {
    travelFee: content.siteSettings.travelFee,
    travelIncludedMinutes: content.siteSettings.travelIncludedMinutes,
    ivInfusionTime: content.siteSettings.ivInfusionTime,
    ivAppointmentTime: content.siteSettings.ivAppointmentTime,
  },
});

// 5. FAQ answers that show these prices, durations or travel wording.
for (const id of [
  "faq-services",
  "faq-cost",
  "faq-book",
  "faq-pay",
  "faq-addons",
  "faq-length",
  "faq-travel",
  "faq-svc-choose",
  "faq-svc-myers",
  "faq-svc-b12",
  "faq-svc-add-ins",
]) {
  const f = faq(id);
  plans.push({ id, type: "faq", set: { question: f.question, answer: f.answer } });
}
{
  const f = faq("faq-packages");
  plans.push({
    id: f.id,
    type: "faq",
    create: { _id: f.id, _type: "faq", question: f.question, answer: f.answer, placement: "faq", order: content.faqs.indexOf(f) + 1, visible: true },
    set: { question: f.question, answer: f.answer },
  });
}

// 5b. Page text that mentions these services, prices or the add-ons.
const pt = content.pageText;
plans.push({
  id: "pageText-services",
  type: "pageText",
  sections: {
    iv: pt.services.sections.iv,
    boost: pt.services.sections.boost,
    vitamin: pt.services.sections.vitamin,
    packages: pt.services.sections.packages,
    addons: pt.services.sections.addons,
  },
});
plans.push({ id: "pageText-addons", type: "pageText", set: { heading: pt.addons.heading, intro: pt.addons.intro } });
plans.push({ id: "pageText-book", type: "pageText", set: { intro: pt.book.intro } });
plans.push({
  id: "pageText-packages",
  type: "pageText",
  create: {
    _id: "pageText-packages",
    _type: "pageText",
    page: "packages",
    heading: pt.packages.heading,
    intro: pt.packages.intro,
    sections: Object.entries(pt.packages.sections).map(([k, s]) => ({ _key: k, key: k, ...s })),
  },
  set: { heading: pt.packages.heading, intro: pt.packages.intro },
  sections: pt.packages.sections,
});

// ---------------------------------------------------------------------------------------------
// Diff and apply
// ---------------------------------------------------------------------------------------------

type Section = { _key: string; key?: string; heading?: string; text?: string };
type Ops = { set: Record<string, unknown>; unset: string[]; insertSections: Section[] };

const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
const show = (v: unknown) => {
  const s = v === undefined ? "(empty)" : JSON.stringify(v);
  return s.length > 140 ? `${s.slice(0, 137)}...` : s;
};

/** What has to change on one existing document. Only fields that differ. */
function diff(plan: Plan, doc: Doc): { ops: Ops; lines: string[] } {
  const ops: Ops = { set: {}, unset: [], insertSections: [] };
  const lines: string[] = [];
  for (const [field, value] of Object.entries(plan.set ?? {})) {
    if (value === undefined || value === null) continue;
    if (!same(doc[field], value)) {
      ops.set[field] = value;
      lines.push(`  ${field}: ${show(doc[field])} -> ${show(value)}`);
    }
  }
  for (const field of plan.unset ?? []) {
    if (doc[field] !== undefined) {
      ops.unset.push(field);
      lines.push(`  ${field}: ${show(doc[field])} -> (removed)`);
    }
  }
  const existing = (doc.sections as Section[] | undefined) ?? [];
  for (const [key, wanted] of Object.entries(plan.sections ?? {})) {
    const section = existing.find((s) => (s.key ?? s._key) === key);
    if (!section) {
      ops.insertSections.push({ _key: key, key, ...wanted });
      lines.push(`  sections.${key}: (missing) -> ${show(wanted)}`);
      continue;
    }
    for (const f of ["heading", "text"] as const) {
      if (wanted[f] && !same(section[f], wanted[f])) {
        ops.set[`sections[_key=="${section._key}"].${f}`] = wanted[f];
        lines.push(`  sections.${key}.${f}: ${show(section[f])} -> ${show(wanted[f])}`);
      }
    }
  }
  return { ops, lines };
}

/** Scans for leftover "45 minutes" aromatherapy wording that isn't in a field this script owns. */
function leftovers(docs: Doc[]): string[] {
  return docs
    .filter((d) => /aromatherapy/i.test(JSON.stringify(d)) && /45[\s-]*(min|minute)/i.test(JSON.stringify(d)))
    .map((d) => d._id);
}

type Client = {
  fetch: <T>(query: string, params?: Record<string, unknown>) => Promise<T>;
  transaction: () => {
    createIfNotExists: (doc: Doc) => unknown;
    patch: (id: string, fn: (p: PatchBuilder) => PatchBuilder) => unknown;
    commit: () => Promise<unknown>;
  };
};
type PatchBuilder = {
  set: (v: Record<string, unknown>) => PatchBuilder;
  unset: (v: string[]) => PatchBuilder;
  setIfMissing: (v: Record<string, unknown>) => PatchBuilder;
  insert: (at: "after", selector: string, items: unknown[]) => PatchBuilder;
};

async function loadDocs(client: Client | null, ids: string[]): Promise<Doc[]> {
  if (NDJSON) {
    return readFileSync(NDJSON, "utf8")
      .split("\n")
      .filter(Boolean)
      .map((l) => JSON.parse(l) as Doc);
  }
  const all = [...ids, ...ids.map((id) => `drafts.${id}`)];
  // Plus every content document, only to look for leftover "45 minutes" aromatherapy wording.
  return client!.fetch<Doc[]>(`*[_id in $ids || _type in ["service", "addon", "faq", "pageText", "article", "event"]]`, {
    ids: all,
  });
}

async function main() {
  let client: Client | null = null;
  if (!NDJSON) {
    const { getCliClient } = await import("sanity/cli");
    client = getCliClient({ apiVersion: "2026-10-01" }) as unknown as Client;
  }
  const docs = await loadDocs(client, plans.map((p) => p.id));
  const byId = new Map(docs.map((d) => [d._id, d]));

  const tx = client?.transaction();
  let changes = 0;
  console.log(APPLY && !NDJSON ? "APPLYING changes:\n" : "DRY RUN (nothing is written). Planned changes:\n");

  for (const plan of plans) {
    for (const id of [plan.id, `drafts.${plan.id}`]) {
      const doc = byId.get(id);
      const isDraft = id.startsWith("drafts.");
      if (!doc) {
        if (!isDraft && plan.create) {
          changes++;
          console.log(`+ create ${plan.type} ${id}`);
          for (const [k, v] of Object.entries(plan.create)) if (!k.startsWith("_")) console.log(`  ${k}: ${show(v)}`);
          tx?.createIfNotExists(plan.create);
        } else if (!isDraft) {
          console.log(`! ${plan.type} ${id} not found: nothing to patch`);
        }
        continue;
      }
      const { ops, lines } = diff(plan, doc);
      if (!lines.length) {
        if (!isDraft) console.log(`= ${plan.type} ${id}: already up to date`);
        continue;
      }
      changes++;
      console.log(`~ patch ${plan.type} ${id}${isDraft ? " (unpublished draft)" : ""}`);
      for (const l of lines) console.log(l);
      tx?.patch(id, (p) => {
        let q = p;
        if (Object.keys(ops.set).length) q = q.set(ops.set);
        if (ops.unset.length) q = q.unset(ops.unset);
        if (ops.insertSections.length) q = q.setIfMissing({ sections: [] }).insert("after", "sections[-1]", ops.insertSections);
        return q;
      });
    }
  }

  const stale = leftovers(docs);
  if (stale.length) {
    console.log(`\nCheck by hand: these still mention aromatherapy with "45 minutes": ${stale.join(", ")}`);
  }

  console.log(`\n${changes} document${changes === 1 ? "" : "s"} to create or patch.`);
  if (!APPLY || NDJSON || !tx) {
    console.log(NDJSON ? "Offline check: nothing written." : "Dry run only. Re-run with `-- --apply` to write these changes.");
    return;
  }
  if (!changes) return;
  await tx.commit();
  console.log("Done. The site refreshes within about a minute (Sanity webhook).");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
