/**
 * Renders an FAQ answer. Plain text becomes paragraphs; lines starting with "* ", "- " or "• "
 * become a bulleted list, so editors can write a list in the Sanity text field.
 */
export function FaqAnswer({ text }: { text: string }) {
  const blocks: ({ type: "p"; text: string } | { type: "ul"; items: string[] })[] = [];
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const bullet = line.match(/^[*\-•]\s+(.*)$/);
    const last = blocks[blocks.length - 1];
    if (bullet) {
      if (last?.type === "ul") last.items.push(bullet[1]);
      else blocks.push({ type: "ul", items: [bullet[1]] });
    } else {
      blocks.push({ type: "p", text: line });
    }
  }
  return (
    <>
      {blocks.map((b, i) =>
        b.type === "p" ? (
          <p key={i} className={i > 0 ? "mt-3" : undefined}>
            {b.text}
          </p>
        ) : (
          <ul key={i} className="mt-2 list-disc space-y-1 pl-5">
            {b.items.map((item, j) => (
              <li key={j}>{item}</li>
            ))}
          </ul>
        ),
      )}
    </>
  );
}
