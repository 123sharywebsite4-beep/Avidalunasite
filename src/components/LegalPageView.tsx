import Link from "next/link";
import type { ReactNode } from "react";
import type { LegalBlock, LegalSpan } from "@content/legal";
import type { LegalPage } from "@/lib/content";

function Span({ span, block }: { span: LegalSpan; block: LegalBlock }) {
  let out: ReactNode = span.text;
  if (span.marks.includes("strong")) out = <strong>{out}</strong>;
  const link = block.markDefs.find((d) => d._type === "link" && span.marks.includes(d._key));
  if (link?.href) {
    out = link.href.startsWith("/") ? (
      <Link href={link.href}>{out}</Link>
    ) : (
      <a href={link.href} rel={link.href.startsWith("http") ? "noopener" : undefined}>
        {out}
      </a>
    );
  }
  return <>{out}</>;
}

function Text({ block }: { block: LegalBlock }) {
  return (
    <>
      {block.children.map((span) => (
        <Span key={span._key} span={span} block={block} />
      ))}
    </>
  );
}

/** Groups list items that follow each other into one <ul> or <ol>. */
function groupBlocks(body: LegalBlock[]) {
  const groups: (LegalBlock | { list: "bullet" | "number"; key: string; items: LegalBlock[] })[] = [];
  for (const block of body) {
    if (block._type !== "block") continue;
    const last = groups[groups.length - 1];
    if (block.listItem) {
      if (last && "list" in last && last.list === block.listItem) last.items.push(block);
      else groups.push({ list: block.listItem, key: block._key, items: [block] });
    } else groups.push(block);
  }
  return groups;
}

function formatDate(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    timeZone: "UTC",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function LegalPageView({ page }: { page: LegalPage }) {
  return (
    <article className="reading-page container-page py-12 md:py-16">
      <div className="prose-width mx-auto space-y-4">
        {page.showDraftNote ? (
          <p className="legal-review-note rounded-lg border-2 border-dashed border-[#8a6d1f] bg-[#fff8e1] px-3 py-2 text-sm text-[#4a3b10]">
            <strong>Draft, needs review by a lawyer.</strong> Not final.
          </p>
        ) : null}
        <h1 className="text-4xl md:text-5xl">{page.title}</h1>
        {page.lastUpdated ? (
          <p className="text-sm text-muted">Last updated {formatDate(page.lastUpdated)}</p>
        ) : null}
        {groupBlocks(page.body).map((g) => {
          if ("list" in g) {
            const List = g.list === "number" ? "ol" : "ul";
            return (
              <List
                key={g.key}
                className={`space-y-1 pl-6 ${g.list === "number" ? "list-decimal" : "list-disc"}`}
              >
                {g.items.map((item) => (
                  <li key={item._key}>
                    <Text block={item} />
                  </li>
                ))}
              </List>
            );
          }
          if (g.style === "h2")
            return (
              <h2 key={g._key} className="pt-4 text-2xl">
                <Text block={g} />
              </h2>
            );
          if (g.style === "h3")
            return (
              <h3 key={g._key} className="pt-2 text-xl">
                <Text block={g} />
              </h3>
            );
          return (
            <p key={g._key}>
              <Text block={g} />
            </p>
          );
        })}
      </div>
    </article>
  );
}
