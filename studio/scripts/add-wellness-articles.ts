// One-off update for the November 2026 wellness education articles.
//
// 1. Adds "Mobile IV Hydration for Busy Schedules" (created only if it doesn't exist yet).
// 2. On "Understanding IV Therapy": sets the full title and adds the opening paragraph at
//    the top of the article. The rest of Shary's text is left alone.
// Values come from /content/fallback.ts, the same copy the website falls back to.
// Never deletes anything. Safe to run more than once.
//
// Dry run (default): prints what would change and writes nothing.
//   cd studio && npx sanity exec scripts/add-wellness-articles.ts --with-user-token
// Write the changes:
//   cd studio && npx sanity exec scripts/add-wellness-articles.ts --with-user-token -- --apply
//
// If a document has an unpublished draft, the draft gets the same change too, so publishing
// the draft later doesn't bring back the old version.

import * as content from "../../content/fallback.ts";
import type { RichBlock } from "../../src/lib/types.ts";

type Doc = { _id: string; _type: string; [key: string]: unknown };
type Span = { _type: "span"; _key: string; text: string; marks: string[] };
type PortableBlock = {
  _type: "block";
  _key: string;
  style: string;
  listItem?: "bullet" | "number";
  level?: number;
  markDefs: { _type: "link"; _key: string; href: string }[];
  children: Span[];
};

const APPLY = process.argv.slice(2).includes("--apply");

let keyCounter = 0;
const key = (prefix: string) => `${prefix}${(keyCounter++).toString(36).padStart(4, "0")}`;

function toPortable(blocks: RichBlock[], prefix: string): PortableBlock[] {
  return blocks.flatMap((b): PortableBlock[] => {
    if ("items" in b) {
      return b.items.map((text) => ({
        _type: "block",
        _key: key(prefix),
        style: "normal",
        listItem: b.type === "ol" ? "number" : "bullet",
        level: 1,
        markDefs: [],
        children: [{ _type: "span", _key: key(prefix), text, marks: [] }],
      }));
    }
    const style = b.type === "p" ? "normal" : b.type;
    // A link is shown as linked words inside the paragraph (Studio's link annotation).
    const link = b.links?.[0];
    const at = link ? b.text.indexOf(link.text) : -1;
    if (!link || at < 0) {
      return [
        { _type: "block", _key: key(prefix), style, markDefs: [], children: [{ _type: "span", _key: key(prefix), text: b.text, marks: [] }] },
      ];
    }
    const markKey = key(prefix);
    const parts = [
      { text: b.text.slice(0, at), marks: [] as string[] },
      { text: link.text, marks: [markKey] },
      { text: b.text.slice(at + link.text.length), marks: [] as string[] },
    ].filter((p) => p.text);
    return [
      {
        _type: "block",
        _key: key(prefix),
        style,
        markDefs: [{ _type: "link", _key: markKey, href: link.href.startsWith("/") ? SITE + link.href : link.href }],
        children: parts.map((p) => ({ _type: "span" as const, _key: key(prefix), ...p })),
      },
    ];
  });
}

const blockText = (b: unknown) =>
  ((b as { children?: { text?: string }[] }).children ?? []).map((c) => c.text ?? "").join("");

const article = (id: string) => content.articles.find((a) => a.id === id)!;

// The new article. Studio's link field needs a full address, so site links get the domain.
const SITE = "https://www.avidaluna.com";
const busy = article("article-mobile-iv-hydration-busy-schedules");
const busyDoc: Doc = {
  _id: busy.id,
  _type: "article",
  title: busy.title,
  slug: { _type: "slug", current: busy.slug },
  summary: busy.summary,
  body: toPortable(busy.body, "busy"),
  sources: [],
  publishedAt: busy.publishedAt,
  visible: true,
};

// The existing article: full title plus its opening paragraph.
const understanding = article("article-understanding-iv-therapy");
const intro = understanding.body[0] as Extract<RichBlock, { text: string }>;

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
  setIfMissing: (v: Record<string, unknown>) => PatchBuilder;
  insert: (at: "before" | "after", selector: string, items: unknown[]) => PatchBuilder;
};

async function main() {
  const { getCliClient } = await import("sanity/cli");
  const client = getCliClient({ apiVersion: "2026-10-01" }) as unknown as Client;
  const ids = [busy.id, understanding.id];
  const docs = await client.fetch<Doc[]>(`*[_id in $ids]`, { ids: [...ids, ...ids.map((id) => `drafts.${id}`)] });
  const byId = new Map(docs.map((d) => [d._id, d]));
  const tx = client.transaction();
  let changes = 0;
  console.log(APPLY ? "APPLYING changes:\n" : "DRY RUN (nothing is written). Planned changes:\n");

  // 1. New article.
  if (byId.has(busy.id) || byId.has(`drafts.${busy.id}`)) {
    console.log(`= article ${busy.id}: already exists, left as is`);
  } else {
    const other = await client.fetch<string | null>(`*[_type == "article" && slug.current == $slug][0]._id`, { slug: busy.slug });
    if (other) {
      console.log(`! another article (${other}) already uses /wellness-education/${busy.slug}: not created`);
    } else {
      changes++;
      console.log(`+ create article ${busy.id}`);
      console.log(`  title: ${busy.title}`);
      console.log(`  address: /wellness-education/${busy.slug}`);
      console.log(`  ${(busyDoc.body as unknown[]).length} text blocks, published ${busy.publishedAt}`);
      tx.createIfNotExists(busyDoc);
    }
  }

  // 2. Existing article.
  for (const id of [understanding.id, `drafts.${understanding.id}`]) {
    const doc = byId.get(id);
    const isDraft = id.startsWith("drafts.");
    if (!doc) {
      if (!isDraft) console.log(`! article ${id} not found: nothing to patch`);
      continue;
    }
    const label = `article ${id}${isDraft ? " (unpublished draft)" : ""}`;
    const body = (doc.body as unknown[] | undefined) ?? [];
    const needsTitle = doc.title !== understanding.title;
    const needsIntro = !body.some((b) => blockText(b).trim() === intro.text);
    if (!needsTitle && !needsIntro) {
      console.log(`= ${label}: already up to date`);
      continue;
    }
    changes++;
    console.log(`~ patch ${label}`);
    if (needsTitle) console.log(`  title: ${JSON.stringify(doc.title)} -> ${JSON.stringify(understanding.title)}`);
    if (needsIntro) console.log(`  body: add the opening paragraph at the top ("${intro.text.slice(0, 60)}…")`);
    tx.patch(id, (p) => {
      let q = p;
      if (needsTitle) q = q.set({ title: understanding.title });
      if (needsIntro) {
        const block = toPortable([intro], "intro");
        q = body.length ? q.insert("before", "body[0]", block) : q.setIfMissing({ body: [] }).insert("after", "body[-1]", block);
      }
      return q;
    });
  }

  if (!changes) {
    console.log("\nNothing to change.");
    return;
  }
  if (!APPLY) {
    console.log(`\n${changes} change(s) planned. Re-run with -- --apply to write them.`);
    return;
  }
  await tx.commit();
  console.log(`\nDone: ${changes} change(s) written. The site updates within a minute (webhook) or an hour at most.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
