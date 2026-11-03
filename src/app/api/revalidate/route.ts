import { revalidatePath, revalidateTag } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";
import { parseBody } from "next-sanity/webhook";

// Sanity webhook target. Refreshes only the content type that changed, so edits go live
// in about a minute without a full Netlify deploy (deploys cost free-plan credits).
const KNOWN_TYPES = new Set([
  "service",
  "addon",
  "package",
  "event",
  "article",
  "faq",
  "pageText",
  "legalPage",
  "siteSettings",
  "testimonial",
]);

export async function POST(req: NextRequest) {
  const secret = process.env.SANITY_REVALIDATE_SECRET;
  if (!secret) return NextResponse.json({ error: "Not configured" }, { status: 503 });
  try {
    const { isValidSignature, body } = await parseBody<{ _type?: string }>(req, secret, true);
    if (!isValidSignature) return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    const type = body?._type;
    if (!type || !KNOWN_TYPES.has(type)) return NextResponse.json({ error: "Unknown type" }, { status: 400 });

    revalidateTag(type, { expire: 0 });
    // Contact info appears in the footer of every page.
    if (type === "siteSettings") revalidatePath("/", "layout");
    return NextResponse.json({ revalidated: type });
  } catch (error) {
    console.error("[revalidate] failed:", (error as Error).message);
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
