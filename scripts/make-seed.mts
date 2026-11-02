// Builds /studio/seed/seed.ndjson from /content/fallback.ts (the approved copy deck).
// Run: npm run seed:build   then import with:   cd studio && npm run seed
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as content from "../content/fallback.ts";

let keyCounter = 0;
const key = () => `k${(keyCounter++).toString(36).padStart(4, "0")}`;

const docs: Record<string, unknown>[] = [];

docs.push({
  _id: "siteSettings",
  _type: "siteSettings",
  phone: content.siteSettings.phoneDisplay,
  email: content.siteSettings.email,
  serviceArea: content.siteSettings.serviceArea,
  footerNote: content.siteSettings.footerNote,
  travelFee: content.siteSettings.travelFee,
  travelIncludedMinutes: content.siteSettings.travelIncludedMinutes,
  ivInfusionTime: content.siteSettings.ivInfusionTime,
  ivAppointmentTime: content.siteSettings.ivAppointmentTime,
});

// Placeholder cards that exist only to show a TODO on the preview are not seeded.
content.services
  .filter((s) => !s.id.startsWith("service-todo"))
  .forEach((s, i) =>
    docs.push({
      _id: s.id,
      _type: "service",
      name: s.name,
      category: s.category,
      description: s.description,
      ...(s.goodFor ? { goodFor: s.goodFor } : {}),
      ...(s.price ? { price: s.price } : {}),
      ...(s.optionName && s.optionPrice ? { optionName: s.optionName, optionPrice: s.optionPrice } : {}),
      showPrice: s.showPrice,
      order: i + 1,
      visible: true,
    }),
  );

content.addOns.forEach((a, i) =>
  docs.push({
    _id: a.id,
    _type: "addon",
    name: a.name,
    description: a.description,
    kind: a.kind,
    ...(a.durationMinutes ? { duration: a.durationMinutes } : {}),
    price: a.price,
    ...(a.enhancementPrice ? { enhancementPrice: a.enhancementPrice } : {}),
    order: i + 1,
    visible: true,
  }),
);

const ref = (id: string) => ({ _key: id, _type: "reference", _ref: id });
content.packages.forEach((p, i) =>
  docs.push({
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
  }),
);

content.articles.forEach((a) =>
  docs.push({
    _id: a.id,
    _type: "article",
    title: a.title,
    slug: { _type: "slug", current: a.slug },
    summary: a.summary,
    body: a.body.flatMap((b) =>
      "items" in b
        ? b.items.map((text) => ({
            _type: "block",
            _key: key(),
            style: "normal",
            listItem: b.type === "ol" ? "number" : "bullet",
            level: 1,
            markDefs: [],
            children: [{ _type: "span", _key: key(), text, marks: [] }],
          }))
        : [
            {
              _type: "block",
              _key: key(),
              style: b.type === "p" ? "normal" : b.type,
              markDefs: [],
              children: [{ _type: "span", _key: key(), text: b.text, marks: [] }],
            },
          ],
    ),
    sources: a.sources.map((s) => ({ _key: key(), ...s })),
    publishedAt: a.publishedAt,
    visible: true,
  }),
);

content.faqs.forEach((f, i) =>
  docs.push({ _id: f.id, _type: "faq", question: f.question, answer: f.answer, placement: f.placement ?? "faq", order: i + 1, visible: true }),
);

for (const [page, text] of Object.entries(content.pageText)) {
  docs.push({
    _id: `pageText-${page}`,
    _type: "pageText",
    page,
    heading: text.heading,
    intro: text.intro,
    sections: Object.entries(text.sections).map(([k, s]) => ({
      _key: k,
      key: k,
      ...(s.heading ? { heading: s.heading } : {}),
      ...(s.text ? { text: s.text } : {}),
    })),
  });
}

const out = fileURLToPath(new URL("../studio/seed/seed.ndjson", import.meta.url));
writeFileSync(out, docs.map((d) => JSON.stringify(d)).join("\n") + "\n");
console.log(`Wrote ${docs.length} documents to studio/seed/seed.ndjson`);
