// Words that can sound like a medical claim, plus prescription and peptide names.
// Used for soft WARNINGS in the editor (never errors), and by the site's Playwright
// test that scans every rendered page for these words (tests/compliance.spec.ts).
//
// TODO (Abe): add the exact three prescription medication names her current site lists as IV add-ons.
export const COMPLIANCE_WORDS = [
  "cure",
  "cures",
  "treat",
  "treats",
  "treatment",
  "heal",
  "heals",
  "prevent",
  "prevents",
  "detox",
  "detoxification",
  "immunity",
  "immune",
  "migraine",
  "hangover",
  "inflammation",
  "blood pressure",
  "anxiety",
  "disease",
  "guaranteed",
  "guarantee",
  // Prescription medications commonly offered as IV add-ons.
  "zofran",
  "ondansetron",
  "toradol",
  "ketorolac",
  "pepcid",
  "famotidine",
  "benadryl",
  "diphenhydramine",
  "dexamethasone",
  // Peptides and prescription weight-loss medications.
  "peptide",
  "peptides",
  "semaglutide",
  "ozempic",
  "wegovy",
  "tirzepatide",
  "mounjaro",
  "zepbound",
  "bpc-157",
  "tb-500",
  "sermorelin",
  "ipamorelin",
  "cjc-1295",
];

/**
 * CLIENT-APPROVED exceptions. Shary chose these exact service names herself; medical wording
 * is her responsibility under our agreement. Only these exact names (same spelling and case)
 * are skipped: the words inside them ("detox", "hangover", "migraine") are still flagged
 * everywhere else, including in descriptions and anywhere these names are reworded.
 * Studio may still warn on the name field; that's expected.
 */
export const ALLOWED_SERVICE_NAMES = ["Detox/Hangover IV", "Migraine IV"] as const;

export const COMPLIANCE_WARNING =
  "This word can sound like a medical claim. Please reword it or check it before publishing.";

function escape(word: string) {
  return word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const pattern = new RegExp(`(^|[^a-z0-9])(${COMPLIANCE_WORDS.map(escape).join("|")})(?=$|[^a-z0-9])`, "i");

export function findComplianceWord(text: string | undefined | null): string | null {
  if (!text) return null;
  let checked = text;
  for (const name of ALLOWED_SERVICE_NAMES) checked = checked.split(name).join(" ");
  const match = pattern.exec(checked);
  return match ? match[2] : null;
}

type Block = { _type?: string; children?: { text?: string }[] };

export function portableTextToPlain(blocks: Block[] | undefined): string {
  return (blocks ?? []).map((b) => (b.children ?? []).map((c) => c.text ?? "").join("")).join("\n");
}

/** Sanity custom validator: returns a warning message (not an error) when a flagged word appears. */
export function complianceCheck(value: unknown) {
  const text = Array.isArray(value) ? portableTextToPlain(value as Block[]) : (value as string | undefined);
  const word = findComplianceWord(text);
  return word ? `“${word}”: ${COMPLIANCE_WARNING}` : true;
}
