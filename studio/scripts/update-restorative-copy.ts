// One-off copy update for restorative visits booked (and, with Stripe on, paid) on /book/restorative.
//
// Changes six text fields that still say restorative visits are "paid at your visit", a "request with
// a few preferred times", or "book directly with Shary". The new wording is true whether online
// payment is on or off, because Sanity text can't change with the site's payment setting.
// Values come from /content/fallback.ts, the same copy the website falls back to.
//
// Safe with Shary's edits: a field is changed only if it still holds the old default text (or is
// empty). If she has rewritten it, the script leaves it alone and prints the suggested text instead.
// Never creates or deletes documents.
//
// Dry run (default): prints what would change, field by field, and writes nothing.
//   cd studio && npx sanity exec scripts/update-restorative-copy.ts --with-user-token
// Write the changes:
//   cd studio && npx sanity exec scripts/update-restorative-copy.ts --with-user-token -- --apply
// Offline check against an export or the seed (never writes):
//   node studio/scripts/update-restorative-copy.ts --from-ndjson studio/seed/seed.ndjson
//
// If a document has an unpublished draft, the draft is updated too (same rule), so publishing the
// draft later doesn't bring back the old text.

import { readFileSync } from "node:fs";
import * as content from "../../content/fallback.ts";

type Doc = { _id: string; _type: string; [key: string]: unknown };
type Section = { _key: string; key?: string; heading?: string; text?: string };

const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const ndjsonAt = args.indexOf("--from-ndjson");
const NDJSON = ndjsonAt >= 0 ? args[ndjsonAt + 1] : null;

const faq = (id: string) => content.faqs.find((f) => f.id === id)!.answer;

/** One text field: where it is, the old default it replaces, and the new text. */
type Change = { id: string; field: string; section?: string; old: string; new: string; why: string };

const CHANGES: Change[] = [
  {
    id: "faq-book",
    field: "answer",
    old: "For an IV, tap Book and share your name and email. You'll get your booking link right away, then pick your services, a time, and complete your screening and payment on our secure, HIPAA-compliant booking page. Once Shary reviews your screening, you'll be asked to get cleared by our medical provider before your visit. Optional enhancements come after. For red light, compression boots or aromatherapy on their own, send a restorative visit request with a few preferred times and Shary will confirm by text or email.",
    new: faq("faq-book"),
    why: 'restorative visits are booked with one date and time, not "a few preferred times"',
  },
  {
    id: "faq-pay",
    field: "answer",
    old: "IVs and IM injections are booked and paid on our secure, HIPAA-compliant booking page. Restorative services, enhancements and the Vitamin Wellness Spray are paid at your visit, by tap to pay or card. For a package that includes an IV, you pay the IV's price on the booking page and the rest of the package price at your visit.",
    new: faq("faq-pay"),
    why: 'restorative-only visits are paid online once Stripe is on, not always "at your visit"',
  },
  {
    id: "faq-addons",
    field: "answer",
    old: "Yes. Added to an appointment you've already booked, they're enhancement prices: targeted red light (15 minutes) $25, compression boots (30 minutes) $35, aromatherapy $15, and the take-home Vitamin Wellness Spray $35. Booked on their own they're $29, $39 and $20, and the spray is $37. Aromatherapy — duration is based on your selected service and continues throughout that service. Pay at your visit.",
    new: faq("faq-addons"),
    why: '"Pay at your visit" also read as covering services booked on their own',
  },
  {
    id: "faq-cancel",
    field: "answer",
    old: "Our cancellation and refund policy will be posted here.",
    new: faq("faq-cancel"),
    why: "adds the full-refund promise the booking page now makes (the full policy is still a TODO from Shary)",
  },
  {
    id: "pageText-packages",
    field: "text",
    section: "restorative",
    old: "Red light, compression boots and aromatherapy. No IVs or injections, so you book directly with Shary.",
    new: content.pageText.packages.sections.restorative.text!,
    why: '"book directly with Shary" no longer describes booking on the website',
  },
  {
    id: "pageText-services",
    field: "text",
    section: "addons",
    old: "Book them on their own, or add them to an appointment at the lower enhancement price. Paid at your visit.",
    new: content.pageText.services.sections.addons.text!,
    why: 'payment wording moved into the page code, where it follows the payment setting; "Paid at your visit." would be wrong with Stripe on',
  },
];

/** Legal pages: rich text Shary publishes herself. Only checked, never changed. */
const LEGAL_IDS = ["legalPage-terms", "legalPage-privacy"];
const LEGAL_STALE = [/paid at your visit/i, /two or three preferred/i, /restorative visit request/i];

type Client = {
  fetch: <T>(query: string, params?: Record<string, unknown>) => Promise<T>;
  transaction: () => {
    patch: (id: string, fn: (p: { set: (v: Record<string, unknown>) => unknown }) => unknown) => unknown;
    commit: () => Promise<unknown>;
  };
};

async function loadDocs(client: Client | null): Promise<Doc[]> {
  if (NDJSON) {
    return readFileSync(NDJSON, "utf8")
      .split("\n")
      .filter(Boolean)
      .map((l) => JSON.parse(l) as Doc);
  }
  const ids = [...new Set([...CHANGES.map((c) => c.id), ...LEGAL_IDS])];
  return client!.fetch<Doc[]>(`*[_id in $ids]`, { ids: [...ids, ...ids.map((id) => `drafts.${id}`)] });
}

const short = (s: unknown) => (typeof s === "string" ? JSON.stringify(s.length > 90 ? `${s.slice(0, 87)}...` : s) : String(s));

async function main() {
  let client: Client | null = null;
  if (!NDJSON) {
    const { getCliClient } = await import("sanity/cli");
    client = getCliClient({ apiVersion: "2026-10-01" }) as unknown as Client;
  }
  const docs = await loadDocs(client);
  const byId = new Map(docs.map((d) => [d._id, d]));
  const tx = APPLY && !NDJSON ? client!.transaction() : null;
  let changes = 0;
  const byHand: string[] = [];

  console.log(tx ? "APPLYING changes:\n" : "DRY RUN (nothing is written). Planned changes:\n");

  for (const change of CHANGES) {
    for (const id of [change.id, `drafts.${change.id}`]) {
      const doc = byId.get(id);
      if (!doc) {
        if (id === change.id) console.log(`! ${change.id} not found: nothing to change (the site uses its default text)`);
        continue;
      }
      let path = change.field;
      let current: unknown = doc[change.field];
      if (change.section) {
        const section = ((doc.sections as Section[] | undefined) ?? []).find((s) => (s.key ?? s._key) === change.section);
        if (!section) {
          console.log(`! ${id}: no "${change.section}" section: nothing to change (the site uses its default text)`);
          continue;
        }
        path = `sections[_key=="${section._key}"].${change.field}`;
        current = section[change.field as "text"];
      }
      const label = `${id} ${change.section ? `sections.${change.section}.` : ""}${change.field}`;
      if (current === change.new) {
        console.log(`= ${label}: already up to date`);
        continue;
      }
      if (current && current !== change.old) {
        byHand.push(`${label}\n    Shary's text: ${short(current)}\n    Suggested:    ${JSON.stringify(change.new)}\n    Why: ${change.why}`);
        continue;
      }
      changes++;
      console.log(`~ ${label}\n    ${short(current)}\n -> ${short(change.new)}\n    Why: ${change.why}`);
      tx?.patch(id, (p) => p.set({ [path]: change.new }));
    }
  }

  for (const id of LEGAL_IDS) {
    for (const docId of [id, `drafts.${id}`]) {
      const doc = byId.get(docId);
      if (!doc) continue;
      const text = JSON.stringify(doc.body ?? "");
      const stale = LEGAL_STALE.filter((r) => r.test(text));
      if (stale.length) {
        byHand.push(
          `${docId} (published in Sanity, so the site shows it instead of the new default text)\n    Still says: ${stale.map((r) => r.source.replace(/\\/g, "")).join("; ")}\n    Compare with content/legal.ts and update it in the Studio.`,
        );
      }
    }
  }

  if (byHand.length) {
    console.log(`\nCheck by hand (edited in Sanity, so not changed by this script):\n\n${byHand.map((l) => `- ${l}`).join("\n\n")}`);
  }

  console.log(`\n${changes} field${changes === 1 ? "" : "s"} to change.`);
  if (!tx) {
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
